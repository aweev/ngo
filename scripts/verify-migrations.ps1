<#
  verify-migrations.ps1 - static verification for apps/web/supabase/migrations

  Checks (per file and across the whole set):
    - 202401010000NN filename sequence: no gaps, no duplicate numbers
    - quote balance (single/double/$$), BEGIN/COMMIT pairing, trailing newline
    - no TODO/FIXME/HACK/PLACEHOLDER markers
    - forward references: FK / POLICY / TRIGGER / INDEX / RLS / GRANT / EXECUTE
      against tables or functions not created earlier in the sequence
    - duplicate tables/views, policies/triggers re-created without a DROP
    - parity with the archived legacy files (supabase/archive/schema*.sql, fix*.sql):
      every legacy table and function must be covered by the migrations

  Usage:
    npm run verify:migrations
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-migrations.ps1

  Exit code: 0 = passed, 1 = failed. Windows PowerShell 5.1+ or pwsh.
#>
$ErrorActionPreference='Continue'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$root=Join-Path $PSScriptRoot '..\supabase'
$files=@(Get-ChildItem (Join-Path $root 'migrations') -Filter *.sql | Sort-Object Name)
if($files.Count -eq 0){Write-Output 'NO MIGRATION FILES'; exit 1}
$issues=New-Object System.Collections.Generic.List[string]
$created=@{};$views=@{};$funcs=@{}
$allT=@();$allV=@();$allF=@()
$ev=New-Object System.Collections.Generic.List[object]
$nPol=0;$nTrg=0;$nIdx=0;$nums=@()
# Accept both the original 202401010000NN_ sequence and Supabase's
# timestamped YYYYMMDDHHMMSS_ convention (used by later feature migrations).
foreach($f in $files){$mm=[regex]::Match($f.Name,'^202401010000(\d\d)_');$tm=[regex]::Match($f.Name,'^20\d{12}_');if($mm.Success){$nums+=[int]$mm.Groups[1].Value}elseif(-not $tm.Success){$issues.Add('BADNAME '+$f.Name)}}
$mx=0;if($nums){$mx=($nums | Measure-Object -Maximum).Maximum}
for($n=1;$n -le $mx;$n++){if($nums -notcontains $n){$issues.Add('GAP migration '+$n)}}
if(($nums | Sort-Object -Unique).Count -ne $nums.Count){$issues.Add('DUPLICATE migration numbers')}
Write-Output ('MIGRATION FILES: '+$files.Count)
foreach($f in $files){
$pre=$issues.Count
$no='??';$nm=[regex]::Match($f.Name,'^202401010000(\d\d)_');if($nm.Success){$no=$nm.Groups[1].Value}elseif($f.Name.Length -ge 8){$no=$f.Name.Substring(0,8)}
$raw=[System.IO.File]::ReadAllText($f.FullName)
$clean=[regex]::Replace([regex]::Replace($raw,'(?s)/\*.*?\*/',' '),'(?m)--[^\r\n]*',' ')
$nb=New-Object System.Text.StringBuilder;$last=0
foreach($mm in [regex]::Matches($clean,'(?s)\$\$.*?\$\$')){[void]$nb.Append($clean.Substring($last,$mm.Index-$last));[void]$nb.Append(('x'*$mm.Length));$last=$mm.Index+$mm.Length}
[void]$nb.Append($clean.Substring($last));$nobody=$nb.ToString()
$sq=([regex]::Matches($clean,"'")).Count
$dq=([regex]::Matches($clean,'"')).Count
$dd=([regex]::Matches($clean,'\$\$')).Count
$ph=([regex]::Matches($raw,'(?i)\b(TODO|FIXME|HACK|PLACEHOLDER|XXX)\b')).Count
$b=([regex]::Matches($clean,'(?im)^BEGIN\s*;')).Count
$cm=([regex]::Matches($clean,'(?im)^COMMIT\s*;')).Count
$run=0;$mr=0
foreach($ch in $clean.ToCharArray()){if($ch -eq "'"){$run++;if($run -gt $mr){$mr=$run}}else{$run=0}}
if($sq % 2 -eq 1){$issues.Add("$no odd-single-quotes $sq")}
if($dq % 2 -eq 1){$issues.Add("$no odd-double-quotes $dq")}
if($dd % 2 -eq 1){$issues.Add("$no odd-dollar-dollar $dd")}
if($ph -gt 0){$issues.Add("$no placeholders $ph")}
if($b -ne $cm){$issues.Add("$no txn begin=$b commit=$cm")}
if($mr -gt 4){$issues.Add("$no max-quote-run $mr")}
if(-not $raw.EndsWith("`n")){$issues.Add("$no missing-trailing-eol")}
$tp=@{};$vp=@{};$fp=@{}
foreach($m in [regex]::Matches($nobody,'(?is)\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)')){$k=$m.Groups[1].Value.ToLower();if(-not $tp.ContainsKey($k)){$tp[$k]=$m.Index};$allT+=$k}
foreach($m in [regex]::Matches($nobody,'(?is)\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)')){$k=$m.Groups[1].Value.ToLower();if(-not $vp.ContainsKey($k)){$vp[$k]=$m.Index};$allV+=$k}
foreach($m in [regex]::Matches($nobody,'(?is)\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)')){$k=$m.Groups[1].Value.ToLower();if(-not $fp.ContainsKey($k)){$fp[$k]=$m.Index};$allF+=$k}
$okT={param($r,[int]$p) if($created.ContainsKey($r) -or $views.ContainsKey($r)){return $true};if($tp.ContainsKey($r)){return ($tp[$r] -le $p)};if($vp.ContainsKey($r)){return ($vp[$r] -le $p)};return $false}
$okF={param($r,[int]$p) if($funcs.ContainsKey($r)){return $true};if($fp.ContainsKey($r)){return ($fp[$r] -le $p)};return $false}
foreach($m in [regex]::Matches($nobody,'(?i)\bREFERENCES\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$sch=$m.Groups[1].Value.ToLower();$r=$m.Groups[2].Value.ToLower();if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $r $m.Index)){$issues.Add("$no fk-forward-> $r")}}}
foreach($m in [regex]::Matches($nobody,'(?is)CREATE\s+POLICY\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$pn=$m.Groups[1].Value;if(-not $pn){$pn=$m.Groups[2].Value};$sch=$m.Groups[3].Value.ToLower();$tb=$m.Groups[4].Value.ToLower();$nPol++;if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $tb $m.Index)){$issues.Add("$no policy '$pn' on missing $tb")}};$ev.Add([pscustomobject]@{k=$pn+'|'+$tb;c='P'})}
foreach($m in [regex]::Matches($nobody,'(?is)DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$pn=$m.Groups[1].Value;if(-not $pn){$pn=$m.Groups[2].Value};$ev.Add([pscustomobject]@{k=$pn+'|'+$m.Groups[4].Value.ToLower();c='D'})}
foreach($m in [regex]::Matches($nobody,'(?is)CREATE\s+TRIGGER\s+([a-z_][a-z0-9_]*)\s+(?:AFTER|BEFORE|INSTEAD\s+OF)[^;]{0,400}?\bON\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$tr=$m.Groups[1].Value.ToLower();$sch=$m.Groups[2].Value.ToLower();$tb=$m.Groups[3].Value.ToLower();$nTrg++;if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $tb $m.Index)){$issues.Add("$no trigger '$tr' on missing $tb")}};$ev.Add([pscustomobject]@{k=$tr+'|'+$tb;c='T'})}
foreach($m in [regex]::Matches($nobody,'(?is)DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s+ON\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$ev.Add([pscustomobject]@{k=$m.Groups[1].Value.ToLower()+'|'+$m.Groups[2].Value.ToLower();c='U'})}
foreach($m in [regex]::Matches($nobody,'(?i)EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$sch=$m.Groups[1].Value.ToLower();$r=$m.Groups[2].Value.ToLower();if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okF $r $m.Index)){$issues.Add("$no exec-fn missing $r")}}}
foreach($m in [regex]::Matches($nobody,'(?i)GRANT\s+[^;]{0,300}?\bON\s+(FUNCTION\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?:\s*\([^)]*\))?\s+TO\b')){$r=$m.Groups[2].Value.ToLower();$ok=$false;if($m.Groups[1].Value){$ok=& $okF $r $m.Index}else{$ok=& $okT $r $m.Index};if(-not $ok){$issues.Add("$no grant on missing $r")}}
foreach($m in [regex]::Matches($nobody,'(?i)(?:ENABLE|DISABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY\s+ON\s+(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$sch=$m.Groups[1].Value.ToLower();$r=$m.Groups[2].Value.ToLower();if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $r $m.Index)){$issues.Add("$no rls on missing $r")}}}
foreach($m in [regex]::Matches($nobody,'(?is)CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?[^\s(;]+\s+ON\s+(?:ONLY\s+)?(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$nIdx++;$sch=$m.Groups[1].Value.ToLower();$r=$m.Groups[2].Value.ToLower();if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $r $m.Index)){$issues.Add("$no index on missing $r")}}}
foreach($m in [regex]::Matches($nobody,'(?i)\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:(auth|storage|public)\.)?([a-z_][a-z0-9_]*)')){$sch=$m.Groups[1].Value.ToLower();$r=$m.Groups[2].Value.ToLower();if($sch -eq '' -or $sch -eq 'public'){if(-not (& $okT $r $m.Index)){$issues.Add("$no alter missing $r")}}}
foreach($m in [regex]::Matches($nobody,'(?i)\b(?:FROM|JOIN|INTO|UPDATE)\s+public\.([a-z_][a-z0-9_]*)')){if(-not (& $okT $m.Groups[1].Value.ToLower() $m.Index)){$issues.Add("$no ref public."+$m.Groups[1].Value+' before creation')}}
foreach($m in [regex]::Matches($clean,'(?i)\b(?:FROM|JOIN|INTO|UPDATE)\s+public\.([a-z_][a-z0-9_]*)')){$r=$m.Groups[1].Value.ToLower();if(-not ($created.ContainsKey($r) -or $views.ContainsKey($r) -or $tp.ContainsKey($r) -or $vp.ContainsKey($r))){$issues.Add("$no fn-body ref unknown $r")}}
foreach($k in $tp.Keys){$created[$k]=$true}
foreach($k in $vp.Keys){$views[$k]=$true}
foreach($k in $fp.Keys){$funcs[$k]=$true}
Write-Output ('{0} quotes[s={1}/{2} d={3}/{4} dd={5}/{6}] ph={7} txn={8}/{9} run={10} newissues={11}' -f $f.Name,$sq,($sq % 2 -eq 0),$dq,($dq % 2 -eq 0),$dd,($dd % 2 -eq 0),$ph,$b,$cm,$mr,($issues.Count-$pre))
}
$dupT=@($allT | Group-Object | Where-Object {$_.Count -gt 1} | ForEach-Object {$_.Name});if($dupT){$issues.Add('DUP-TABLES '+($dupT -join ','))}
$dupV=@($allV | Group-Object | Where-Object {$_.Count -gt 1} | ForEach-Object {$_.Name});if($dupV){$issues.Add('DUP-VIEWS '+($dupV -join ','))}
$dupF=@($allF | Group-Object | Where-Object {$_.Count -gt 1} | ForEach-Object {$_.Name+'x'+$_.Count});if($dupF){Write-Output ('DUP-FUNCS info: '+($dupF -join ' '))}
foreach($g in ($ev | Group-Object {$_.k})){$cc=@($g.Group | Where-Object {$_.c -eq 'P' -or $_.c -eq 'T'}).Count;$dc=@($g.Group | Where-Object {$_.c -eq 'D' -or $_.c -eq 'U'}).Count;if($cc -gt 1 -and $dc -lt ($cc-1)){$issues.Add('RECREATE-NO-DROP '+$g.Name)}}
Write-Output ('INVENTORY tables='+@($allT).Count+'/'+$created.Count+' views='+@($allV).Count+'/'+$views.Count+' funcs='+@($allF).Count+'/'+$funcs.Count+' policies='+$nPol+' triggers='+$nTrg+' indexes='+$nIdx)
$legacy=@(Get-ChildItem (Join-Path $root 'archive') -Filter 'schema*.sql' -File)+@(Get-ChildItem (Join-Path $root 'archive') -Filter 'fix*.sql' -File)
$lt=@{};$lf=@{}
foreach($f in $legacy){$cl2=[regex]::Replace([regex]::Replace([System.IO.File]::ReadAllText($f.FullName),'(?s)/\*.*?\*/',' '),'(?m)--[^\r\n]*',' ');foreach($m in [regex]::Matches($cl2,'(?is)\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)')){$lt[$m.Groups[1].Value.ToLower()]=$true};foreach($m in [regex]::Matches($cl2,'(?is)\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)')){$lf[$m.Groups[1].Value.ToLower()]=$true}}
$mT=@($lt.Keys | Where-Object {-not $created.ContainsKey($_)});if($mT){$issues.Add('LEGACY-TABLE-NOT-MIGRATED '+($mT -join ','))}
$mF=@($lf.Keys | Where-Object {-not $funcs.ContainsKey($_)});if($mF){$issues.Add('LEGACY-FUNC-NOT-MIGRATED '+($mF -join ','))}
Write-Output ('LEGACY files='+$legacy.Count+' tables='+$lt.Count+' funcs='+$lf.Count+' not-migrated tables='+$mT.Count+' funcs='+$mF.Count)
$onlyT=@($created.Keys | Where-Object {-not $lt.ContainsKey($_)});if($onlyT){Write-Output ('MIGRATION-ONLY tables: '+($onlyT -join ','))}
Write-Output ('ISSUES: '+$issues.Count)
foreach($i in $issues){Write-Output (' ! '+$i)}
if($issues.Count -eq 0){Write-Output 'VERDICT: STATIC VERIFICATION PASSED'; exit 0}else{Write-Output 'VERDICT: STATIC VERIFICATION FAILED'; exit 1}

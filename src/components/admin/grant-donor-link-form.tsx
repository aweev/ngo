'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { linkGrantDonor } from '@/actions/trust';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, Unlink } from 'lucide-react';

interface GrantOption {
    id: string;
    title: string;
    grant_reference: string | null;
    donor_id: string | null;
}

/** Links org grants to this donor (or unlinks them). Finance.manage enforced server-side. */
export function GrantDonorLinkForm({ donorId, grants }: { donorId: string; grants: GrantOption[] }) {
    const t = useTranslations('Admin.Donors.detail');
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function link() {
        if (!selected || busy) return;
        setBusy(selected);
        setError(null);
        const result = await linkGrantDonor(selected, donorId);
        setBusy(null);
        if (result.error) {
            setError(result.error);
            return;
        }
        setSelected('');
        window.location.reload();
    }

    async function unlink(grantId: string) {
        if (busy) return;
        setBusy(grantId);
        setError(null);
        const result = await linkGrantDonor(grantId, null);
        setBusy(null);
        if (result.error) {
            setError(result.error);
            return;
        }
        window.location.reload();
    }

    const unlinked = grants.filter((g) => !g.donor_id);

    return (
        <div className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {unlinked.length > 0 && (
                <div className="flex gap-2">
                    <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        aria-label={t('select_grant')}
                        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                    >
                        <option value="">{t('select_grant')}</option>
                        {unlinked.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.title}{g.grant_reference ? ` (${g.grant_reference})` : ''}
                            </option>
                        ))}
                    </select>
                    <Button size="sm" className="h-10 gap-1" disabled={!selected || busy !== null} onClick={link}>
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                        {t('link_grant')}
                    </Button>
                </div>
            )}
            {grants
                .filter((g) => g.donor_id === donorId)
                .map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                        <span className="font-medium">
                            {g.title}
                            {g.grant_reference && <span className="text-muted-foreground"> ({g.grant_reference})</span>}
                        </span>
                        <Button size="sm" variant="ghost" className="gap-1" disabled={busy !== null} onClick={() => void unlink(g.id)}>
                            {busy === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                            {t('unlink')}
                        </Button>
                    </div>
                ))}
        </div>
    );
}

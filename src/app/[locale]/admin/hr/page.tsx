import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getHRLifecycleRecords } from "@/actions/governance";
import { UserCheck, UserMinus, ShieldAlert, Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function HRLifecyclePage() {
    const { data: records } = await getHRLifecycleRecords();

    return (
        <div className="space-y-6">
            <PageHeader
                title="HR Onboarding & Offboarding Lifecycle"
                description="Automated checklists, contract generation, equipment collection, and access revocation for hiring and termination."
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/workers?action=new">
                                <UserCheck className="h-4 w-4 text-emerald-500" />
                                Onboard New Hire
                            </Link>
                        </Button>
                        <Button asChild variant="destructive" className="gap-2">
                            <Link href="/admin/hr/offboard">
                                <UserMinus className="h-4 w-4" />
                                Initiate Offboarding
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Person Type</TableHead>
                            <TableHead>Effective Date</TableHead>
                            <TableHead>Access Status</TableHead>
                            <TableHead>Lifecycle Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!records || records.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    No HR lifecycle transitions logged. Use the actions above to manage onboarding or offboarding.
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((rec) => (
                                <TableRow key={rec.id}>
                                    <TableCell className="font-semibold text-sm capitalize">
                                        <div className="flex items-center gap-2">
                                            {rec.type === 'offboarding' ? (
                                                <UserMinus className="h-4 w-4 text-rose-500 shrink-0" />
                                            ) : (
                                                <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                            )}
                                            <span>{rec.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-xs font-mono">{rec.person_type}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{rec.effective_date}</TableCell>
                                    <TableCell>
                                        <Badge variant={rec.access_revoked ? "destructive" : "outline"} className="text-[11px]">
                                            {rec.access_revoked ? "Revoked" : "Active Access"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">{rec.status.replace('_', ' ')}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWebhooks } from "@/actions/integrations";
import { NewWebhookForm, WebhookToggle } from "./webhook-forms";
import { ArrowLeft, Webhook as WebhookIcon } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
    const { data: webhooks } = await getWebhooks();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/integrations">
                    <ArrowLeft className="h-4 w-4" /> Back to Integrations
                </Link>
            </Button>
            <PageHeader
                title="Outgoing Webhooks"
                description="Deliver organization events to external systems. New webhooks start inactive — activate after validating the receiver."
                action={<NewWebhookForm />}
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Webhook</TableHead>
                            <TableHead>Target URL</TableHead>
                            <TableHead>Events</TableHead>
                            <TableHead>Deliveries</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!webhooks || webhooks.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    No outgoing webhooks registered yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            webhooks.map((hook) => (
                                <TableRow key={hook.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <WebhookIcon className="h-4 w-4 text-violet-500 shrink-0" />
                                            <span>{hook.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground max-w-64 truncate">
                                        {hook.url}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                        {(hook.events ?? []).join(", ") || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                        <span className="text-emerald-600">{hook.success_count} ok</span>
                                        {" / "}
                                        <span className="text-destructive">{hook.failure_count} failed</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <WebhookToggle webhook={hook} />
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

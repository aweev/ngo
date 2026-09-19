import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getIntegrations } from "@/actions/integrations";
import { IntegrationCard } from "@/components/admin/integration-card";
import { Webhook as WebhookIcon } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

const availableConnectors = [
    { provider: "stripe", name: "Stripe Payments", description: "Accept recurring donor subscriptions & online contributions." },
    { provider: "mailchimp", name: "Mailchimp Sync", description: "Sync contacts, campaign segments, and donor newsletters." },
    { provider: "slack", name: "Slack Notifications", description: "Stream real-time volunteer activity & donation alerts to team channels." },
    { provider: "twilio", name: "Twilio SMS", description: "Send automated SMS notifications to field workers and volunteers." },
    { provider: "zapier", name: "Zapier Webhooks", description: "Connect to 5,000+ apps via webhooks." },
];

export default async function IntegrationsPage() {
    const { data: integrations } = await getIntegrations();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Integrations & Webhooks Marketplace"
                description="Connect external services, configure webhooks, and streamline organization data flow."
                action={
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/admin/integrations/webhooks">
                            <WebhookIcon className="h-4 w-4" />
                            Outgoing Webhooks
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableConnectors.map((connector) => {
                    const active = integrations?.find((i) => i.provider === connector.provider);
                    return (
                        <IntegrationCard
                            key={connector.provider}
                            provider={connector.provider}
                            name={connector.name}
                            description={connector.description}
                            status={active ? active.status : "pending"}
                            lastSyncedAt={active?.last_synced_at}
                        />
                    );
                })}
            </div>
        </div>
    );
}

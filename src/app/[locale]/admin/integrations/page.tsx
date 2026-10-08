import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getIntegrations } from "@/actions/integrations";
import { IntegrationCard } from "@/components/admin/integration-card";
import { Webhook as WebhookIcon } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

const availableConnectors = [
    { provider: "stripe", name: "Stripe Payments" },
    { provider: "mailchimp", name: "Mailchimp Sync" },
    { provider: "slack", name: "Slack Notifications" },
    { provider: "twilio", name: "Twilio SMS" },
    { provider: "zapier", name: "Zapier Webhooks" },
];

export default async function IntegrationsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Integrations" });
    const { data: integrations } = await getIntegrations();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/admin/integrations/webhooks">
                            <WebhookIcon className="h-4 w-4" />
                            {t("webhooks_btn")}
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
                            description={t(`connectors.${connector.provider}`)}
                            status={active ? active.status : "pending"}
                            lastSyncedAt={active?.last_synced_at}
                        />
                    );
                })}
            </div>
        </div>
    );
}

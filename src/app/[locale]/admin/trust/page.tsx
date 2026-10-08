import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { getAuditEvents, getLegalEntity, getOrgDomains } from "@/actions/trust";
import {
    getConsentRecords,
    getDataSubjectRequests,
    getLegalHolds,
    getRetentionPolicies,
} from "@/actions/privacy";
import { TrustConsole } from "./trust-console";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Trust" });
    return { title: t("title"), description: t("description") };
}

export default async function TrustPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Trust" });

    const [
        { data: auditEvents },
        { data: legalEntity },
        { data: domains },
        { data: legalHolds },
        { data: retentionPolicies },
        { data: dataSubjectRequests },
        { data: consentRecords },
    ] = await Promise.all([
        getAuditEvents(200),
        getLegalEntity(),
        getOrgDomains(),
        getLegalHolds(),
        getRetentionPolicies(),
        getDataSubjectRequests(),
        getConsentRecords(100),
    ]);

    const row = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
    const rows = (value: unknown) => (Array.isArray(value) ? value.map(row) : []);

    return (
        <div className="space-y-6">
            <PageHeader title={t("title")} description={t("page_description")} />
            <TrustConsole
                auditEvents={rows(auditEvents)}
                legalEntity={row(legalEntity)}
                domains={rows(domains)}
                legalHolds={rows(legalHolds)}
                retentionPolicies={rows(retentionPolicies)}
                dataSubjectRequests={rows(dataSubjectRequests)}
                consentRecords={rows(consentRecords)}
            />
        </div>
    );
}

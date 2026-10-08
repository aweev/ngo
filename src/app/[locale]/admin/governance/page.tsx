import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { getApprovals } from "@/actions/governance";
import { getWorkflowInstances } from "@/actions/workflows";
import { getAutomationExecutions } from "@/actions/automations";
import { ApprovalInbox } from "./approval-inbox";
import { WorkflowDecisions } from "./workflow-decisions";
import { AttentionList } from "./attention-list";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Governance" });
    return { title: t("title"), description: t("description") };
}

export default async function GovernancePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Governance" });
    const [{ data: pending }, { data: recent }, { data: running }, { data: waiting }, { data: executions }] =
        await Promise.all([
            getApprovals("pending"),
            getApprovals(),
            getWorkflowInstances({ status: "running" }),
            getWorkflowInstances({ status: "waiting" }),
            getAutomationExecutions(),
        ]);

    const decided = (recent ?? []).filter((r) => r.status !== "pending").slice(0, 10);
    const actionable = [...(running ?? []), ...(waiting ?? [])].slice(0, 20);
    const failures = (executions ?? []).filter((e) => e.status === "failure").slice(0, 10);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("page_description")}
            />
            <AttentionList
                pendingCount={(pending ?? []).length}
                waitingCount={actionable.length}
                failureCount={failures.length}
            />
            <ApprovalInbox initialPending={pending ?? []} decided={decided} />
            <WorkflowDecisions initialInstances={actionable} />
        </div>
    );
}

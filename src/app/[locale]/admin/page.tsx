import { getTranslations } from "next-intl/server";
import {
    Users, HandHeart, HandCoins, Megaphone, FolderKanban,
    Zap, GitBranch, Clock, ClipboardList, Wallet, FileBarChart,
    CalendarDays, TrendingUp, ShieldCheck, Settings, ArrowUpRight, AlertTriangle
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { getWorkersStats } from "@/actions/workers";
import { getVolunteersStats } from "@/actions/volunteers";
import { getPartnersStats } from "@/actions/partners";
import { getDonorsStats } from "@/actions/donors";
import { getProjectsStats } from "@/actions/projects";
import { getCampaignsStats } from "@/actions/campaigns";
import { getAutomationRules } from "@/actions/automations";
import { getWorkflowDefinitions } from "@/actions/workflows";
import { getScheduledJobs } from "@/actions/scheduling";
import { StatCard } from "@/components/manage/stat-card";
import { PageHeader } from "@/components/manage/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Overview" });
    const [
        workers, volunteers, partners, donors, projects, campaigns,
        automations, workflows, jobs
    ] = await Promise.all([
        getWorkersStats(),
        getVolunteersStats(),
        getPartnersStats(),
        getDonorsStats(),
        getProjectsStats(),
        getCampaignsStats(),
        getAutomationRules(),
        getWorkflowDefinitions(),
        getScheduledJobs(),
    ]);

    const primaryStats = [
        {
            title: t("stats.staff"),
            value: workers.total,
            description: t("stats.staff_desc", { active: workers.active }),
            href: "/admin/workers",
            icon: <Users className="h-4 w-4 text-blue-500" />,
        },
        {
            title: t("stats.volunteers"),
            value: volunteers.total,
            description: t("stats.volunteers_desc", { active: volunteers.active, hours: volunteers.totalHours }),
            href: "/admin/volunteers",
            icon: <HandHeart className="h-4 w-4 text-emerald-500" />,
        },
        {
            title: t("stats.partners"),
            value: partners.total,
            description: t("stats.partners_desc", { active: partners.active }),
            href: "/admin/partners",
            icon: <HandCoins className="h-4 w-4 text-amber-500" />,
        },
        {
            title: t("stats.donors"),
            value: donors.totalDonors,
            description: t("stats.donors_desc", { active: donors.activeDonors }),
            href: "/admin/donors",
            icon: <Megaphone className="h-4 w-4 text-purple-500" />,
        },
        {
            title: t("stats.projects"),
            value: projects.total,
            description: t("stats.projects_desc", { active: projects.active, completed: projects.completed }),
            href: "/admin/projects",
            icon: <FolderKanban className="h-4 w-4 text-indigo-500" />,
        },
        {
            title: t("stats.campaigns"),
            value: campaigns.total,
            description: t("stats.campaigns_desc", { active: campaigns.active }),
            href: "/admin/campaigns",
            icon: <Megaphone className="h-4 w-4 text-rose-500" />,
        },
    ];

    const activeRulesCount = automations.data?.filter(r => r.is_enabled).length || 0;
    const activeJobsCount = jobs.data?.filter(j => j.is_active).length || 0;
    const workflowCount = workflows.data?.length || 0;

    const quickModules = [
        { title: t("modules.automations"), desc: t("modules.automations_desc", { count: activeRulesCount }), href: "/admin/automations", icon: Zap, color: "text-amber-500" },
        { title: t("modules.workflows"), desc: t("modules.workflows_desc", { count: workflowCount }), href: "/admin/workflows", icon: GitBranch, color: "text-blue-500" },
        { title: t("modules.scheduler"), desc: t("modules.scheduler_desc", { count: activeJobsCount }), href: "/admin/scheduling", icon: Clock, color: "text-indigo-500" },
        { title: t("modules.forms"), desc: t("modules.forms_desc"), href: "/admin/forms", icon: ClipboardList, color: "text-emerald-500" },
        { title: t("modules.financial"), desc: t("modules.financial_desc"), href: "/admin/financial", icon: Wallet, color: "text-purple-500" },
        { title: t("modules.reporting"), desc: t("modules.reporting_desc"), href: "/admin/reporting", icon: FileBarChart, color: "text-rose-500" },
        { title: t("modules.events"), desc: t("modules.events_desc"), href: "/admin/events", icon: CalendarDays, color: "text-sky-500" },
        { title: t("modules.impact"), desc: t("modules.impact_desc"), href: "/admin/impact", icon: TrendingUp, color: "text-teal-500" },
        { title: t("modules.rbac"), desc: t("modules.rbac_desc"), href: "/admin/rbac", icon: ShieldCheck, color: "text-orange-500" },
    ];

    // Next best action (audit Wave 4): exceptions first — failed jobs and
    // switched-off rules are what an operator should handle before browsing
    // vanity stats.
    const failedJobs = (jobs.data ?? []).filter((j) => j.last_run_status === "failure").length;
    const disabledRules = (automations.data ?? []).filter((r) => !r.is_enabled).length;
    const attentionItems: { text: string; href: string }[] = [];
    if (failedJobs > 0) {
        attentionItems.push({ text: t("attention_failed_jobs", { count: failedJobs }), href: "/admin/scheduling" });
    }
    if (disabledRules > 0) {
        attentionItems.push({ text: t("attention_disabled_rules", { count: disabledRules }), href: "/admin/automations" });
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title={t("title")}
                description={t("description")}
            />

            {/* Needs attention — the next best action for this workspace */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                        {t("attention_title")}
                    </CardTitle>
                    <CardDescription className="text-xs">{t("attention_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {attentionItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("attention_empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {attentionItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                    >
                                        <span>{item.text}</span>
                                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* Core Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {primaryStats.map((s) => (
                    <Link key={s.href} href={s.href} className="transition-transform hover:-translate-y-0.5">
                        <StatCard title={s.title} value={s.value} description={s.description} icon={s.icon} />
                    </Link>
                ))}
            </div>

            {/* NGO OS Command Center Operational Suite */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">{t("engine_title")}</h2>
                        <p className="text-xs text-muted-foreground">{t("engine_desc")}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{t("services_badge", { count: 38, total: 38 })}</Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {quickModules.map((m) => {
                        const Icon = m.icon;
                        return (
                            <Link key={m.href} href={m.href} className="group">
                                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${m.color}`} />
                                            <span>{m.title}</span>
                                        </CardTitle>
                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-xs">{m.desc}</CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Settings Quick Access */}
            <Card className="bg-slate-900 text-slate-100 border-slate-800">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Settings className="h-4 w-4 text-primary" /> {t("settings_title")}
                        </h3>
                        <p className="text-xs text-slate-400">{t("settings_desc")}</p>
                    </div>
                    <Link
                        href="/admin/settings"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                        {t("settings_cta")}
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
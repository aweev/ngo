import {
    Users, HandHeart, HandCoins, Megaphone, FolderKanban,
    Zap, GitBranch, Clock, ClipboardList, Wallet, FileBarChart,
    CalendarDays, TrendingUp, ShieldCheck, Settings, ArrowUpRight
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

export default async function AdminOverviewPage() {
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
            title: "Staff & Workers",
            value: workers.total,
            description: `${workers.active} active personnel`,
            href: "/admin/workers",
            icon: <Users className="h-4 w-4 text-blue-500" />,
        },
        {
            title: "Volunteers Network",
            value: volunteers.total,
            description: `${volunteers.active} active · ${volunteers.totalHours} hrs logged`,
            href: "/admin/volunteers",
            icon: <HandHeart className="h-4 w-4 text-emerald-500" />,
        },
        {
            title: "Corporate Partners",
            value: partners.total,
            description: `${partners.active} active partnerships`,
            href: "/admin/partners",
            icon: <HandCoins className="h-4 w-4 text-amber-500" />,
        },
        {
            title: "Donors & Supporters",
            value: donors.totalDonors,
            description: `${donors.activeDonors} active contributors`,
            href: "/admin/donors",
            icon: <Megaphone className="h-4 w-4 text-purple-500" />,
        },
        {
            title: "Active Projects",
            value: projects.total,
            description: `${projects.active} in progress · ${projects.completed} done`,
            href: "/admin/projects",
            icon: <FolderKanban className="h-4 w-4 text-indigo-500" />,
        },
        {
            title: "Fundraising Campaigns",
            value: campaigns.total,
            description: `${campaigns.active} active campaigns`,
            href: "/admin/campaigns",
            icon: <Megaphone className="h-4 w-4 text-rose-500" />,
        },
    ];

    const activeRulesCount = automations.data?.filter(r => r.is_enabled).length || 0;
    const activeJobsCount = jobs.data?.filter(j => j.is_active).length || 0;
    const workflowCount = workflows.data?.length || 0;

    const quickModules = [
        { title: "Automations & IFTTT", desc: `${activeRulesCount} active rules running`, href: "/admin/automations", icon: Zap, color: "text-amber-500" },
        { title: "Workflows & Approvals", desc: `${workflowCount} defined step templates`, href: "/admin/workflows", icon: GitBranch, color: "text-blue-500" },
        { title: "Scheduler & Cron Jobs", desc: `${activeJobsCount} timed background jobs`, href: "/admin/scheduling", icon: Clock, color: "text-indigo-500" },
        { title: "Custom Forms Builder", desc: "Collect field responses & applications", href: "/admin/forms", icon: ClipboardList, color: "text-emerald-500" },
        { title: "Financials & Expenses", desc: "Budget allocation & expense auditing", href: "/admin/financial", icon: Wallet, color: "text-purple-500" },
        { title: "Reports & Analytics", desc: "Query builder & CSV/PDF snapshot exports", href: "/admin/reporting", icon: FileBarChart, color: "text-rose-500" },
        { title: "Events & Calendar", desc: "Workshops, outreach, and webinar schedules", href: "/admin/events", icon: CalendarDays, color: "text-sky-500" },
        { title: "Impact KPIs & Goals", desc: "Metric indicators & target tracking", href: "/admin/impact", icon: TrendingUp, color: "text-teal-500" },
        { title: "Permissions & RBAC", desc: "Custom roles & security scope matrix", href: "/admin/rbac", icon: ShieldCheck, color: "text-orange-500" },
    ];

    return (
        <div className="space-y-8">
            <PageHeader
                title="Command Center"
                description="Mission control overview for organization operations, workforce, programs, and automations."
            />

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
                        <h2 className="text-lg font-bold tracking-tight">NGO OS Operational Engine</h2>
                        <p className="text-xs text-muted-foreground">Automations, workflows, schedulers, financials, and custom tools.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">38 / 38 Services Fullstack</Badge>
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
                            <Settings className="h-4 w-4 text-primary" /> Global Organization Settings
                        </h3>
                        <p className="text-xs text-slate-400">Manage multi-tenant branding, Supabase RLS security policies, and integrations.</p>
                    </div>
                    <Link
                        href="/admin/settings"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                        Configure Workspace
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
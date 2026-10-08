import { getTranslations } from "next-intl/server";
import { Users, HandHeart, HandCoins, Megaphone, FolderKanban, LayoutDashboard } from "lucide-react";
import { Link } from "@/lib/navigation";
import { getWorkersStats } from "@/actions/workers";
import { getVolunteersStats } from "@/actions/volunteers";
import { getPartnersStats } from "@/actions/partners";
import { getDonorsStats } from "@/actions/donors";
import { getProjectsStats } from "@/actions/projects";
import { getCampaignsStats } from "@/actions/campaigns";
import { StatCard } from "@/components/manage/stat-card";
import { PageHeader } from "@/components/manage/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Overview" });
    const session = await auth();
    if (session?.user.role === "member") {
        return (
            <div className="space-y-6">
                <PageHeader title={t("member_title")} description={t("member_desc")} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card><CardContent className="space-y-2 p-6"><p className="font-medium">{t("org")}</p><p className="text-sm text-muted-foreground">{session.organizationName || t("personal")}</p></CardContent></Card>
                    <Card><CardContent className="space-y-2 p-6"><p className="font-medium">{t("current_role")}</p><p className="text-sm text-muted-foreground">{t("member_role_desc")}</p><Link href="/dashboard/settings" className="text-sm font-semibold text-primary hover:underline">{t("request_access")}</Link></CardContent></Card>
                </div>
            </div>
        );
    }

    const [workers, volunteers, partners, donors, projects, campaigns] = await Promise.all([
        getWorkersStats(),
        getVolunteersStats(),
        getPartnersStats(),
        getDonorsStats(),
        getProjectsStats(),
        getCampaignsStats(),
    ]);

    const stats = [
        {
            title: t("workers"),
            value: workers.active,
            description: t("workers_desc", { total: workers.total }),
            href: "/dashboard/workers",
            icon: <Users className="h-4 w-4" />,
        },
        {
            title: t("volunteers"),
            value: volunteers.total,
            description: t("volunteers_desc", { hours: volunteers.totalHours }),
            href: "/dashboard/volunteers",
            icon: <HandHeart className="h-4 w-4" />,
        },
        {
            title: t("partners"),
            value: partners.active,
            description: t("partners_desc", { total: partners.total }),
            href: "/dashboard/partners",
            icon: <HandCoins className="h-4 w-4" />,
        },
        {
            title: t("donors"),
            value: donors.activeDonors,
            description: t("donors_desc", { amount: donors.totalDonated.toLocaleString("en", { style: "currency", currency: "EUR" }) }),
            href: "/dashboard/donors",
            icon: <Megaphone className="h-4 w-4" />,
        },
    ];

    return (
        <div>
            <PageHeader
                title={t("title")}
                description={t("desc")}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <Link key={s.href} href={s.href} className="transition-opacity hover:opacity-90">
                        <StatCard title={s.title} value={s.value} description={s.description} icon={s.icon} />
                    </Link>
                ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <FolderKanban className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">{t("projects")}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("proj_stats", { active: projects.active, completed: projects.completed })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">{t("campaigns")}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("camp_stats", { active: campaigns.active, amount: campaigns.totalRaised.toLocaleString("en", { style: "currency", currency: "EUR" }) })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
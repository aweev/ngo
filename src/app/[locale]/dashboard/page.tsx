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

export default async function DashboardOverviewPage() {
    const session = await auth();
    if (session?.user.role === "member") {
        return (
            <div className="space-y-6">
                <PageHeader title="Your workspace" description="The tools and access available to you today." />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card><CardContent className="space-y-2 p-6"><p className="font-medium">Organization</p><p className="text-sm text-muted-foreground">{session.organizationName || "Personal workspace"}</p></CardContent></Card>
                    <Card><CardContent className="space-y-2 p-6"><p className="font-medium">Current role</p><p className="text-sm text-muted-foreground">Member · limited workspace access</p><Link href="/dashboard/settings" className="text-sm font-semibold text-primary hover:underline">Request additional access</Link></CardContent></Card>
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
            title: "Workers",
            value: workers.active,
            description: `${workers.total} total in your team`,
            href: "/dashboard/workers",
            icon: <Users className="h-4 w-4" />,
        },
        {
            title: "Volunteers",
            value: volunteers.total,
            description: `${volunteers.totalHours} hours logged`,
            href: "/dashboard/volunteers",
            icon: <HandHeart className="h-4 w-4" />,
        },
        {
            title: "Partners",
            value: partners.active,
            description: `${partners.total} total partnerships`,
            href: "/dashboard/partners",
            icon: <HandCoins className="h-4 w-4" />,
        },
        {
            title: "Donors",
            value: donors.activeDonors,
            description: `${donors.totalDonated.toLocaleString("en", { style: "currency", currency: "EUR" })} raised`,
            href: "/dashboard/donors",
            icon: <Megaphone className="h-4 w-4" />,
        },
    ];

    return (
        <div>
            <PageHeader
                title="Dashboard"
                description="A quick overview of your organization."
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
                                <p className="text-sm font-medium">Projects</p>
                                <p className="text-xs text-muted-foreground">
                                    {projects.active} active · {projects.completed} completed
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
                                <p className="text-sm font-medium">Campaigns</p>
                                <p className="text-xs text-muted-foreground">
                                    {campaigns.active} active · {campaigns.totalRaised.toLocaleString("en", { style: "currency", currency: "EUR" })} raised
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
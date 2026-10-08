"use client";

import { Link, usePathname } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
    LayoutDashboard,
    Users,
    HandHeart,
    HandCoins,
    FolderKanban,
    Megaphone,
    MessageSquare,
    Settings,
    ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasRole, roleHasPermission, type Permission } from "@/lib/auth/permissions";

interface DashboardSidebarProps {
    userRole?: string | null;
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
    const pathname = usePathname();
    const t = useTranslations("Admin.Nav.dashboardSidebar");

    const baseNav = [
        { href: "/dashboard", label: t("overview"), icon: LayoutDashboard, permission: null },
        { href: "/field", label: t("field"), icon: ClipboardList, permission: "beneficiaries.read" as Permission },
        { href: "/dashboard/workers", label: t("workers"), icon: Users, permission: "workers.read" as Permission },
        { href: "/dashboard/volunteers", label: t("volunteers"), icon: HandHeart, permission: "volunteers.read" as Permission },
        { href: "/dashboard/partners", label: t("partners"), icon: HandCoins, permission: "partners.read" as Permission },
        { href: "/dashboard/donors", label: t("donors"), icon: Users, permission: "donors.read" as Permission },
        { href: "/dashboard/projects", label: t("projects"), icon: FolderKanban, permission: "projects.read" as Permission },
        { href: "/dashboard/campaigns", label: t("campaigns"), icon: Megaphone, permission: "campaigns.read" as Permission },
        { href: "/dashboard/messages", label: t("messages"), icon: MessageSquare, permission: "messaging.read" as Permission },
        { href: "/dashboard/settings", label: t("mySettings"), icon: Settings, permission: null },
    ];

    const adminNav = [
        { href: "/dashboard/settings", label: t("organization"), icon: Settings },
    ];

    const nav = [
        ...baseNav.filter((item) => !item.permission || roleHasPermission(userRole, item.permission)),
        ...(hasRole(userRole, ["owner", "admin"]) ? adminNav : []),
    ];

    return (
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
            <div className="flex h-14 items-center border-b px-4 text-sm font-bold">
                {t("title")}
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {nav.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                isActive && "bg-muted text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

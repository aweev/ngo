"use client";

import { Link, usePathname } from "@/lib/navigation";
import {
    LayoutDashboard,
    Users,
    HandHeart,
    HandCoins,
    FolderKanban,
    Megaphone,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasRole, roleHasPermission, type Permission } from "@/lib/auth/permissions";

interface DashboardSidebarProps {
    userRole?: string | null;
}

const baseNav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, permission: null },
    { href: "/dashboard/workers", label: "Workers", icon: Users, permission: "workers.read" as Permission },
    { href: "/dashboard/volunteers", label: "Volunteers", icon: HandHeart, permission: "volunteers.read" as Permission },
    { href: "/dashboard/partners", label: "Partners", icon: HandCoins, permission: "partners.read" as Permission },
    { href: "/dashboard/donors", label: "Donors", icon: Users, permission: "donors.read" as Permission },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, permission: "projects.read" as Permission },
    { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, permission: "campaigns.read" as Permission },
    { href: "/dashboard/settings", label: "My settings", icon: Settings, permission: null },
];

const adminNav = [
    { href: "/dashboard/settings", label: "Organization", icon: Settings },
];

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
    const pathname = usePathname();
    const nav = [
        ...baseNav.filter((item) => !item.permission || roleHasPermission(userRole, item.permission)),
        ...(hasRole(userRole, ["owner", "admin"]) ? adminNav : []),
    ];

    return (
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
            <div className="flex h-14 items-center border-b px-4 text-sm font-bold">
                NGO Workspace
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

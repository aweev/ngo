"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3, Users, UserPlus, HandHeart, HandCoins, Megaphone, FolderKanban,
    Settings, ShieldCheck, ChevronLeft, ChevronRight, Zap, GitBranch,
    Clock, ClipboardList, Wallet, FileBarChart, Bell, MessageSquare,
    FileText, Puzzle, Tag, CalendarDays, TrendingUp, Award, UserMinus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroup {
    title: string;
    items: {
        href: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
    }[];
}

const navGroups: NavGroup[] = [
    {
        title: "Overview",
        items: [
            { href: "/admin", label: "Command Center", icon: BarChart3 },
        ],
    },
    {
        title: "People & HR Governance",
        items: [
            { href: "/admin/members", label: "Team & Invites", icon: UserPlus },
            { href: "/admin/workers", label: "Workers", icon: Users },
            { href: "/admin/volunteers", label: "Volunteers", icon: HandHeart },
            { href: "/admin/partners", label: "Partners", icon: HandCoins },
            { href: "/admin/donors", label: "Donors", icon: Users },
            { href: "/admin/hr", label: "HR & Offboarding", icon: UserMinus },
            { href: "/admin/reviews", label: "ED Reviews & Ratings", icon: Award },
        ],
    },
    {
        title: "Programs",
        items: [
            { href: "/admin/projects", label: "Projects", icon: FolderKanban },
            { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
            { href: "/admin/events", label: "Events", icon: CalendarDays },
            { href: "/admin/impact", label: "Impact KPIs", icon: TrendingUp },
        ],
    },
    {
        title: "Operations",
        items: [
            { href: "/admin/automations", label: "Automations", icon: Zap },
            { href: "/admin/workflows", label: "Workflows", icon: GitBranch },
            { href: "/admin/scheduling", label: "Scheduler", icon: Clock },
            { href: "/admin/forms", label: "Forms", icon: ClipboardList },
        ],
    },
    {
        title: "Finance & Reports",
        items: [
            { href: "/admin/financial", label: "Financials", icon: Wallet },
            { href: "/admin/reporting", label: "Reports", icon: FileBarChart },
        ],
    },
    {
        title: "Communication",
        items: [
            { href: "/admin/notifications", label: "Notifications", icon: Bell },
            { href: "/admin/messaging", label: "Messages", icon: MessageSquare },
            { href: "/admin/content", label: "CMS & AI Pipeline", icon: FileText },
        ],
    },
    {
        title: "System",
        items: [
            { href: "/admin/integrations", label: "Integrations", icon: Puzzle },
            { href: "/admin/rbac", label: "Permissions", icon: ShieldCheck },
            { href: "/admin/tags", label: "Tags", icon: Tag },
            { href: "/admin/settings", label: "Settings", icon: Settings },
        ],
    },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        // Read the persisted preference one frame after mount: sync setState
        // inside the effect body is disallowed (cascading renders).
        const raf = requestAnimationFrame(() => {
            if (localStorage.getItem("ngo_admin_sidebar_collapsed") === "true") setCollapsed(true);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const toggleCollapse = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("ngo_admin_sidebar_collapsed", String(next));
            return next;
        });
    };

    return (
        <aside
            className={cn(
                "flex flex-col border-r bg-slate-950 text-slate-300 transition-all duration-300 select-none h-screen",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo / Header */}
            <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-white tracking-wide truncate">Command Center</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">NGO OS v2.0</span>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        {!collapsed && (
                            <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                {group.title}
                            </h4>
                        )}
                        {group.items.map((item) => {
                            const isActive = item.href === "/admin"
                                ? pathname.endsWith("/admin")
                                : pathname.includes(item.href);
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={collapsed ? item.label : undefined}
                                    className={cn(
                                        "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white",
                                        isActive ? "bg-slate-800 text-white font-semibold shadow-sm" : "text-slate-400",
                                        collapsed && "justify-center px-0"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-slate-400")} />
                                    {!collapsed && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Collapse Toggle */}
            <div className="border-t border-slate-800 p-2">
                <button
                    onClick={toggleCollapse}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-800 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4" />
                            <span>Collapse menu</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}

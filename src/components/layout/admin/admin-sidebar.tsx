"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    BarChart3, Users, UserPlus, HandHeart, HandCoins, Megaphone, FolderKanban,
    Settings, ShieldCheck, ChevronLeft, ChevronRight, Zap, GitBranch,
    Clock, ClipboardList, ClipboardCheck, Wallet, FileBarChart, Bell, MessageSquare,
    FileText, Puzzle, Tag, CalendarDays, TrendingUp, Award, UserMinus, ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPhase0NavVisible } from "@/lib/phase0-nav";

interface NavGroup {
    title: string;
    items: {
        href: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
    }[];
}

export function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const tGroups = useTranslations("Admin.Nav.groups");
    const tItems = useTranslations("Admin.Nav.items");
    const tNav = useTranslations("Admin.Nav");

    const navGroups: NavGroup[] = [
        {
            title: tGroups("overview"),
            items: [
                { href: "/admin", label: tItems("commandCenter"), icon: BarChart3 },
                { href: "/admin/governance", label: tItems("governance"), icon: ClipboardCheck },
                { href: "/admin/trust", label: tItems("trustCenter"), icon: ScrollText },
            ],
        },
        {
            title: tGroups("people"),
            items: [
                { href: "/admin/members", label: tItems("teamInvites"), icon: UserPlus },
                { href: "/admin/workers", label: tItems("workers"), icon: Users },
                { href: "/admin/volunteers", label: tItems("volunteers"), icon: HandHeart },
                { href: "/admin/partners", label: tItems("partners"), icon: HandCoins },
                { href: "/admin/donors", label: tItems("donors"), icon: Users },
                { href: "/admin/hr", label: tItems("hr"), icon: UserMinus },
                { href: "/admin/reviews", label: tItems("edReviews"), icon: Award },
            ],
        },
        {
            title: tGroups("programs"),
            items: [
                { href: "/admin/projects", label: tItems("projects"), icon: FolderKanban },
                { href: "/admin/campaigns", label: tItems("campaigns"), icon: Megaphone },
                { href: "/admin/events", label: tItems("events"), icon: CalendarDays },
                { href: "/admin/impact", label: tItems("impactKpis"), icon: TrendingUp },
            ],
        },
        {
            title: tGroups("operations"),
            items: [
                { href: "/admin/automations", label: tItems("automations"), icon: Zap },
                { href: "/admin/workflows", label: tItems("workflows"), icon: GitBranch },
                { href: "/admin/scheduling", label: tItems("scheduler"), icon: Clock },
                { href: "/admin/forms", label: tItems("forms"), icon: ClipboardList },
            ],
        },
        {
            title: tGroups("finance"),
            items: [
                { href: "/admin/financial", label: tItems("financials"), icon: Wallet },
                { href: "/admin/reporting", label: tItems("reports"), icon: FileBarChart },
            ],
        },
        {
            title: tGroups("communication"),
            items: [
                { href: "/admin/notifications", label: tItems("notifications"), icon: Bell },
                { href: "/admin/messaging", label: tItems("messages"), icon: MessageSquare },
                { href: "/admin/content", label: tItems("cms"), icon: FileText },
            ],
        },
        {
            title: tGroups("system"),
            items: [
                { href: "/admin/integrations", label: tItems("integrations"), icon: Puzzle },
                { href: "/admin/rbac", label: tItems("permissions"), icon: ShieldCheck },
                { href: "/admin/tags", label: tItems("tags"), icon: Tag },
                { href: "/admin/settings", label: tItems("settings"), icon: Settings },
            ],
        },
    ];

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
                        <span className="text-sm font-semibold text-white tracking-wide truncate">{tNav("commandCenter")}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{tNav("badge")}</span>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
                {navGroups
                    .map((group) => ({ ...group, items: group.items.filter((item) => isPhase0NavVisible(item.href)) }))
                    .filter((group) => group.items.length > 0)
                    .map((group) => (
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
                            <span>{tNav("collapse")}</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}

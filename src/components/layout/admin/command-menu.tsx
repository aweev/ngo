"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isPhase0NavVisible } from "@/lib/phase0-nav";
import {
    Search, Command, BarChart3, Users, HandHeart, HandCoins,
    Megaphone, FolderKanban, Settings, ShieldCheck, Zap, GitBranch,
    Clock, ClipboardList, Wallet, FileBarChart, Bell, MessageSquare,
    FileText, Puzzle, Tag, CalendarDays, TrendingUp, Plus
} from "lucide-react";

interface CommandItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function AdminCommandMenu() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const t = useTranslations("Admin.Nav.menu");
    const tLabels = useTranslations("Admin.Nav.menu.labels");
    const tActions = useTranslations("Admin.Nav.menu.actions");

    const commandGroups: { title: string; items: CommandItem[] }[] = [
        {
            title: t("title"),
            items: [
                { href: "/admin", label: tLabels("overview"), icon: BarChart3 },
                { href: "/admin/workers", label: tLabels("workers"), icon: Users },
                { href: "/admin/volunteers", label: tLabels("volunteers"), icon: HandHeart },
                { href: "/admin/partners", label: tLabels("partners"), icon: HandCoins },
                { href: "/admin/donors", label: tLabels("donors"), icon: Users },
                { href: "/admin/projects", label: tLabels("projects"), icon: FolderKanban },
                { href: "/admin/campaigns", label: tLabels("campaigns"), icon: Megaphone },
                { href: "/admin/events", label: tLabels("events"), icon: CalendarDays },
                { href: "/admin/impact", label: tLabels("impact"), icon: TrendingUp },
                { href: "/admin/automations", label: tLabels("automations"), icon: Zap },
                { href: "/admin/workflows", label: tLabels("workflows"), icon: GitBranch },
                { href: "/admin/scheduling", label: tLabels("scheduling"), icon: Clock },
                { href: "/admin/forms", label: tLabels("forms"), icon: ClipboardList },
                { href: "/admin/financial", label: tLabels("financial"), icon: Wallet },
                { href: "/admin/reporting", label: tLabels("reporting"), icon: FileBarChart },
                { href: "/admin/notifications", label: tLabels("notifications"), icon: Bell },
                { href: "/admin/messaging", label: tLabels("messaging"), icon: MessageSquare },
                { href: "/admin/content", label: tLabels("content"), icon: FileText },
                { href: "/admin/integrations", label: tLabels("integrations"), icon: Puzzle },
                { href: "/admin/rbac", label: tLabels("rbac"), icon: ShieldCheck },
                { href: "/admin/tags", label: tLabels("tags"), icon: Tag },
                { href: "/admin/settings", label: tLabels("settings"), icon: Settings },
            ],
        },
        {
            title: t("quickActions"),
            items: [
                { href: "/admin/workers?action=new", label: tActions("newWorker"), icon: Plus },
                { href: "/admin/volunteers?action=new", label: tActions("registerVolunteer"), icon: Plus },
                { href: "/admin/projects?action=new", label: tActions("newProject"), icon: Plus },
                { href: "/admin/campaigns?action=new", label: tActions("newCampaign"), icon: Plus },
                { href: "/admin/automations/new", label: tActions("buildRule"), icon: Plus },
                { href: "/admin/forms/new", label: tActions("newForm"), icon: Plus },
                { href: "/admin/events/new", label: tActions("scheduleEvent"), icon: Plus },
            ],
        },
    ];

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex h-9 w-full max-w-sm items-center justify-between rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span>{t("searchPlaceholder")}</span>
                    </div>
                    <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
                        <Command className="mr-0.5 h-3 w-3 inline" />K
                    </kbd>
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0 overflow-hidden">
                <DialogTitle className="sr-only">{t("srTitle")}</DialogTitle>
                <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("commandPlaceholder")}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto p-2 space-y-4">
                    {commandGroups.map((group) => {
                        // Phase 0 bloat freeze: hidden sections stay out of the palette.
                        const filtered = group.items.filter((i) =>
                            isPhase0NavVisible(i.href) &&
                            i.label.toLowerCase().includes(query.toLowerCase())
                        );

                        if (filtered.length === 0) return null;

                        return (
                            <div key={group.title} className="space-y-1">
                                <h5 className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {group.title}
                                </h5>
                                {filtered.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.href + item.label}
                                            onClick={() => {
                                                setOpen(false);
                                                setQuery("");
                                                router.push(item.href);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                        >
                                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Search, Command, BarChart3, Users, HandHeart, HandCoins,
    Megaphone, FolderKanban, Settings, ShieldCheck, Zap, GitBranch,
    Clock, ClipboardList, Wallet, FileBarChart, Bell, MessageSquare,
    FileText, Puzzle, Tag, CalendarDays, TrendingUp, Plus
} from "lucide-react";

const commandGroups = [
    {
        title: "Navigation",
        items: [
            { href: "/admin", label: "Overview / Command Center", icon: BarChart3 },
            { href: "/admin/workers", label: "Workers Management", icon: Users },
            { href: "/admin/volunteers", label: "Volunteers Management", icon: HandHeart },
            { href: "/admin/partners", label: "Partners Management", icon: HandCoins },
            { href: "/admin/donors", label: "Donors & Fundraising", icon: Users },
            { href: "/admin/projects", label: "Projects", icon: FolderKanban },
            { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
            { href: "/admin/events", label: "Events Calendar", icon: CalendarDays },
            { href: "/admin/impact", label: "Impact KPIs & Goals", icon: TrendingUp },
            { href: "/admin/automations", label: "Automations & IFTTT Engine", icon: Zap },
            { href: "/admin/workflows", label: "Workflows & Approvals", icon: GitBranch },
            { href: "/admin/scheduling", label: "Scheduler & Jobs", icon: Clock },
            { href: "/admin/forms", label: "Custom Forms Builder", icon: ClipboardList },
            { href: "/admin/financial", label: "Financials & Expenses", icon: Wallet },
            { href: "/admin/reporting", label: "Reports & Analytics", icon: FileBarChart },
            { href: "/admin/notifications", label: "Notification Templates", icon: Bell },
            { href: "/admin/messaging", label: "Internal Messages", icon: MessageSquare },
            { href: "/admin/content", label: "CMS Content & Pages", icon: FileText },
            { href: "/admin/integrations", label: "Integrations & Webhooks", icon: Puzzle },
            { href: "/admin/rbac", label: "Roles & Permissions", icon: ShieldCheck },
            { href: "/admin/tags", label: "Tagging Engine", icon: Tag },
            { href: "/admin/settings", label: "Organization Settings", icon: Settings },
        ],
    },
    {
        title: "Quick Actions",
        items: [
            { href: "/admin/workers?action=new", label: "Create New Worker", icon: Plus },
            { href: "/admin/volunteers?action=new", label: "Register Volunteer", icon: Plus },
            { href: "/admin/projects?action=new", label: "Launch New Project", icon: Plus },
            { href: "/admin/campaigns?action=new", label: "Start New Campaign", icon: Plus },
            { href: "/admin/automations/new", label: "Build Automation Rule", icon: Plus },
            { href: "/admin/forms/new", label: "Create Custom Form", icon: Plus },
            { href: "/admin/events/new", label: "Schedule Event", icon: Plus },
        ],
    },
];

export function AdminCommandMenu() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

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
                        <span>Search Command Center...</span>
                    </div>
                    <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
                        <Command className="mr-0.5 h-3 w-3 inline" />K
                    </kbd>
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-0 overflow-hidden">
                <DialogTitle className="sr-only">Command menu</DialogTitle>
                <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type a command or search section..."
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>
                </div>
                <div className="max-h-96 overflow-y-auto p-2 space-y-4">
                    {commandGroups.map((group) => {
                        const filtered = group.items.filter((i) =>
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

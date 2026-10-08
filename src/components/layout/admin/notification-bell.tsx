"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationRead } from "@/actions/notifications";
import type { Notification } from "@/types/domain/notifications";

function isUnread(n: Notification): boolean {
    return n.status !== "read";
}

export function NotificationBell({ label, viewAll }: { label: string; viewAll: string }) {
    const t = useTranslations("Admin.Notifications.bell");
    const [items, setItems] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);

    const load = async () => {
        const { data } = await getNotifications();
        setItems((data ?? []).slice(0, 8));
    };

    useEffect(() => {
        // Deferred one frame after mount: sync setState inside the effect
        // body is disallowed (cascading renders).
        const raf = requestAnimationFrame(() => {
            load();
        });
        const id = setInterval(load, 60_000);
        return () => {
            cancelAnimationFrame(raf);
            clearInterval(id);
        };
    }, []);

    const unread = items.filter(isUnread);

    const markRead = async (id: string) => {
        setItems((cur) => cur.map((n) => (n.id === id ? { ...n, status: "read" } : n)));
        await markNotificationRead(id);
    };

    const markAll = async () => {
        const ids = unread.map((n) => n.id);
        setItems((cur) => cur.map((n) => ({ ...n, status: "read" as const })));
        await Promise.all(ids.map((id) => markNotificationRead(id)));
    };

    return (
        <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
            <DropdownMenuTrigger asChild>
                <button
                    title={label}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted"
                >
                    <Bell className="h-4 w-4" />
                    {unread.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {unread.length > 9 ? "9+" : unread.length}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>{label} {unread.length > 0 && `(${unread.length})`}</span>
                    {unread.length > 0 && (
                        <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-normal text-primary hover:underline">
                            <CheckCheck className="h-3 w-3" /> {t("mark_all_read")}
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("empty")}</p>
                ) : (
                    items.map((n) => (
                        <DropdownMenuItem
                            key={n.id}
                            className={`flex cursor-pointer flex-col items-start gap-1 py-2 ${isUnread(n) ? "bg-primary/5" : ""}`}
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => markRead(n.id)}
                        >
                            <span className="w-full truncate text-xs font-semibold">{n.subject || t("fallback_subject")}</span>
                            <span className="line-clamp-2 w-full text-xs text-muted-foreground">{n.body || ""}</span>
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(n.created_at).toLocaleString()}
                            </span>
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/admin/notifications" className="justify-center text-xs font-semibold text-primary">
                        {viewAll}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function NotificationBellFallback() {
    return <Button variant="outline" size="icon" className="h-9 w-9" disabled><Bell className="h-4 w-4" /></Button>;
}

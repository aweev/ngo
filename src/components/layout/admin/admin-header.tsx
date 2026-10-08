"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { AdminCommandMenu } from "./command-menu";
import { NotificationBell } from "./notification-bell";
import { ChevronRight, LayoutDashboard, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AdminHeader() {
    const pathname = usePathname();
    const locale = useLocale();
    const tItems = useTranslations("Admin.Nav.items");
    const tB = useTranslations("Admin.Nav.breadcrumbs");
    const tH = useTranslations("Admin.Nav.header");

    // Translate known route segments; fall back to a capitalized segment
    // (ids and locale codes render as-is, which is locale-neutral).
    const labelForSegment = (segment: string): string => {
        if (segment === "admin") return tB("admin");
        if (segment === "dashboard") return tB("dashboard");
        if (segment === "new") return tB("new");
        if (tItems.has(segment)) return tItems(segment);
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    // Generate simple breadcrumbs from pathname (locale segment hidden from
    // the trail but still included in each crumb's URL).
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { title: string; url: string }[] = [];
    let accumulated = "";
    for (const segment of segments) {
        accumulated += "/" + segment;
        if (segment === locale) continue;
        breadcrumbs.push({ title: labelForSegment(segment), url: accumulated });
    }

    return (
        <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-6 gap-4">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                {breadcrumbs.map((crumb, idx) => (
                    <div key={crumb.url} className="flex items-center gap-1.5">
                        {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                        {idx === breadcrumbs.length - 1 ? (
                            <span className="font-semibold text-foreground">{crumb.title}</span>
                        ) : (
                            <Link href={crumb.url} className="hover:text-foreground transition-colors">
                                {crumb.title}
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* Right: Command Menu, Notifications & Profile */}
            <div className="flex items-center gap-3">
                <AdminCommandMenu />

                <NotificationBell label={tH("notifications")} viewAll={tH("viewAllNotifications")} />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border font-medium text-xs">
                            <User className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>{tH("workspace")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                {tH("switchToDashboard")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings">
                                {tH("settings")}
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

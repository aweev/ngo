"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/lib/navigation";
import { AdminCommandMenu } from "./command-menu";
import { Bell, ChevronRight, LayoutDashboard, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AdminHeader() {
    const pathname = usePathname();

    // Generate simple breadcrumbs from pathname
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => {
        const url = "/" + segments.slice(0, index + 1).join("/");
        const title = segment.charAt(0).toUpperCase() + segment.slice(1);
        return { title, url };
    });

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

                <button
                    title="Notifications"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted transition-colors"
                >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border font-medium text-xs">
                            <User className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Admin Workspace</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Switch to Dashboard
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings">
                                Settings
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

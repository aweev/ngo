"use client";

import { useRouter } from "@/lib/navigation";
import { Building2, Check, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/supabase-auth";
import { LanguageSwitcher } from "@/components/common/lang-switcher";
import { switchActiveOrganization } from "@/actions/organization";
import type { AuthContextMembership } from "@/lib/auth/guards";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    activeOrganizationId: string | null;
    organizationName: string | null;
    memberships: AuthContextMembership[];
}

export function DashboardHeader({ user, activeOrganizationId, organizationName, memberships }: DashboardHeaderProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth/login");
        router.refresh();
    };

    const initials = (user.name || user.email || "U").slice(0, 2).toUpperCase();

    const handleOrganizationChange = async (organizationId: string) => {
        if (organizationId !== activeOrganizationId) {
            await switchActiveOrganization(organizationId);
            router.refresh();
        }
    };

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
                {memberships.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="max-w-56 gap-2 truncate">
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span className="truncate">{organizationName || "Organization"}</span>
                                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {memberships.map((membership) => (
                                <DropdownMenuItem key={membership.organizationId} onClick={() => handleOrganizationChange(membership.organizationId)}>
                                    <span className="flex-1">{membership.organizationName || "Organization"}</span>
                                    {membership.organizationId === activeOrganizationId && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <span className="hidden text-sm font-medium text-muted-foreground sm:block">{user.name || user.email}</span>
            </div>

            <div className="flex items-center gap-3">
                <LanguageSwitcher variant="compact" showNativeName />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials}
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </header>
    );
}

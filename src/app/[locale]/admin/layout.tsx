import { ReactNode } from 'react';
import { auth } from '@/auth';
import { redirect } from '@/lib/navigation';
import { ADMIN_PANEL_ROLES, hasRole } from '@/lib/auth/permissions';
import { AdminSidebar } from '@/components/layout/admin/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin/admin-header';

interface AdminLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
    const { locale } = await params;
    const session = await auth();

    // Command Center access gate — single source of truth: ADMIN_PANEL_ROLES.
    if (!session?.user || !hasRole(session.user.role, ADMIN_PANEL_ROLES)) {
        redirect({ href: '/dashboard', locale });
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
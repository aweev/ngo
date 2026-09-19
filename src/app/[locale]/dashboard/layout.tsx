import { ReactNode } from 'react';
import { auth } from '@/auth';
import { redirect } from '@/lib/navigation';
import { DashboardSidebar } from '@/components/layout/dashboard/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard/header';

interface DashboardLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
    const { locale } = await params;

    // 1. Get Session for RBAC (Sidebar Logic)
    const session = await auth();

    // Double check auth (Middleware handles this, but good for type safety)
    if (!session?.user) {
        redirect({ href: '/auth/login', locale });
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-muted/10">
            {/* 
        1. Smart Sidebar 
        Adapts menu items based on session.user.role 
      */}
            <DashboardSidebar userRole={session.user.role} />

            {/* 
        2. Content Wrapper 
        Flex column to hold Header + Main
      */}
            <div className="flex flex-1 flex-col overflow-hidden">

                {/* Top Navigation (Mobile Toggle + User Profile) */}
                <DashboardHeader
                    user={session.user}
                    activeOrganizationId={session.organizationId}
                    organizationName={session.organizationName}
                    memberships={session.memberships}
                />

                {/* 
          3. Scrollable Main Content 
          'overflow-y-auto' ensures only this area scrolls, not the sidebar
        */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
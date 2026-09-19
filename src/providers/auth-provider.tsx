'use client';

// With Supabase Auth, session state is managed by supabase-js and the
// middleware session refresh. No client session provider is required.
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
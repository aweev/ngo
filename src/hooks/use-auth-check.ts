"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAuthCheck() {
    useEffect(() => {
        // Supabase handles token refresh automatically; we listen for auth
        // events so the UI never lingers on a stale session.
        const supabase = createSupabaseBrowserClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                console.info("User signed out");
            }
        });
        return () => subscription.unsubscribe();
    }, []);
}

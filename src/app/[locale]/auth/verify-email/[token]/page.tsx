import { Metadata } from "next";
import { VerificationHandler } from "@/components/auth/verification-handler";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
    title: "Verify Email - AWE e.V.",
    description: "Completing your account registration."
};

interface PageProps {
    params: Promise<{ locale: string; token: string }>;
}

type VerificationStatus = "success" | "expired" | "invalid" | "already_verified" | "error";

// Server Action to verify
async function verifyEmailToken(token: string): Promise<VerificationStatus> {
    try {
        const supabase = await createSupabaseServerClient();

        // Supabase email links carry a hashed token; verify it server-side
        const { error } = await supabase.auth.verifyOtp({
            type: "signup",
            token_hash: token,
        });

        if (!error) return "success";

        const msg = error.message.toLowerCase();
        if (msg.includes("expired")) return "expired";
        if (msg.includes("already")) return "already_verified";
        if (msg.includes("invalid") || msg.includes("not found")) return "invalid";
        return "error";
    } catch {
        return "error";
    }
}

export default async function VerifyEmailPage({ params }: PageProps) {
    const { token } = await params;

    // Attempt verification immediately on server render
    const status = await verifyEmailToken(token);

    return <VerificationHandler initialStatus={status} />;
}
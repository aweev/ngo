import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
    title: "Set New Password - AWE e.V.",
    description: "Securely update your account credentials."
};

interface PageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
    const { token } = await searchParams;

    // The form handles the validation logic (loading state -> valid/invalid)
    return <ResetPasswordForm token={token} />;
}
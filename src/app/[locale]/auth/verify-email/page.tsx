import { Metadata } from "next";
import { VerifyEmailView } from "@/components/auth/verify-email-view";

export const metadata: Metadata = {
    title: "Check your inbox - AWE e.V.",
    description: "Verify your email address to continue."
};

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function VerifyEmailInstructionPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const isNew = params.new === "true";

    if (params.verified === "true") {
        const { VerificationHandler } = await import("@/components/auth/verification-handler");
        return <VerificationHandler initialStatus="success" />;
    }

    if (params.verification_error === "true") {
        const { VerificationHandler } = await import("@/components/auth/verification-handler");
        return <VerificationHandler initialStatus="error" />;
    }

    return <VerifyEmailView isNewRegistration={isNew} />;
}
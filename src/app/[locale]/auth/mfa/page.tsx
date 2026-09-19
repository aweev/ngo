import { Metadata } from "next";
import { MFAForm } from "@/components/auth/mfa-form";

export const metadata: Metadata = {
    title: "Two-Factor Authentication - AWE e.V.",
    description: "Verify your identity to access the portal."
};

interface PageProps {
    searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function MFAPage({ searchParams }: PageProps) {
    const { callbackUrl } = await searchParams;

    return <MFAForm callbackUrl={callbackUrl || "/dashboard"} />;
}
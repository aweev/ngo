import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InvitationHandler } from "@/components/auth/invitation-handler";
import { validateInvitation } from "@/actions/auth";

interface PageProps {
    params: Promise<{ locale: string; token: string }>;
}

// Type for the Invitation DTO from backend
interface InvitationData {
    valid: boolean;
    email: string;
    inviterName: string;
    organizationName: string;
    role: string;
    firstName?: string;
    lastName?: string;
    userExists: boolean; // Crucial flag from backend
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth.Invite" });
    return {
        title: t("meta_title"),
        description: t("meta_desc")
    };
}

// Server Fetcher
async function getInvitation(token: string): Promise<InvitationData> {
    try {
        const preview = await validateInvitation(token);
        return {
            valid: preview.valid,
            email: preview.email,
            inviterName: preview.inviterName ?? "",
            organizationName: preview.organizationName ?? "",
            role: preview.role,
            firstName: preview.firstName,
            lastName: preview.lastName,
            userExists: preview.userExists
        };
    } catch (e) {
        console.error("Invite fetch failed", e);
    }

    // Fallback for Invalid/Error state
    return {
        valid: false,
        email: "",
        inviterName: "",
        organizationName: "",
        role: "",
        userExists: false
    };
}

export default async function InvitePage({ params }: PageProps) {
    const { token } = await params;
    const data = await getInvitation(token);

    // Render the client component that manages the wizard flow
    return <InvitationHandler data={data} token={token} />;
}
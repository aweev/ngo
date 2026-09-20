import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/lib/navigation";
import { getBootstrapStatus } from "@/actions/bootstrap";
import { ADMIN_PANEL_ROLES, hasRole } from "@/lib/auth/permissions";
import { SetupWizard } from "./setup-wizard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth.Setup" });
    return { title: t("meta_title"), description: t("meta_desc") };
}

export default async function SetupPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const { data: status } = await getBootstrapStatus();

    // Not signed in (or session expired) — the wizard needs a user.
    if (!status) {
        redirect({ href: "/auth/login?callbackUrl=/auth/setup", locale });
        return null;
    }

    // Already linked — nothing to set up.
    if (status.hasMembership) {
        redirect({ href: hasRole(status.role, ADMIN_PANEL_ROLES) ? "/admin" : "/dashboard", locale });
        return null;
    }

    return <SetupWizard organizationExists={status.organizationExists} />;
}

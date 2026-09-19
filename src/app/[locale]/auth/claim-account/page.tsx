import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClaimHandler } from "@/components/auth/claim-handler";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth.Claim" });
    return {
        title: t("meta_title"),
        description: t("meta_desc")
    };
}

export default async function ClaimAccountPage() {
    return <ClaimHandler />;
}
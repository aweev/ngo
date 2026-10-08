import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDefaultBrandTheme } from "@/actions/organization";
import { BrandingThemeForm } from "./branding-theme-form";
import { getPendingRoleRequests } from "@/actions/role-requests";
import { RoleRequestReview } from "@/components/admin/role-request-review";
import { getPortalExperienceItems } from "@/actions/portal-experience";
import { PortalExperienceEditor } from "@/components/admin/portal-experience-editor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Settings" });
    const { data: defaultBrandTheme } = await getDefaultBrandTheme();
    const { data: pendingRoleRequests } = await getPendingRoleRequests();
    const { data: portalExperienceItems } = await getPortalExperienceItems();
    return (
        <div className="space-y-6">
            <PageHeader title={t("title")} description={t("description")} />

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                    <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                    <TabsTrigger value="branding">{t("tabs.branding")}</TabsTrigger>
                    <TabsTrigger value="experience">{t("tabs.experience")}</TabsTrigger>
                    <TabsTrigger value="security">{t("tabs.security")}</TabsTrigger>
                    <TabsTrigger value="billing">{t("tabs.billing")}</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">{t("info_title")}</CardTitle>
                            <CardDescription>{t("info_description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("org_name")}</label>
                                    <Input defaultValue="AWE EV Organization" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tax_id")}</label>
                                    <Input defaultValue="NGO-948204-EU" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contact_email")}</label>
                                    <Input defaultValue="contact@awe-ev.org" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("currency")}</label>
                                    <Input defaultValue="EUR" />
                                </div>
                            </div>
                            <Button size="sm">{t("save_profile")}</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base font-semibold">{t("access_title")}</CardTitle><CardDescription>{t("access_description")}</CardDescription></CardHeader>
                        <CardContent><RoleRequestReview initialRequests={pendingRoleRequests} /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="experience" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base font-semibold">{t("exp_title")}</CardTitle><CardDescription>{t("exp_description")}</CardDescription></CardHeader>
                        <CardContent><PortalExperienceEditor initialItems={portalExperienceItems} /></CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Settings */}
                <TabsContent value="branding" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">{t("brand_title")}</CardTitle>
                            <CardDescription>{t("brand_description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <BrandingThemeForm initialTheme={defaultBrandTheme} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">{t("sec_title")}</CardTitle>
                            <CardDescription>{t("sec_description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-muted-foreground">
                            <p>{t("sec_rls")}</p>
                            <p>{t("sec_audit")}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing */}
                <TabsContent value="billing" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">{t("bill_title")}</CardTitle>
                            <CardDescription>{t("bill_description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-medium">{t("current_tier")}</span>
                                <span className="font-bold text-emerald-600">{t("tier_value")}</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="font-medium">{t("active_modules")}</span>
                                <span className="font-mono">{t("modules_value")}</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
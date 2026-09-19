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

export default async function AdminSettingsPage() {
    const { data: defaultBrandTheme } = await getDefaultBrandTheme();
    const { data: pendingRoleRequests } = await getPendingRoleRequests();
    const { data: portalExperienceItems } = await getPortalExperienceItems();
    return (
        <div className="space-y-6">
            <PageHeader title="Organization Settings" description="Global workspace preferences, branding, security rules, and system configuration." />

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                    <TabsTrigger value="general">General Profile</TabsTrigger>
                    <TabsTrigger value="branding">Branding & Portal</TabsTrigger>
                    <TabsTrigger value="experience">Auth & Onboarding</TabsTrigger>
                    <TabsTrigger value="security">Security & RLS</TabsTrigger>
                    <TabsTrigger value="billing">Plan & Limits</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Organization Information</CardTitle>
                            <CardDescription>Primary profile details visible across reports and member invitations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Name</label>
                                    <Input defaultValue="AWE EV Organization" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration / Tax ID</label>
                                    <Input defaultValue="NGO-948204-EU" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Contact Email</label>
                                    <Input defaultValue="contact@awe-ev.org" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Currency</label>
                                    <Input defaultValue="EUR" />
                                </div>
                            </div>
                            <Button size="sm">Save Organization Profile</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base font-semibold">Pending access requests</CardTitle><CardDescription>Review requests for additional organization roles.</CardDescription></CardHeader>
                        <CardContent><RoleRequestReview initialRequests={pendingRoleRequests} /></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="experience" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base font-semibold">Auth and onboarding experience</CardTitle><CardDescription>Organization-managed testimonials, impact stats, and onboarding choices.</CardDescription></CardHeader>
                        <CardContent><PortalExperienceEditor initialItems={portalExperienceItems} /></CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Settings */}
                <TabsContent value="branding" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Portal Branding</CardTitle>
                            <CardDescription>Choose the default color theme visitors see across the public site.</CardDescription>
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
                            <CardTitle className="text-base font-semibold">Security & Access Control</CardTitle>
                            <CardDescription>Session timeouts, Row Level Security enforcement, and Audit Logging.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-muted-foreground">
                            <p>Multi-tenant Row Level Security (RLS) is active on all 30+ database tables.</p>
                            <p>Audit logging automatically records all admin mutations with user IP and timestamp.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing */}
                <TabsContent value="billing" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Subscription Plan</CardTitle>
                            <CardDescription>Unlimited enterprise tier with full NGO OS feature access.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-medium">Current Tier:</span>
                                <span className="font-bold text-emerald-600">Enterprise NGO OS (Fullstack)</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="font-medium">Active Modules:</span>
                                <span className="font-mono">38 / 38 Services Enabled</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRole } from "@/actions/rbac";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewRolePage() {
    const router = useRouter();
    const t = useTranslations("Admin.Rbac.New");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function updateName(value: string) {
        setName(value);
        setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim() || !slug.trim()) {
            setError(t("required"));
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createRole({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            permissions: {},
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push(result.data ? `/admin/rbac/roles/${result.data.id}` : "/admin/rbac");
    }

    return (
        <div className="max-w-3xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/rbac">
                    <ArrowLeft className="h-4 w-4" /> {t("back")}
                </Link>
            </Button>
            <PageHeader title={t("title")} description={t("description")} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> {t("details_title")}
                        </CardTitle>
                        <CardDescription>{t("details_description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="role-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                                <Input id="role-name" required value={name} onChange={(e) => updateName(e.target.value)} placeholder={t("name_placeholder")} />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="role-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                                <Input id="role-slug" required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="finance-reviewer" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="role-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("description_label")}</label>
                            <Textarea id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description_placeholder")} />
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/rbac">{t("cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? t("creating") : t("create")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

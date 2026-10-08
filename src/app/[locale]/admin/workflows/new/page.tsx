"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createWorkflowDefinition } from "@/actions/workflows";
import { GitBranch, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewWorkflowDefinitionPage() {
    const router = useRouter();
    const t = useTranslations("Admin.Workflows");
    const tCommon = useTranslations("Admin.Common");
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) return;
        setLoading(true);

        const res = await createWorkflowDefinition({
            name,
            slug,
            description: description || null,
            status: "active",
            steps: [
                { id: "1", name: "Initial Review", type: "approval", step_index: 0, config: {} },
                { id: "2", name: "Executive Sign-Off", type: "task", step_index: 1, config: {} },
            ],
            trigger_config: {},
            created_by: null,
        });

        setLoading(false);
        if (!res.error) {
            router.push("/admin/workflows");
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/workflows">
                        <ArrowLeft className="h-4 w-4" /> {t("back_to_workflows")}
                    </Link>
                </Button>
            </div>

            <PageHeader
                title={t("new_title")}
                description={t("new_description")}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-blue-500" /> {t("details_title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name")}</label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                    }}
                                    placeholder={t("name_placeholder")}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug")}</label>
                                <Input
                                    required
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder={t("slug_placeholder")}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("description_label")}</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("description_placeholder")}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/workflows">{tCommon("cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? t("creating") : t("create")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

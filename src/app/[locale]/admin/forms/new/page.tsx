"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createForm } from "@/actions/forms";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewFormPage() {
    const router = useRouter();
    const t = useTranslations("Admin.Forms");
    const tCommon = useTranslations("Admin.Common");
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !slug) return;
        setLoading(true);

        const res = await createForm({
            title,
            slug,
            description: description || null,
            status: "published",
            fields: [
                { id: "f1", type: "text", label: t("defaults.full_name"), required: true, sortOrder: 0 },
                { id: "f2", type: "email", label: t("defaults.email_address"), required: true, sortOrder: 1 },
                { id: "f3", type: "textarea", label: t("defaults.application_statement"), required: false, sortOrder: 2 },
            ],
            submit_button_text: t("defaults.submit_button"),
            success_message: t("defaults.success_message"),
            is_public: true,
            created_by: null,
        });

        setLoading(false);
        if (!res.error) {
            router.push("/admin/forms");
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/forms">
                        <ArrowLeft className="h-4 w-4" /> {t("back_to_forms")}
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
                            <ClipboardList className="h-4 w-4 text-emerald-500" /> {t("config_title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("form_title")}</label>
                                <Input
                                    required
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                    }}
                                    placeholder={t("form_title_placeholder")}
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
                        <Link href="/admin/forms">{tCommon("cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? t("publishing") : t("publish")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

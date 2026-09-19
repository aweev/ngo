"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
                { id: "f1", type: "text", label: "Full Name", required: true, sortOrder: 0 },
                { id: "f2", type: "email", label: "Email Address", required: true, sortOrder: 1 },
                { id: "f3", type: "textarea", label: "Application Statement", required: false, sortOrder: 2 },
            ],
            submit_button_text: "Submit Application",
            success_message: "Thank you for submitting!",
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
                        <ArrowLeft className="h-4 w-4" /> Back to Forms
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="Create Custom Form"
                description="Build public or internal application forms, survey questionnaires, and feedback collector forms."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-emerald-500" /> Form Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form Title</label>
                                <Input
                                    required
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                    }}
                                    placeholder="e.g. Volunteer Application Form 2026"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug</label>
                                <Input
                                    required
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="volunteer-application-2026"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide instructions for submitters..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/forms">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Publishing Form..." : "Publish Form"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

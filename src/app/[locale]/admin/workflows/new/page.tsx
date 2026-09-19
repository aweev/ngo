"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
                        <ArrowLeft className="h-4 w-4" /> Back to Workflows
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="Design New Workflow"
                description="Configure multi-step approval chains, task assignment flows, and execution steps."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-blue-500" /> Workflow Template Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow Name</label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                    }}
                                    placeholder="e.g. Grant Application Approval Flow"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug</label>
                                <Input
                                    required
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="grant-approval-flow"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the purpose of this workflow..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/workflows">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating Workflow..." : "Create Workflow"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

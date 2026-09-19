"use client";

import { useState } from "react";
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
            setError("A role name and URL slug are required.");
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
                    <ArrowLeft className="h-4 w-4" /> Back to Roles
                </Link>
            </Button>
            <PageHeader title="Create Role" description="Define a custom role, then assign granular permissions on the next step." />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Role details
                        </CardTitle>
                        <CardDescription>Permissions start empty — grant them after creation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="role-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role name</label>
                                <Input id="role-name" required value={name} onChange={(e) => updateName(e.target.value)} placeholder="e.g. Finance Reviewer" />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="role-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL slug</label>
                                <Input id="role-slug" required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="finance-reviewer" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="role-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who should be assigned this role?" />
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/rbac">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Creating..." : "Create role"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

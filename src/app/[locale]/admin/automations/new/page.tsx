"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAutomationRule } from "@/actions/automations";
import { Zap, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewAutomationRulePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [triggerType, setTriggerType] = useState<"event" | "schedule" | "condition" | "webhook" | "manual">("event");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        setLoading(true);

        const res = await createAutomationRule({
            name,
            description: description || null,
            is_enabled: true,
            trigger_type: triggerType,
            trigger_config: { event: "donation.created" },
            conditions: [],
            actions: [{ type: "send_notification", config: { template: "thank_you_email" } }],
            created_by: null,
        });

        setLoading(false);
        if (!res.error) {
            router.push("/admin/automations");
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/automations">
                        <ArrowLeft className="h-4 w-4" /> Back to Rules
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="Create Automation Rule (IFTTT Wizard)"
                description="Configure automated triggers, conditions, and multi-channel actions."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" /> Step 1: Rule Details & Trigger
                        </CardTitle>
                        <CardDescription>Select what event or schedule activates this automation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rule Name</label>
                            <Input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Auto-send Thank You Email on New Donation"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Briefly describe what this rule accomplishes..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger Type</label>
                            <Select value={triggerType} onValueChange={(val) => setTriggerType(val as typeof triggerType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Trigger" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="event">Event-Based (e.g. Record Created/Updated)</SelectItem>
                                    <SelectItem value="schedule">Schedule-Based (Cron Time Trigger)</SelectItem>
                                    <SelectItem value="condition">Condition-Based (Threshold Met)</SelectItem>
                                    <SelectItem value="webhook">Webhook Received</SelectItem>
                                    <SelectItem value="manual">Manual Execution</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/automations">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving Rule..." : "Save Automation Rule"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

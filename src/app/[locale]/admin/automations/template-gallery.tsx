import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";
import { getAutomationTemplates } from "@/actions/automations";
import { UseTemplateButton } from "./use-template-button";

export async function TemplateGallery() {
    const { data: templates } = await getAutomationTemplates();
    if (!templates || templates.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <LayoutTemplate className="h-4 w-4 text-primary" /> Start from a template
                </CardTitle>
                <CardDescription>
                    Templates create a disabled rule for review — enable it after checking the trigger and actions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                    {templates.map((t) => (
                        <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">{t.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{t.description || t.category || t.trigger_type}</p>
                            </div>
                            <UseTemplateButton templateId={t.id} templateName={t.name} />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

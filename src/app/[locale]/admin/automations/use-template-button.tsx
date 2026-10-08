"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { instantiateAutomationTemplate } from "@/actions/automations";

export function UseTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const use = async () => {
        setLoading(true);
        const result = await instantiateAutomationTemplate(templateId);
        setLoading(false);
        if (result.data) {
            toast.success(`“${templateName}” added as a disabled rule.`);
            router.push(`/admin/automations/${result.data.id}`);
            router.refresh();
        } else {
            toast.error(result.error || "Could not use this template.");
        }
    };

    return (
        <Button size="sm" variant="outline" onClick={use} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
            Use
        </Button>
    );
}

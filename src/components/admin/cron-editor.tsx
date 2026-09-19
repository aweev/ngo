"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CronEditorProps {
    value: string;
    onChange: (cron: string) => void;
}

const presets = [
    { label: "Every hour", value: "0 * * * *" },
    { label: "Daily at 9 AM", value: "0 9 * * *" },
    { label: "Every Monday", value: "0 9 * * 1" },
    { label: "Monthly (1st)", value: "0 0 1 * *" },
];

export function CronEditor({ value, onChange }: CronEditorProps) {
    const [cron, setCron] = useState(value || "0 9 * * *");

    const handleChange = (newVal: string) => {
        setCron(newVal);
        onChange(newVal);
    };

    return (
        <div className="space-y-3 rounded-lg border p-4 bg-card">
            <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cron Expression
                </label>
                <Input
                    value={cron}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="0 9 * * *"
                    className="font-mono text-sm"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                    <Button
                        key={p.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleChange(p.value)}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

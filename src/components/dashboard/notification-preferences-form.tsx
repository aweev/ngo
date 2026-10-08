"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    saveMyNotificationPreferences,
    type NotificationPreferences,
} from "@/actions/notifications";

/** Curated IANA zones covering the membership footprint (full list via autodetect). */
const TIMEZONES = [
    "UTC",
    "Europe/Berlin", "Europe/Paris", "Europe/London", "Europe/Athens", "Europe/Kyiv",
    "Africa/Lagos", "Africa/Nairobi", "Africa/Cairo", "Africa/Johannesburg", "Africa/Accra",
    "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok",
    "Asia/Singapore", "Asia/Manila", "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai",
    "Australia/Sydney",
    "Pacific/Auckland",
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Anchorage", "Pacific/Honolulu",
    "America/Sao_Paulo", "America/Bogota", "America/Mexico_City",
];

const CHANNELS = [
    { key: "email_enabled", label: "Email", hint: "Receipts, digests, and direct notifications." },
    { key: "sms_enabled", label: "SMS", hint: "Urgent alerts only." },
    { key: "push_enabled", label: "Push", hint: "Mobile and browser push." },
    { key: "in_app_enabled", label: "In-app", hint: "The notification bell." },
] as const;

export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
    const [prefs, setPrefs] = useState(initial);
    const [saving, setSaving] = useState(false);

    const detected = (() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch {
            return null;
        }
    })();
    const zoneOptions = detected && !TIMEZONES.includes(detected) ? [detected, ...TIMEZONES] : TIMEZONES;

    const save = async () => {
        setSaving(true);
        const result = await saveMyNotificationPreferences(prefs);
        setSaving(false);
        if (result.success) toast.success("Notification preferences saved.");
        else toast.error(result.error || "Could not save preferences.");
    };

    return (
        <div className="space-y-4">
            {CHANNELS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.hint}</p>
                    </div>
                    <Switch
                        checked={prefs[c.key]}
                        onCheckedChange={(v) => setPrefs((p) => ({ ...p, [c.key]: v }))}
                    />
                </div>
            ))}

            <div className="space-y-2">
                <Label>Timezone (for quiet hours)</Label>
                <Select
                    value={prefs.timezone ?? "UTC"}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, timezone: v === "UTC" ? null : v }))}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {zoneOptions.map((z) => (
                            <SelectItem key={z} value={z}>
                                {z === "UTC" ? "UTC (default)" : z.replace(/_/g, " ")}
                                {z === detected && z !== "UTC" ? " — detected" : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label>Digest frequency</Label>
                    <Select
                        value={prefs.digest_frequency}
                        onValueChange={(v) => setPrefs((p) => ({ ...p, digest_frequency: v as NotificationPreferences["digest_frequency"] }))}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="daily">Daily digest</SelectItem>
                            <SelectItem value="weekly">Weekly digest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Quiet from</Label>
                    <Input
                        type="time"
                        value={prefs.quiet_hours_start ?? ""}
                        onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value || null }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Quiet until</Label>
                    <Input
                        type="time"
                        value={prefs.quiet_hours_end ?? ""}
                        onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value || null }))}
                    />
                </div>
            </div>

            <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save preferences
            </Button>
        </div>
    );
}

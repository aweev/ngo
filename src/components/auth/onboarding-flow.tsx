"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import type { PortalExperienceItem } from "@/types/domain/portal-experience";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const skills = ["Teaching", "Fundraising", "Events", "Communications", "Technology", "Project management"];
const availability = ["Weekdays", "Evenings", "Weekends"];
const causes = ["Education", "Community development", "Climate action", "Equality and inclusion"];

interface OnboardingFlowProps {
    step: 1 | 2 | 3 | 4;
    displayName?: string | null;
    options?: PortalExperienceItem[];
}

export function OnboardingFlow({ step, displayName, options = [] }: OnboardingFlowProps) {
    const t = useTranslations("Auth.Onboarding");
    const router = useRouter();
    const { role, formData, updateForm, setStep, setCompleted } = useOnboardingStore();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const goToStep = (nextStep: number) => {
        setError("");
        setStep(nextStep);
        router.push(`/auth/onboarding/step-${nextStep}`);
    };

    const configured = (group: "skills" | "availability" | "causes") => options.filter((item) => item.kind === "onboarding_option" && item.metadata.group === group && (!item.metadata.roles || item.metadata.roles.includes(role as "volunteer" | "donor")));
    const optionsFor = (group: "skills" | "availability" | "causes", fallback: string[]) => {
        const items = configured(group);
        return items.length > 0 ? items : fallback.map((label) => ({ item_key: label, label }));
    };
    const optionLabels = new Map(options.filter((item) => item.kind === "onboarding_option").map((item) => [item.item_key, item.label]));
    [...skills, ...availability, ...causes].forEach((label) => optionLabels.set(label, label));
    const selectedLabels = [...formData.skills, ...(formData.preferredCauses || []), ...formData.availability].map((key) => optionLabels.get(key) || key);
    const toggleValue = (field: "skills" | "availability" | "preferredCauses", value: string) => {
        const currentValues = formData[field] || [];
        updateForm({
            [field]: currentValues.includes(value)
                ? currentValues.filter((item) => item !== value)
                : [...currentValues, value],
        });
    };

    const handleNext = () => {
        if (step === 2 && (!formData.availability.length || (role === "volunteer" && !formData.skills.length))) {
            setError(t("errors.preferences"));
            return;
        }
        if (step === 3 && (!formData.gdprConsent || (role === "volunteer" && !formData.waiverSigned))) {
            setError(t("errors.consent"));
            return;
        }
        goToStep(step + 1);
    };

    const finish = async () => {
        setIsSubmitting(true);
        setCompleted(true);
        setStep(5);
        router.push("/auth/onboarding/complete");
    };

    useEffect(() => {
        if (!role) router.replace("/auth/onboarding/welcome");
    }, [role, router]);

    if (!role) return null;

    return (
        <div className="space-y-7">
            <header className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>{t("step_label", { step })}</span>
                    <span>{t(role === "volunteer" ? "volunteer_label" : "donor_label")}</span>
                </div>
                <div className="flex gap-2" aria-label={t("progress_label")}>
                    {[1, 2, 3, 4].map((item) => (
                        <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-primary" : "bg-muted"}`} />
                    ))}
                </div>
            </header>

            {step === 1 && (
                <section className="space-y-5">
                    <div>
                        <h1 className="font-serif text-3xl font-bold text-foreground">{t("profile_title")}</h1>
                        <p className="mt-2 text-muted-foreground">{t("profile_subtitle")}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("account_name")}</span>
                        <span className="mt-1 block font-medium text-foreground">{displayName || t("account_name_missing")}</span>
                        <span className="mt-2 block text-xs text-muted-foreground">{t("account_name_note")}</span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="experience">{t("experience_label")}</Label>
                        <textarea id="experience" value={formData.experience} onChange={(event) => updateForm({ experience: event.target.value })} placeholder={t("experience_placeholder")} className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
                    </div>
                </section>
            )}

            {step === 2 && (
                <section className="space-y-6">
                    <div><h1 className="font-serif text-3xl font-bold text-foreground">{t("preferences_title")}</h1><p className="mt-2 text-muted-foreground">{t("preferences_subtitle")}</p></div>
                    {role === "volunteer" && <ChoiceGroup title={t("skills_label")} values={optionsFor("skills", skills)} selected={formData.skills} onToggle={(value) => toggleValue("skills", value)} />}
                    <ChoiceGroup title={t("availability_label")} values={optionsFor("availability", availability)} selected={formData.availability} onToggle={(value) => toggleValue("availability", value)} />
                    {role === "donor" && <ChoiceGroup title={t("causes_label")} values={optionsFor("causes", causes)} selected={formData.preferredCauses || []} onToggle={(value) => toggleValue("preferredCauses", value)} />}
                </section>
            )}

            {step === 3 && (
                <section className="space-y-6">
                    <div><h1 className="font-serif text-3xl font-bold text-foreground">{t("consent_title")}</h1><p className="mt-2 text-muted-foreground">{t("consent_subtitle")}</p></div>
                    <div className="space-y-3">
                        {role === "volunteer" && <Consent checked={formData.waiverSigned} onChange={(checked) => updateForm({ waiverSigned: checked })} label={t("waiver_consent")} />}
                        <Consent checked={formData.gdprConsent} onChange={(checked) => updateForm({ gdprConsent: checked })} label={t("gdpr_consent")} />
                    </div>
                    <div className="flex gap-3 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>{t("consent_note")}</p></div>
                </section>
            )}

            {step === 4 && (
                <section className="space-y-6">
                    <div><h1 className="font-serif text-3xl font-bold text-foreground">{t("review_title")}</h1><p className="mt-2 text-muted-foreground">{t("review_subtitle")}</p></div>
                    <div className="divide-y divide-border rounded-xl border border-border bg-card">
                        <ReviewRow label={t("review_name")} value={displayName || t("account_name_missing")} />
                        <ReviewRow label={t("review_role")} value={role === "volunteer" ? t("volunteer_label") : t("donor_label")} />
                        <ReviewRow label={t("review_preferences")} value={selectedLabels.join(", ") || t("none")} />
                        <ReviewRow label={t("review_consent")} value={t("confirmed")} />
                    </div>
                </section>
            )}

            {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => step === 1 ? router.push("/auth/onboarding/welcome") : goToStep(step - 1)}><ArrowLeft />{t("back")}</Button>
                {step < 4 ? <Button onClick={handleNext}>{t("continue")}<ArrowRight /></Button> : <Button onClick={finish} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}{t("finish")}</Button>}
            </div>
        </div>
    );
}

function ChoiceGroup({ title, values, selected, onToggle }: { title: string; values: Array<{ item_key: string; label: string }>; selected: string[]; onToggle: (value: string) => void }) {
    return <fieldset className="space-y-3"><legend className="text-sm font-semibold text-foreground">{title}</legend><div className="grid gap-2 sm:grid-cols-2">{values.map((value) => <button key={value.item_key} type="button" onClick={() => onToggle(value.item_key)} className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${selected.includes(value.item_key) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}><span>{value.label}</span>{selected.includes(value.item_key) && <Check className="h-4 w-4" />}</button>)}</div></fieldset>;
}

function Consent({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
    return <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-4 text-sm leading-6 transition-colors has-checked:border-primary has-checked:bg-primary/5"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>{label}</span></label>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return <div className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">{value}</dd></div>;
}
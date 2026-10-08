'use client';

import React, { useState } from 'react';
import {
    ShieldAlert, Heart, Utensils, Stethoscope, Sparkles, CheckCircle2,
    ArrowRight, Loader2, AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import {
    seedWorkspaceTemplate,
    type SeedWorkspaceResult,
    type WorkspaceTemplateId,
} from '@/actions/bootstrap';

/**
 * Guided setup that does REAL work (audit Wave 0 item 4 / Wave 2 small team).
 * The old wizard faked "auto-seeding" with an 800 ms timer; this version
 * calls seedWorkspaceTemplate() and reports exactly what was created — as
 * reversible drafts, never silently published.
 */
const ARCHETYPE_ICONS: Record<WorkspaceTemplateId, React.ComponentType<{ className?: string }>> = {
    disaster_relief: ShieldAlert,
    animal_shelter: Heart,
    food_bank: Utensils,
    healthcare: Stethoscope,
};

const ARCHETYPE_IDS = Object.keys(ARCHETYPE_ICONS) as WorkspaceTemplateId[];

export function OnboardingWizard({ onComplete }: { onComplete?: (archetype: WorkspaceTemplateId) => void }) {
    const t = useTranslations('Admin.Onboarding');
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selected, setSelected] = useState<WorkspaceTemplateId>('disaster_relief');
    const [isSeeding, setIsSeeding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SeedWorkspaceResult | null>(null);

    const ActiveIcon = ARCHETYPE_ICONS[selected];

    const handleSeed = async () => {
        setIsSeeding(true);
        setError(null);
        const res = await seedWorkspaceTemplate(selected);
        setIsSeeding(false);
        setResult(res);
        if (!res.success) {
            setError(res.error ?? t('seedFailed'));
            return;
        }
        setStep(3);
    };

    return (
        <Card className="mx-auto max-w-2xl shadow-xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>

            <CardContent>
                {step === 1 && (
                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('step1Label')}
                        </label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {ARCHETYPE_IDS.map((id) => {
                                const ArchetypeIcon = ARCHETYPE_ICONS[id];
                                const isSelected = id === selected;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSelected(id)}
                                        className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${isSelected
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                : 'border-border hover:border-border/80 hover:bg-muted/40'
                                            }`}
                                    >
                                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-xs">
                                            <ArchetypeIcon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        </div>
                                        <h4 className="font-semibold text-foreground">{t(`archetype_${id}_name`)}</h4>
                                        <p className="mt-1 text-xs text-muted-foreground">{t(`archetype_${id}_desc`)}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('step2Label')}
                        </label>
                        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                                <ActiveIcon className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold text-primary">{t(`archetype_${selected}_name`)}</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-foreground">
                                <li>• {t('createsCampaign')}</li>
                                <li>• {t('createsMetric')}</li>
                                <li>• {t('createsRole')}</li>
                                <li>• {t('createsTemplate')}</li>
                            </ul>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('draftHint')}</p>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>
                )}

                {step === 3 && (
                    <div className="py-6 text-center space-y-3">
                        {error ? (
                            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                        ) : (
                            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                        )}
                        <h3 className="text-lg font-bold text-foreground">
                            {result?.alreadySeeded ? t('alreadySeededTitle') : t('readyTitle')}
                        </h3>
                        {error && <p className="text-xs text-destructive max-w-md mx-auto">{error}</p>}
                        {result && result.created.length > 0 && (
                            <div className="mx-auto max-w-md space-y-1 text-left">
                                {result.created.map((item, idx) => (
                                    <div
                                        key={`${item.kind}-${idx}`}
                                        className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5"
                                    >
                                        <span className="text-xs text-muted-foreground">{t(`kind_${item.kind}`)}</span>
                                        <Badge variant="outline" className="text-xs">{item.name}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!error && (
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">{t('draftsHint')}</p>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border pt-4">
                {step === 2 && (
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>{t('back')}</Button>
                )}
                {step === 1 && (
                    <Button size="sm" className="ml-auto" onClick={() => setStep(2)}>
                        {t('next')} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                )}
                {step === 2 && (
                    <Button size="sm" className="ml-auto" onClick={handleSeed} disabled={isSeeding}>
                        {isSeeding ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('seeding')}</>
                        ) : (
                            t('seedButton')
                        )}
                    </Button>
                )}
                {step === 3 && error && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setStep(2)}>
                        {t('back')}
                    </Button>
                )}
                {step === 3 && !error && (
                    <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onComplete?.(selected)}
                    >
                        {t('launch')}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

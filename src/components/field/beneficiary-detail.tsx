'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { checkDuplicates, mergeBeneficiaries } from '@/actions/beneficiaries';
import { pushFieldBatch } from '@/actions/field-sync';
import { enqueueFieldOp, newOfflineUuid } from '@/lib/offline/field-db';
import { getFieldDeviceId, useFieldSyncStore } from '@/store/use-field-sync-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Beneficiary, DuplicateCandidate, Referral, ServiceRecord } from '@/types/domain/field';

const SERVICE_TYPES = [
    'svc_food', 'svc_water', 'svc_shelter', 'svc_health',
    'svc_education', 'svc_cash', 'svc_protection', 'svc_other',
] as const;

/**
 * Beneficiary detail: log a service in 3 taps (chip -> quantity -> confirm),
 * create a referral, review history. All writes queue offline first.
 */
export function BeneficiaryDetail({
    beneficiary,
    services,
    referrals,
}: {
    beneficiary: Beneficiary;
    services: ServiceRecord[];
    referrals: Referral[];
}) {
    const t = useTranslations('Field');
    const syncNow = useFieldSyncStore((s) => s.syncNow);

    const [serviceType, setServiceType] = useState<string | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [logged, setLogged] = useState(false);
    const [referTo, setReferTo] = useState('');
    const [referReason, setReferReason] = useState('');
    const [referred, setReferred] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dupes, setDupes] = useState<DuplicateCandidate[] | null>(null);

    async function queueAndPush(kind: 'service' | 'referral', payload: Record<string, unknown>) {
        const uuid = newOfflineUuid();
        await enqueueFieldOp({
            offline_uuid: uuid,
            kind,
            idempotency_key: uuid,
            payload: { ...payload, beneficiary_id: beneficiary.id },
            device_id: getFieldDeviceId(),
        });
        try {
            await syncNow(async (input) => pushFieldBatch(input), getFieldDeviceId());
        } catch {
            // Stays queued; the sync screen retries.
        }
    }

    async function confirmService() {
        if (!serviceType || busy) return;
        setBusy(true);
        setError(null);
        try {
            await queueAndPush('service', {
                service_type: `${t(serviceType)}`,
                quantity: Math.max(1, Number(quantity) || 1),
            });
            setLogged(true);
            setServiceType(null);
            setQuantity('1');
        } catch {
            setError(t('general_error'));
        }
        setBusy(false);
    }

    async function confirmReferral() {
        if (!referTo.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
            await queueAndPush('referral', { referred_to: referTo.trim(), reason: referReason.trim() || null });
            setReferred(true);
            setReferTo('');
            setReferReason('');
        } catch {
            setError(t('general_error'));
        }
        setBusy(false);
    }

    async function loadDupes() {
        if (dupes !== null) {
            setDupes(null);
            return;
        }
        const { data } = await checkDuplicates({ full_name: beneficiary.full_name });
        setDupes((data ?? []).filter((d) => d.id !== beneficiary.id));
    }

    async function mergeInto(id: string) {
        setBusy(true);
        const { error: mergeError } = await mergeBeneficiaries(id, beneficiary.id);
        if (!mergeError) {
            setDupes(null);
        } else {
            setError(mergeError);
        }
        setBusy(false);
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
                <h1 className="text-xl font-bold">{beneficiary.full_name}</h1>
                <p className="text-sm text-muted-foreground">{beneficiary.location_text || '–'}</p>
            </div>

            {/* 3-tap service log */}
            <div className="space-y-3 rounded-2xl border bg-card p-4">
                <h2 className="font-bold">{t('service_title')}</h2>
                <div className="grid grid-cols-2 gap-2">
                    {SERVICE_TYPES.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setServiceType(key);
                                setLogged(false);
                            }}
                            aria-pressed={serviceType === key}
                            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                                serviceType === key ? 'border-primary bg-primary/10' : ''
                            }`}
                        >
                            {t(key)}
                        </button>
                    ))}
                </div>
                {serviceType && (
                    <div className="flex gap-2">
                        <div className="w-24">
                            <Label htmlFor="qty">{t('quantity')}</Label>
                            <Input
                                id="qty"
                                className="min-h-12 text-base"
                                inputMode="numeric"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <Button className="min-h-12 flex-1 self-end" disabled={busy} onClick={confirmService}>
                            {t('log_btn')}
                        </Button>
                    </div>
                )}
                {logged && <p className="text-sm text-emerald-600">{t('logged_msg')}</p>}
            </div>

            {/* Referral */}
            <div className="space-y-3 rounded-2xl border bg-card p-4">
                <h2 className="font-bold">{t('refer_title')}</h2>
                <div className="space-y-2">
                    <Label htmlFor="refer-to">{t('referred_to')}</Label>
                    <Input
                        id="refer-to"
                        className="min-h-12 text-base"
                        value={referTo}
                        onChange={(e) => setReferTo(e.target.value)}
                        autoComplete="off"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="refer-reason">{t('reason')}</Label>
                    <Input
                        id="refer-reason"
                        className="min-h-12 text-base"
                        value={referReason}
                        onChange={(e) => setReferReason(e.target.value)}
                        autoComplete="off"
                    />
                </div>
                <Button className="min-h-12 w-full" disabled={busy || referTo.trim().length < 2} onClick={confirmReferral}>
                    {t('refer_btn')}
                </Button>
                {referred && <p className="text-sm text-emerald-600">{t('referred_msg')}</p>}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* History */}
            <div className="rounded-2xl border bg-card p-4">
                <h2 className="font-bold">{t('services_history')}</h2>
                {services.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">{t('no_services')}</p>
                ) : (
                    services.map((s) => (
                        <div key={s.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                            <span>{s.service_type}</span>
                            <span className="text-muted-foreground">
                                {s.quantity} × {s.delivered_at}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="rounded-2xl border bg-card p-4">
                <h2 className="font-bold">{t('referrals_list')}</h2>
                {referrals.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">{t('no_referrals')}</p>
                ) : (
                    referrals.map((r) => (
                        <div key={r.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                            <span>{r.referred_to}</span>
                            <span className="text-muted-foreground">{r.status}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Duplicate review (officer-initiated merge) */}
            <div className="rounded-2xl border bg-card p-4">
                <button type="button" className="min-h-11 text-sm font-semibold" onClick={loadDupes}>
                    {t('possible_dupes')}
                </button>
                {dupes !== null && dupes.length === 0 && (
                    <p className="text-sm text-muted-foreground">—</p>
                )}
                {dupes?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <span>
                            {d.full_name} <span className="text-muted-foreground">({d.location_text})</span>
                        </span>
                        <button
                            type="button"
                            className="min-h-11 shrink-0 rounded-lg border px-3 font-semibold"
                            disabled={busy}
                            onClick={() => void mergeInto(d.id)}
                        >
                            {t('merge_btn')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

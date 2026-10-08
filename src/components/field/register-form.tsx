'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { checkDuplicates } from '@/actions/beneficiaries';
import { pushFieldBatch } from '@/actions/field-sync';
import { clearDraft, enqueueFieldOp, loadDraft, newOfflineUuid, saveDraft } from '@/lib/offline/field-db';
import { getFieldDeviceId, useFieldSyncStore } from '@/store/use-field-sync-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { DuplicateCandidate } from '@/types/domain/field';

interface MemberDraft {
    name: string;
    sex: string;
    age_band: string;
    phone: string;
}

const EMPTY_MEMBER: MemberDraft = { name: '', sex: 'unknown', age_band: 'unknown', phone: '' };

/**
 * Household registration in 3 steps (Phase 1 flow A: under 2 minutes).
 * Single write path: everything is queued in IndexedDB first, then the sync
 * store pushes immediately when online. Offline is the default, not the
 * exception — there is no separate "offline mode".
 */
export function RegisterForm() {
    const t = useTranslations('Field');
    const router = useRouter();
    const syncNow = useFieldSyncStore((s) => s.syncNow);

    const [step, setStep] = useState(1);
    const [headName, setHeadName] = useState('');
    const [location, setLocation] = useState('');
    const [consent, setConsent] = useState(false);
    const [members, setMembers] = useState<MemberDraft[]>([{ ...EMPTY_MEMBER }]);
    const [dupes, setDupes] = useState<Record<number, DuplicateCandidate[]>>({});
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Crash recovery: restore the in-progress draft once.
    useEffect(() => {
        void loadDraft('register-household').then((d) => {
            if (d) {
                if (typeof d.headName === 'string') setHeadName(d.headName);
                if (typeof d.location === 'string') setLocation(d.location);
                if (typeof d.consent === 'boolean') setConsent(d.consent);
                if (Array.isArray(d.members) && d.members.length > 0) {
                    setMembers(d.members as MemberDraft[]);
                }
            }
            setLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        void saveDraft('register-household', { headName, location, consent, members });
    }, [loaded, headName, location, consent, members]);

    const step1Valid = headName.trim().length >= 2 && consent;
    const step2Valid = members.length > 0 && members.every((m) => m.name.trim().length >= 2);

    const runDuplicateCheck = useCallback(async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setDupes({});
            return;
        }
        setChecking(true);
        try {
            const found: Record<number, DuplicateCandidate[]> = {};
            for (let i = 0; i < members.length; i++) {
                const { data } = await checkDuplicates({
                    full_name: members[i].name.trim(),
                    sex: members[i].sex,
                    age_band: members[i].age_band,
                });
                if (data && data.length > 0) found[i] = data;
            }
            setDupes(found);
        } catch {
            setDupes({});
        }
        setChecking(false);
    }, [members]);

    function goToReview() {
        setStep(3);
        // Fired from the event handler, not an effect: the async duplicate
        // check setStates after the step transition commits.
        void runDuplicateCheck();
    }

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const householdUuid = newOfflineUuid();
            await enqueueFieldOp({
                offline_uuid: householdUuid,
                kind: 'household',
                idempotency_key: householdUuid,
                payload: {
                    head_name: headName.trim(),
                    location_text: location.trim(),
                    member_count: members.length,
                },
                device_id: getFieldDeviceId(),
            });
            for (const m of members) {
                const uuid = newOfflineUuid();
                await enqueueFieldOp({
                    offline_uuid: uuid,
                    kind: 'beneficiary',
                    idempotency_key: uuid,
                    payload: {
                        full_name: m.name.trim(),
                        sex: m.sex,
                        age_band: m.age_band,
                        phone: m.phone.trim() || null,
                        location_text: location.trim(),
                        household_offline_uuid: householdUuid,
                    },
                    device_id: getFieldDeviceId(),
                });
            }
            await clearDraft('register-household');
            // Best effort: push now when online; otherwise the queue waits.
            try {
                await syncNow(async (input) => pushFieldBatch(input), getFieldDeviceId());
            } catch {
                // The records are safe in the outbox; the sync screen retries.
            }
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('general_error'));
        }
        setSaving(false);
    }

    if (saved) {
        return (
            <div className="space-y-4 rounded-2xl border bg-card p-6 text-center">
                <div className="text-4xl" aria-hidden="true">
                    &#9989;
                </div>
                <p className="font-bold">{t('saved_offline')}</p>
                <Button className="min-h-12 w-full" onClick={() => router.push('/field')}>
                    {t('field_home')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">{t('register_title')}</h1>
                <p className="text-sm text-muted-foreground">{t('register_desc', { step })}</p>
            </div>

            {step === 1 && (
                <div className="space-y-4 rounded-2xl border bg-card p-4">
                    <div className="space-y-2">
                        <Label htmlFor="head-name">{t('head_name')}</Label>
                        <Input
                            id="head-name"
                            className="min-h-12 text-base"
                            value={headName}
                            onChange={(e) => setHeadName(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">{t('location')}</Label>
                        <Input
                            id="location"
                            className="min-h-12 text-base"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <label className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
                        <Checkbox
                            checked={consent}
                            onCheckedChange={(v) => setConsent(v === true)}
                            className="mt-0.5 h-6 w-6"
                            aria-label={t('consent')}
                        />
                        <span>
                            {t('consent')}
                            <span className="block text-xs text-muted-foreground">{t('consent_hint')}</span>
                        </span>
                    </label>
                    <Button className="min-h-12 w-full" disabled={!step1Valid} onClick={() => setStep(2)}>
                        {t('next')}
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-3">
                    {members.map((m, i) => (
                        <div key={i} className="space-y-3 rounded-2xl border bg-card p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">{t('member_details', { n: i + 1 })}</span>
                                {members.length > 1 && (
                                    <button
                                        type="button"
                                        className="min-h-11 px-3 text-sm text-destructive"
                                        onClick={() => setMembers(members.filter((_, j) => j !== i))}
                                    >
                                        {t('remove_member')}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`member-${i}`}>{t('member_name')}</Label>
                                <Input
                                    id={`member-${i}`}
                                    className="min-h-12 text-base"
                                    value={m.name}
                                    onChange={(e) =>
                                        setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                                    }
                                    autoComplete="off"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Sex</Label>
                                    <Select
                                        value={m.sex}
                                        onValueChange={(v) =>
                                            setMembers(members.map((x, j) => (j === i ? { ...x, sex: v } : x)))
                                        }
                                    >
                                        <SelectTrigger className="min-h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="female">{t('sex_female')}</SelectItem>
                                            <SelectItem value="male">{t('sex_male')}</SelectItem>
                                            <SelectItem value="unknown">{t('sex_unknown')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('age_band')}</Label>
                                    <Select
                                        value={m.age_band}
                                        onValueChange={(v) =>
                                            setMembers(members.map((x, j) => (j === i ? { ...x, age_band: v } : x)))
                                        }
                                    >
                                        <SelectTrigger className="min-h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="under_5">{t('age_under_5')}</SelectItem>
                                            <SelectItem value="age_5_11">{t('age_5_11')}</SelectItem>
                                            <SelectItem value="age_12_17">{t('age_12_17')}</SelectItem>
                                            <SelectItem value="age_18_59">{t('age_18_59')}</SelectItem>
                                            <SelectItem value="age_60_plus">{t('age_60_plus')}</SelectItem>
                                            <SelectItem value="unknown">{t('sex_unknown')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`phone-${i}`}>{t('phone_label')}</Label>
                                <Input
                                    id={`phone-${i}`}
                                    className="min-h-12 text-base"
                                    value={m.phone}
                                    inputMode="tel"
                                    onChange={(e) =>
                                        setMembers(members.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))
                                    }
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        className="min-h-12 w-full"
                        onClick={() => setMembers([...members, { ...EMPTY_MEMBER }])}
                    >
                        + {t('add_member')}
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" className="min-h-12 flex-1" onClick={() => setStep(1)}>
                            {t('back')}
                        </Button>
                        <Button className="min-h-12 flex-[2]" disabled={!step2Valid} onClick={goToReview}>
                            {t('next')}
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-3">
                    <div className="rounded-2xl border bg-card p-4">
                        <h2 className="font-bold">{t('review_title')}</h2>
                        <p className="text-sm">
                            {headName} — {location || '–'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('members_added', { count: members.length })}
                        </p>
                    </div>

                    {checking && <p className="text-sm text-muted-foreground">…</p>}
                    {Object.keys(dupes).length > 0 && (
                        <div className="space-y-2 rounded-2xl border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
                            <p className="text-sm font-bold">{t('possible_dupes')}</p>
                            {Object.entries(dupes).map(([idx, list]) =>
                                list.map((d) => (
                                    <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                                        <span>
                                            {d.full_name} <span className="text-muted-foreground">({d.location_text})</span>
                                        </span>
                                        <button
                                            type="button"
                                            className="min-h-11 shrink-0 rounded-lg border px-3 font-semibold"
                                            onClick={() => {
                                                setMembers(members.filter((_, j) => j !== Number(idx)));
                                                setDupes((prev) => {
                                                    const next = { ...prev };
                                                    delete next[Number(idx)];
                                                    return next;
                                                });
                                            }}
                                        >
                                            {t('use_existing')}
                                        </button>
                                    </div>
                                )),
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="outline" className="min-h-12 flex-1" onClick={() => setStep(2)}>
                            {t('back')}
                        </Button>
                        <Button className="min-h-12 flex-[2]" disabled={saving || members.length === 0} onClick={save}>
                            {saving ? t('syncing') : t('save_offline')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

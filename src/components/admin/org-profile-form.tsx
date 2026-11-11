'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateOrganizationProfile } from '@/actions/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OrganizationProfile } from '@/actions/organization';

/**
 * Editable organization identity (name, registration number, tax id, contact
 * email). Currency is displayed read-only — changing it is a data migration
 * under the single-currency decision, not a settings toggle.
 */
export function OrgProfileForm({ initial }: { initial: OrganizationProfile }) {
    const t = useTranslations('Admin.Settings');
    const [name, setName] = useState(initial.name);
    const [registrationNumber, setRegistrationNumber] = useState(initial.registration_number ?? '');
    const [taxId, setTaxId] = useState(initial.tax_id ?? '');
    const [email, setEmail] = useState(initial.email ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    async function save() {
        setSaving(true);
        setError(null);
        setSaved(false);
        const result = await updateOrganizationProfile({
            name,
            registration_number: registrationNumber,
            tax_id: taxId,
            email,
        });
        setSaving(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setSaved(true);
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("org_name")}</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("registration_number")}</label>
                    <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("tax_id")}</label>
                    <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("contact_email")}</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("currency")}</label>
                    <Input value={initial.default_currency ?? ""} readOnly disabled />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button size="sm" disabled={saving || name.trim().length < 2} onClick={save}>
                    {saving ? t("saving_profile") : t("save_profile")}
                </Button>
                {saved && <span className="text-sm text-emerald-600">{t("profile_saved")}</span>}
                {error && <span className="text-sm text-red-500">{error}</span>}
            </div>
        </div>
    );
}

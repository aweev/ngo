'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getFinanceSettings, updateFinanceSettings } from '@/actions/fx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

/** Org finance settings: reporting currency + two-step approval threshold. */
export function FinanceSettingsForm({
    initial,
}: {
    initial: { default_currency: string; expense_approval_threshold: number | null };
}) {
    const t = useTranslations('Admin.Financial.reconcile');
    const [currency, setCurrency] = useState(initial.default_currency);
    const [threshold, setThreshold] = useState(
        initial.expense_approval_threshold === null ? '' : String(initial.expense_approval_threshold),
    );
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        setSaving(true);
        setError(null);
        setMessage(null);
        const result = await updateFinanceSettings({
            default_currency: currency.trim().toUpperCase() || undefined,
            expense_approval_threshold: threshold.trim() === '' ? null : Number(threshold),
        });
        setSaving(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        // Refresh shows the persisted row; the saved banner confirms the write.
        const fresh = await getFinanceSettings();
        if (fresh.data) {
            setCurrency((fresh.data as { default_currency: string }).default_currency);
            const th = (fresh.data as { expense_approval_threshold: number | null }).expense_approval_threshold;
            setThreshold(th === null ? '' : String(th));
        }
        setMessage(t('saved'));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('threshold_label')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label htmlFor="fin-currency" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('default_currency_label')}
                        </label>
                        <Input
                            id="fin-currency"
                            value={currency}
                            maxLength={3}
                            onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                            placeholder="EUR"
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="fin-threshold" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('threshold_label')}
                        </label>
                        <Input
                            id="fin-threshold"
                            type="number"
                            min="0"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            placeholder={t('threshold_empty')}
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('threshold_hint')}</p>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {message && <p className="text-sm text-emerald-600">{message}</p>}
                <div className="flex justify-end">
                    <Button disabled={saving} onClick={save}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { setExchangeRate } from '@/actions/fx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';

/** Adds one dated rate. Corrections are new rows — history is never edited. */
export function FxRateForm() {
    const t = useTranslations('Admin.Financial.reconcile');
    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [rate, setRate] = useState('');
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);
        const result = await setExchangeRate({
            from_currency: from,
            to_currency: to,
            rate: Number(rate),
            rate_date: date,
        });
        setSaving(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setMessage(t('fx_saved'));
        setFrom('');
        setTo('');
        setRate('');
        window.location.reload();
    }

    if (!open) {
        return (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> {t('fx_add')}
            </Button>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('fx_add')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={save} className="space-y-4">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {message && <p className="text-sm text-emerald-600">{message}</p>}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="space-y-1">
                            <label htmlFor="fx-from" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('fx_from')}
                            </label>
                            <Input id="fx-from" required value={from} maxLength={3} onChange={(e) => setFrom(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="EUR" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="fx-to" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('fx_to')}
                            </label>
                            <Input id="fx-to" required value={to} maxLength={3} onChange={(e) => setTo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="USD" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="fx-rate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('fx_rate')}
                            </label>
                            <Input id="fx-rate" required type="number" min="0" step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1.08" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="fx-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('fx_date')}
                            </label>
                            <Input id="fx-date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('fx_hint')}</p>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            {t('back')}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('fx_add')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

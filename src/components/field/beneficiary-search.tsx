'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { getBeneficiaries } from '@/actions/beneficiaries';
import { Input } from '@/components/ui/input';
import type { Beneficiary } from '@/types/domain/field';

/** Name search over decrypted server results (bounded page, Phase 1 scale). */
export function BeneficiarySearch({ initial }: { initial: Beneficiary[] }) {
    const t = useTranslations('Field');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Beneficiary[] | null>(null);
    const [searching, setSearching] = useState(false);

    async function search(value: string) {
        setQuery(value);
        if (value.trim().length < 2) {
            setResults(null);
            return;
        }
        setSearching(true);
        try {
            const { data } = await getBeneficiaries({ query: value.trim(), limit: 25 });
            setResults(data ?? []);
        } catch {
            setResults([]);
        }
        setSearching(false);
    }

    const list = results ?? initial;

    return (
        <div className="space-y-3">
            <Input
                className="min-h-12 text-base"
                placeholder={t('search_ph')}
                value={query}
                onChange={(e) => void search(e.target.value)}
                autoComplete="off"
                aria-label={t('search_ph')}
            />
            {searching && <p className="text-sm text-muted-foreground">…</p>}
            {!searching && list.length === 0 && (
                <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                    {t('empty_list')}
                </p>
            )}
            <div className="space-y-2">
                {list.map((b) => (
                    <Link
                        key={b.id}
                        href={`/field/beneficiaries/${b.id}`}
                        className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3 active:bg-muted"
                    >
                        <div>
                            <div className="font-bold">{b.full_name}</div>
                            <div className="text-xs text-muted-foreground">{b.location_text || '–'}</div>
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">{t('tap_to_open')}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { runReport } from '@/actions/reporting';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Play, X } from 'lucide-react';

interface RunReportButtonProps {
    reportId: string;
}

export function RunReportButton({ reportId }: RunReportButtonProps) {
    const t = useTranslations('Admin.Reporting.run');
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    async function handleRun() {
        if (status === 'running') return;

        setStatus('running');
        setMessage(null);
        const result = await runReport(reportId);

        if (result.error) {
            setStatus('error');
            setMessage(result.error);
            return;
        }

        setStatus('success');
        setMessage(t('rows_captured', { count: result.data?.row_count ?? 0 }));
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={handleRun} disabled={status === 'running'}>
                {status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : status === 'success' ? <Check className="h-3 w-3" /> : status === 'error' ? <X className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {status === 'running' ? t('running') : status === 'success' ? t('complete') : status === 'error' ? t('retry') : t('run')}
            </Button>
            {message && <span className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</span>}
        </div>
    );
}

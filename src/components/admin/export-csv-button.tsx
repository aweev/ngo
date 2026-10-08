'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { exportReportCsv } from '@/actions/reporting';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';

/** Downloads a report as CSV straight from the shared fetch path. */
export function ExportCsvButton({ reportId }: { reportId: string }) {
    const t = useTranslations('Admin.Reporting.run');
    const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    async function handleExport() {
        if (status === 'working') return;
        setStatus('working');
        setMessage(null);
        const result = await exportReportCsv(reportId);
        if (result.error || !result.data) {
            setStatus('error');
            setMessage(result.error);
            return;
        }
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus('idle');
        setMessage(t('rows_captured', { count: result.data.row_count }));
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="gap-1" onClick={handleExport} disabled={status === 'working'}>
                {status === 'working' ? <Loader2 className="h-3 w-3 animate-spin" /> : status === 'error' ? <X className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                {status === 'working' ? t('exporting') : t('export_csv')}
            </Button>
            {message && <span className={`text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</span>}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateIATIXmlExport } from '@/actions/iati';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';

/** Downloads the honest IATI export; warnings tell what was OMITTED and why. */
export function IatiExportButton() {
    const t = useTranslations('Admin.Reporting.run');
    const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    async function handleExport() {
        if (status === 'working') return;
        setStatus('working');
        setMessage(null);
        const result = await generateIATIXmlExport();
        if (result.error || !result.data) {
            setStatus('error');
            setMessage(result.error);
            return;
        }
        const blob = new Blob([result.data.xml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus('idle');
        const warnings = result.data.warnings.slice(0, 3).join(' ');
        setMessage(
            t('rows_captured', { count: result.data.activity_count }) +
            (warnings ? ` ${t('iati_warnings')}: ${warnings}` : ''),
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExport} disabled={status === 'working'}>
                {status === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : status === 'error' ? <X className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {t('iati_export')}
            </Button>
            {message && <span className={`max-w-md text-xs ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</span>}
        </div>
    );
}

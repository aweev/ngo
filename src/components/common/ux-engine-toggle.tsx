'use client';

import React from 'react';
import { Smartphone, LayoutGrid } from 'lucide-react';
import { useUXEngineStore, type UXEngineMode } from '@/store/use-ux-engine-store';

export function UXEngineToggle() {
    const { mode, setMode } = useUXEngineStore();

    return (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
                type="button"
                onClick={() => setMode('tactical_field' as UXEngineMode)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    mode === 'tactical_field'
                        ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Tactical Field Mode: Thumb-friendly touch cards for field operations"
            >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tactical Field</span>
            </button>

            <button
                type="button"
                onClick={() => setMode('command_center' as UXEngineMode)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    mode === 'command_center'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Command Center Mode: High-density data grid & analytics for administrative desktop"
            >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Command Center</span>
            </button>
        </div>
    );
}

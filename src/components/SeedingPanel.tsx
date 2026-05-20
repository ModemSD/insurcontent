'use client';

import React, { useState, useTransition } from 'react';
import { Database, Trash2, RefreshCcw, Sparkles } from 'lucide-react';
import { seedDemoData, clearAllData } from '@/app/actions';

interface SeedingPanelProps {
  onMutationStart?: () => void;
  onMutationEnd?: () => void;
}

export default function SeedingPanel({ onMutationStart, onMutationEnd }: SeedingPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);

  const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>, successText: string) => {
    setStatusMessage(null);
    onMutationStart?.();
    startTransition(async () => {
      const res = await actionFn();
      if (res.success) {
        setStatusMessage({ text: successText, error: false });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage({ text: res.error || 'Operation failed', error: true });
      }
      onMutationEnd?.();
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>Demo Data Utility Panel</span>
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          Use these helper tools to seed realistic insurance market signals or reset the workspace database.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {statusMessage && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            statusMessage.error ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            {statusMessage.text}
          </span>
        )}

        <button
          onClick={() => handleAction(seedDemoData, 'Demo data loaded successfully!')}
          disabled={isPending}
          className="flex h-8 items-center gap-1.5 rounded border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {isPending ? (
            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Database className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span>Load Demo Data</span>
        </button>

        <button
          onClick={() => handleAction(clearAllData, 'Database cleared successfully!')}
          disabled={isPending}
          className="flex h-8 items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Database</span>
        </button>
      </div>
    </div>
  );
}

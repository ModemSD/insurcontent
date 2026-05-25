'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ExternalLink, ChevronLeft, ChevronRight, Inbox, RefreshCcw, 
  MessageSquare, Linkedin, Search, Calendar, Link2, Sparkles,
  Check, EyeOff, Trash2, Loader2
} from 'lucide-react';
import { RawContent, updateSignalStatus, deleteSignal, sendRewriteWebhook } from '@/app/actions';
import { formatUrl } from '@/lib/utils';

interface SignalsTableProps {
  signals: RawContent[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onSelectSignal: (signal: RawContent) => void;
  isDbEmpty: boolean;
  onSeed: () => void;
  isSeeding: boolean;
  isReview?: boolean;
}

export default function SignalsTable({
  signals,
  totalCount,
  currentPage,
  pageSize,
  onSelectSignal,
  isDbEmpty,
  onSeed,
  isSeeding,
  isReview = false,
}: SignalsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingActionId, setPendingActionId] = useState<string | number | null>(null);

  const handleRewrite = async (signal: RawContent, platform: string) => {
    setPendingActionId(signal.id!);
    const res = await sendRewriteWebhook(signal, platform);
    setPendingActionId(null);
    if (res.success) {
      alert(`Sent successfully to n8n for rewriting on ${platform}!`);
    } else {
      alert(`Failed to send to n8n: ${res.error}`);
    }
  };

  const handleStatusChange = async (id: string | number, status: 'approved' | 'hidden') => {
    setPendingActionId(id);
    const res = await updateSignalStatus(id, status);
    setPendingActionId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert('Failed to update status: ' + res.error);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this signal from the database?')) {
      setPendingActionId(id);
      const res = await deleteSignal(id);
      setPendingActionId(null);
      if (res.success) {
        router.refresh();
      } else {
        alert('Failed to delete signal: ' + res.error);
      }
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.replace(`/?${params.toString()}`);
  };

  const getViralScoreWidget = (score: number) => {
    const isHigh = score >= 70;
    const isMed = score >= 40 && score < 70;
    
    let colorClass = 'bg-rose-500';
    let textClass = 'text-rose-600 bg-rose-50';
    if (isHigh) {
      colorClass = 'bg-emerald-500';
      textClass = 'text-emerald-700 bg-emerald-50';
    } else if (isMed) {
      colorClass = 'bg-amber-500';
      textClass = 'text-amber-700 bg-amber-50';
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${textClass}`}>
          {score}%
        </span>
        <div className="hidden h-1.5 w-12 rounded-full bg-zinc-100 overflow-hidden sm:block">
          <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  };

  const getSourceIcon = (source: string) => {
    const src = source.toLowerCase();
    if (src === 'reddit') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-50 text-orange-600">
            <MessageSquare className="h-3 w-3" />
          </div>
          <span className="text-xs font-semibold text-zinc-700">reddit</span>
        </div>
      );
    }
    if (src === 'linkedin') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-blue-600">
            <Linkedin className="h-3 w-3" />
          </div>
          <span className="text-xs font-semibold text-zinc-700">linkedin</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-50 text-cyan-600">
          <Search className="h-3 w-3" />
        </div>
        <span className="text-xs font-semibold text-zinc-700">{src}</span>
      </div>
    );
  };

  // Render Empty State if DB is empty
  if (isDbEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 px-4 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-zinc-900">Signals Database is Empty</h3>
        <p className="mt-2 max-w-sm text-xs text-zinc-500">
          Populate the pipeline with high-quality AI analysis results for the insurance industry.
        </p>
        <div className="mt-6">
          <button
            onClick={onSeed}
            disabled={isSeeding}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20"
          >
            {isSeeding ? (
              <>
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                <span>Ingesting signals...</span>
              </>
            ) : (
              <span>Load Ingestor Demo Data</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render Empty State if filtered list is empty
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 px-4 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 border border-zinc-200 text-zinc-400">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-zinc-900">No matching signals found</h3>
        <p className="mt-2 max-w-sm text-xs text-zinc-500">
          No records matched your search query. Try clearing filters or using another keyword.
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.replace('/')}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-50"
          >
            Clear Active Filters
          </button>
        </div>
      </div>
    );
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4">
      {/* Premium modern Table Grid */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs text-zinc-700">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 font-bold text-zinc-400 uppercase tracking-wider select-none text-[10px]">
              <th className="py-4 px-4 sm:px-6 w-[120px]">Source</th>
              <th className="py-4 px-4">Signal Title</th>
              <th className="py-4 px-4 text-left w-[160px]">Engagement Score</th>
              <th className="py-4 px-4 hidden md:table-cell w-[250px]">Core Pain Point</th>
              <th className="py-4 px-4 hidden lg:table-cell w-[200px]">Topic Category</th>
              <th className="py-4 px-4 hidden sm:table-cell w-[110px]">Detected</th>
              <th className="py-4 px-4 text-center w-[120px]">Actions</th>
              <th className="py-4 px-4 text-center w-14">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {signals.map((signal) => (
              <tr
                key={signal.id}
                onClick={() => onSelectSignal(signal)}
                className="group cursor-pointer hover:bg-zinc-50/60 transition-colors"
              >
                {/* Source column */}
                <td className="py-4.5 px-4 sm:px-6 font-semibold whitespace-nowrap">
                  {getSourceIcon(signal.source)}
                </td>
                
                {/* Title and metadata details */}
                <td className="py-4.5 px-4">
                  <div className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {signal.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="rounded bg-zinc-50 px-1.5 py-0.5 border border-zinc-200/50 font-mono font-medium">
                      #{signal.id}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-zinc-300"></span>
                    {signal.status === 'approved' ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 border border-emerald-200/50 text-emerald-700 font-bold uppercase tracking-wider text-[9px] select-none">
                        Approved
                      </span>
                    ) : (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 border border-indigo-200/50 text-indigo-700 font-bold uppercase tracking-wider text-[9px] select-none">
                        New
                      </span>
                    )}
                    <span className="h-1 w-1 rounded-full bg-zinc-300"></span>
                    <span className="truncate max-w-[150px]">{signal.target_audience}</span>
                  </div>
                </td>
                
                {/* Viral Score widget */}
                <td className="py-4.5 px-4">
                  {getViralScoreWidget(signal.viral_score)}
                </td>
                
                {/* Pain Point truncate */}
                <td className="py-4.5 px-4 text-zinc-500 hidden md:table-cell w-[250px] max-w-[250px]">
                  <p className="truncate font-medium">{signal.pain_point}</p>
                </td>
                
                {/* Topic badge */}
                <td className="py-4.5 px-4 text-zinc-600 hidden lg:table-cell w-[200px] max-w-[200px]">
                  <div className="flex items-center gap-1.5 text-zinc-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                    <span className="font-bold text-zinc-700 truncate">{signal.topic}</span>
                  </div>
                </td>
                
                {/* Created At */}
                <td className="py-4.5 px-4 text-zinc-400 hidden sm:table-cell whitespace-nowrap font-mono text-[10px]">
                  {signal.created_at
                    ? new Date(signal.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </td>
                
                {/* Actions column */}
                <td className="py-4.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center justify-center gap-1.5">
                    {isReview ? (
                      <div className="relative inline-block text-left">
                        {pendingActionId === signal.id ? (
                          <div className="flex h-7 items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 animate-pulse select-none">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Sending...</span>
                          </div>
                        ) : (
                          <select
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (!val) return;
                              await handleRewrite(signal, val);
                              e.target.value = ''; // Reset select
                            }}
                            className="rounded-xl border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm cursor-pointer outline-none select-none appearance-none pr-7 relative"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%234F46E5' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.25rem',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <option value="">Rewrite...</option>
                            <option value="X.com">X.com</option>
                            <option value="Threads">Threads</option>
                            <option value="Instagram">Instagram</option>
                            <option value="LinkedIn">LinkedIn</option>
                          </select>
                        )}
                      </div>
                    ) : (
                      <>
                        {signal.status !== 'approved' ? (
                          <button
                            onClick={() => handleStatusChange(signal.id!, 'approved')}
                            disabled={pendingActionId === signal.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all bg-white shadow-sm cursor-pointer disabled:opacity-50"
                            title="Approve Signal"
                          >
                            {pendingActionId === signal.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center text-emerald-600" title="Approved">
                            <Check className="h-4 w-4 stroke-[3px]" />
                          </div>
                        )}

                        <button
                          onClick={() => handleStatusChange(signal.id!, 'hidden')}
                          disabled={pendingActionId === signal.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-700 transition-all bg-white hover:bg-zinc-50 shadow-sm cursor-pointer disabled:opacity-50"
                          title="Hide Signal"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(signal.id!)}
                          disabled={pendingActionId === signal.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all bg-white shadow-sm cursor-pointer disabled:opacity-50"
                          title="Delete Signal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                
                {/* External link action */}
                <td className="py-4.5 px-4 text-center">
                  <a
                    href={formatUrl(signal.url, signal.source)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()} // Prevent open drawer
                    className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-700 transition-all bg-white hover:bg-zinc-50 shadow-sm"
                    title="Inspect Source Link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 text-xs">
        <span className="text-zinc-400 font-medium">
          Showing <span className="font-bold text-zinc-700">{startRecord}</span> to{' '}
          <span className="font-bold text-zinc-700">{endRecord}</span> of{' '}
          <span className="font-bold text-zinc-700">{totalCount}</span> signals
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-8 items-center gap-0.5 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-600 transition-all hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </button>
          
          <div className="hidden items-center gap-1 sm:flex">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  currentPage === p
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-8 items-center gap-0.5 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-600 transition-all hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-sm"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

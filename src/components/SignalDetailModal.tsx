'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, ExternalLink, Sparkles, AlertCircle, RefreshCw, Users, 
  FileText, Calendar, Tag, Hash, Link2, Copy, Check, EyeOff, Trash2, Loader2
} from 'lucide-react';
import { RawContent, updateSignalStatus, deleteSignal, sendRewriteWebhook } from '@/app/actions';
import { formatUrl } from '@/lib/utils';

interface SignalDetailModalProps {
  signal: RawContent | null;
  onClose: () => void;
  isReview?: boolean;
}

export default function SignalDetailModal({ signal, onClose, isReview = false }: SignalDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview');
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStatusChange = async (status: 'approved' | 'hidden') => {
    if (!signal?.id) return;
    setIsPending(true);
    const res = await updateSignalStatus(signal.id, status);
    setIsPending(false);
    if (res.success) {
      if (status === 'hidden') {
        onClose();
      }
      router.refresh();
    } else {
      alert('Failed to update status: ' + res.error);
    }
  };

  const handleDelete = async () => {
    if (!signal?.id) return;
    if (confirm('Are you sure you want to delete this signal from the database?')) {
      setIsPending(true);
      const res = await deleteSignal(signal.id);
      setIsPending(false);
      if (res.success) {
        onClose();
        router.refresh();
      } else {
        alert('Failed to delete signal: ' + res.error);
      }
    }
  };

  const handleRewriteClick = async (platform: string) => {
    if (!signal) return;
    setIsPending(true);
    setErrorMessage(null);
    const res = await sendRewriteWebhook(signal, platform);
    setIsPending(false);
    if (res.success) {
      router.refresh();
    } else {
      setErrorMessage(`Failed to send to n8n: ${res.error}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (signal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Reset tab and copy state when opening new signal
      setActiveTab('overview');
      setCopied(false);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [signal, onClose]);

  if (!signal) return null;

  const handleCopyHook = async () => {
    if (!signal.rewrite_angle) return;
    try {
      await navigator.clipboard.writeText(signal.rewrite_angle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const getSourceBadge = (source: string) => {
    const src = source.toLowerCase();
    if (src === 'reddit') return <span className="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">Reddit Feed</span>;
    if (src === 'linkedin') return <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">LinkedIn Feed</span>;
    return <span className="inline-flex rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700">{source}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Sleek Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Side-over panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 overflow-hidden">
        
        {/* Header Toolbar */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-900 block leading-none">Signal Profile</span>
              <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">#{signal.id}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={formatUrl(signal.url, signal.source)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm"
            >
              <span>Source URL</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button 
              onClick={onClose}
              className="rounded-xl border border-zinc-200 p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all bg-white shadow-sm"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Modern Segmented Control */}
        <div className="px-6 border-b border-zinc-100 bg-zinc-50/20 py-2">
          <div className="flex rounded-xl bg-zinc-100 p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
                activeTab === 'ai'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              AI Intelligence
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Title header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getSourceBadge(signal.source)}
              {signal.status === 'approved' ? (
                <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/50 uppercase tracking-wider">
                  Approved
                </span>
              ) : (
                <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/50 uppercase tracking-wider">
                  New
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-medium">Engagement: {signal.viral_score}%</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 leading-snug">
              {signal.title}
            </h2>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Captured Content */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span>Captured raw post text</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-600 whitespace-pre-wrap">
                  {signal.content}
                </p>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-200 p-4 bg-white shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Target Audience</span>
                  <p className="text-xs font-semibold text-zinc-800 leading-normal">{signal.target_audience}</p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4 bg-white shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Topic Group</span>
                  <p className="text-xs font-semibold text-zinc-800 leading-normal">{signal.topic}</p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium px-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Detected on {new Date(signal.created_at || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          )}

          {/* TAB 2: AI INTELLIGENCE */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              
              {/* Pain Point block */}
              <div className="rounded-2xl border border-zinc-200 p-5 bg-white shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span>Core Customer Pain Point</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                  {signal.pain_point}
                </p>
              </div>

              {/* Emotional Trigger block */}
              <div className="rounded-2xl border border-zinc-200 p-5 bg-white shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Emotional Trigger</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                  {signal.emotional_trigger}
                </p>
              </div>

              {/* AI Rewrite Angle - Copilot Highlight Card */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>AI Copywriting Angle</span>
                  </div>
                  
                  {/* Interactive Copy Button */}
                  <button
                    onClick={handleCopyHook}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Hook</span>
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-xs font-semibold text-indigo-900 leading-relaxed whitespace-pre-wrap">
                  "{signal.rewrite_angle}"
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="border-t border-zinc-200 p-6 bg-zinc-50/30 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-600 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 font-bold text-sm">×</button>
            </div>
          )}

          {isReview ? (
            /* Rewrite Agent actions for Review Page */
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Send to AI Rewrite Agent (n8n)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRewriteClick('X.com')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                    signal.sent_platforms?.includes('X.com')
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                      : 'border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700'
                  }`}
                >
                  {signal.sent_platforms?.includes('X.com') ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" />
                      <span>✓ X.com (Sent)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>X.com</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRewriteClick('Threads')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                    signal.sent_platforms?.includes('Threads')
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                      : 'border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700'
                  }`}
                >
                  {signal.sent_platforms?.includes('Threads') ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" />
                      <span>✓ Threads (Sent)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Threads</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRewriteClick('Instagram')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                    signal.sent_platforms?.includes('Instagram')
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                      : 'border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-pink-300 text-zinc-700 hover:text-pink-600'
                  }`}
                >
                  {signal.sent_platforms?.includes('Instagram') ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" />
                      <span>✓ Insta (Sent)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Instagram</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRewriteClick('LinkedIn')}
                  disabled={isPending}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                    signal.sent_platforms?.includes('LinkedIn')
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50'
                      : 'border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-blue-300 text-zinc-700 hover:text-blue-600'
                  }`}
                >
                  {signal.sent_platforms?.includes('LinkedIn') ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" />
                      <span>✓ LinkedIn (Sent)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      <span>LinkedIn</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Status Mutation Actions for normal Feed Page */
            <div className="grid grid-cols-3 gap-2">
              {signal.status !== 'approved' ? (
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Approve</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 py-2.5 text-xs font-bold select-none">
                  <Check className="h-3.5 w-3.5 stroke-[3px]" />
                  <span>Approved</span>
                </div>
              )}

              <button
                onClick={() => handleStatusChange('hidden')}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>Hide</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}

          <a
            href={formatUrl(signal.url, signal.source)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-500/10 focus:outline-none"
          >
            <span>Open Original Signal Thread</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}

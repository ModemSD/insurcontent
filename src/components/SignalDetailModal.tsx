'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, ExternalLink, Sparkles, AlertCircle, RefreshCw, Users, 
  FileText, Calendar, Tag, Hash, Link2, Copy, Check 
} from 'lucide-react';
import { RawContent } from '@/app/actions';

interface SignalDetailModalProps {
  signal: RawContent | null;
  onClose: () => void;
}

export default function SignalDetailModal({ signal, onClose }: SignalDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview');
  const [copied, setCopied] = useState(false);

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
              href={signal.url}
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
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Engagement: {signal.viral_score}%</span>
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
        <div className="border-t border-zinc-200 p-6 bg-zinc-50/30">
          <a
            href={signal.url}
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

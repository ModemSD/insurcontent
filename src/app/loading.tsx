import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-zinc-800 select-none animate-pulse">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur-md">
        <div className="w-full px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Left: Branding */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-zinc-950 uppercase">
                  Insurvoice
                </span>
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 font-mono">
                  v1.4
                </span>
              </div>
              <span className="h-4 w-[1px] bg-zinc-200" />
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/80 animate-ping" />
                <div className="h-3 w-16 rounded bg-zinc-200" />
              </div>
            </div>

            {/* Center: Compact Stats Ticker Skeleton */}
            <div className="hidden lg:flex items-center gap-4 rounded-full border border-zinc-200/80 bg-zinc-50/50 px-4 py-1.5">
              <div className="h-3 w-12 rounded bg-zinc-200" />
              <span className="h-2.5 w-[1px] bg-zinc-200" />
              <div className="h-3 w-14 rounded bg-zinc-200" />
              <span className="h-2.5 w-[1px] bg-zinc-200" />
              <div className="h-3 w-14 rounded bg-zinc-200" />
              <span className="h-2.5 w-[1px] bg-zinc-200" />
              <div className="h-3 w-16 rounded bg-zinc-200" />
            </div>

            {/* Right: AI Agent Status Skeleton */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Загрузка данных...</span>
              </div>
              <span className="h-4 w-[1px] bg-zinc-200" />
              <div className="h-7 w-7 rounded-lg bg-zinc-200" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Content Skeleton */}
      <main className="w-full flex-1 px-6 py-6 space-y-6">
        {/* Title Skeleton */}
        <div className="flex flex-col gap-1 border-b border-zinc-200/60 pb-4">
          <div className="h-6 w-48 rounded bg-zinc-200" />
          <div className="h-3 w-80 rounded bg-zinc-100 mt-1" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="hidden lg:flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-zinc-100" />
              <div className="h-5 w-8 rounded bg-zinc-200" />
            </div>
          ))}
        </div>

        {/* Filter Bar / Controls Skeleton */}
        <div className="h-12 rounded-2xl border border-zinc-200 bg-white p-3 flex items-center justify-between shadow-sm">
          <div className="h-6 w-32 rounded bg-zinc-200" />
          <div className="h-6 w-48 rounded bg-zinc-100" />
        </div>

        {/* Main Content Card Skeleton */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="h-10 bg-zinc-50 border-b border-zinc-100" />
          <div className="divide-y divide-zinc-100 p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="h-4.5 w-1/4 rounded bg-zinc-200" />
                  <div className="h-4.5 w-20 rounded bg-zinc-100" />
                </div>
                <div className="h-3.5 w-full rounded bg-zinc-100" />
                <div className="h-3.5 w-5/6 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="border-t border-zinc-200 bg-white py-5 mt-10">
        <div className="mx-auto w-full px-6 flex justify-center">
          <div className="h-3 w-48 rounded bg-zinc-100" />
        </div>
      </footer>
    </div>
  );
}

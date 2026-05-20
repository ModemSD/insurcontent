import React from 'react';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 animate-pulse">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-zinc-800" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-32 rounded bg-zinc-800" />
              <div className="h-2.5 w-16 rounded bg-zinc-900" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden h-7 w-28 rounded-full bg-zinc-900 sm:block" />
            <div className="h-6 w-20 rounded-full bg-zinc-900" />
          </div>
        </div>
      </header>

      {/* Main Workspace Content Skeleton */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Title Skeleton */}
        <div className="flex flex-col gap-2 border-l-2 border-zinc-800 pl-4">
          <div className="h-7 w-64 rounded bg-zinc-800" />
          <div className="h-4 w-96 rounded bg-zinc-900" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-zinc-800" />
                <div className="h-7 w-7 rounded-lg bg-zinc-950" />
              </div>
              <div className="h-7 w-12 rounded bg-zinc-800" />
              <div className="h-2.5 w-24 rounded bg-zinc-900" />
            </div>
          ))}
        </div>

        {/* Seeding Panel Skeleton */}
        <div className="h-20 rounded-xl border border-zinc-900 bg-zinc-900/10 p-5" />

        {/* Filter Bar Skeleton */}
        <div className="h-14 rounded-xl border border-zinc-900 bg-zinc-900/10 p-4" />

        {/* Table Skeleton */}
        <div className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/10">
          <div className="h-12 bg-zinc-950/80 border-b border-zinc-900" />
          <div className="divide-y divide-zinc-900">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-5 w-14 rounded bg-zinc-800" />
                  <div className="h-5 w-48 rounded bg-zinc-800" />
                </div>
                <div className="h-5 w-10 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6">
        <div className="mx-auto max-w-7xl px-4 flex justify-center sm:px-6 lg:px-8">
          <div className="h-3 w-40 rounded bg-zinc-900" />
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, Filter, ArrowUpDown, X, ListFilter, Sliders, 
  BarChart2, Database, Trash2, RefreshCcw 
} from 'lucide-react';
import { seedDemoData, clearAllData } from '@/app/actions';

interface FilterBarProps {
  showStats: boolean;
  onToggleStats: () => void;
}

export default function FilterBar({ showStats, onToggleStats }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMutating, startMutation] = useTransition();

  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

  const currentSource = searchParams.get('source') || 'all';
  const currentViralScore = searchParams.get('viral_score') || 'all';
  const currentSort = searchParams.get('sort') || 'newest';

  // Sync searchVal from URL search parameter if changed from outside (e.g. on Reset)
  const urlSearch = searchParams.get('search') || '';
  useEffect(() => {
    setSearchVal(urlSearch);
  }, [urlSearch]);

  // Debounce search input and update search params safely
  useEffect(() => {
    const currentUrlSearch = searchParams.get('search') || '';
    if (searchVal.trim() === currentUrlSearch.trim()) return;

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchVal.trim()) {
        params.set('search', searchVal.trim());
      } else {
        params.delete('search');
      }
      params.delete('page');

      startTransition(() => {
        router.replace(`/?${params.toString()}`);
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchVal, router]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');

    startTransition(() => {
      router.replace(`/?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setSearchVal('');
    startTransition(() => {
      router.replace('/');
    });
  };

  const handleDbAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>) => {
    startMutation(async () => {
      const res = await actionFn();
      if (!res.success) {
        alert(res.error || 'Operation failed');
      }
    });
  };

  const hasActiveFilters = 
    searchVal.trim() !== '' || 
    currentSource !== 'all' || 
    currentViralScore !== 'all' || 
    currentSort !== 'newest';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: View Mode, Filter Capsules */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600">
          <ListFilter className="h-3.5 w-3.5 text-indigo-600" />
          <span>Signals Feed</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Source Filter */}
          <div className="relative flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs hover:border-zinc-300 transition-all">
            <Filter className="h-3 w-3 text-zinc-400" />
            <select
              value={currentSource}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-600 outline-none border-none cursor-pointer pr-1"
            >
              <option value="all">All Sources</option>
              <option value="Reddit">Reddit</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Google">Google</option>
            </select>
          </div>

          {/* Engagement Score Filter */}
          <div className="relative flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs hover:border-zinc-300 transition-all">
            <Sliders className="h-3 w-3 text-zinc-400" />
            <select
              value={currentViralScore}
              onChange={(e) => handleFilterChange('viral_score', e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-600 outline-none border-none cursor-pointer pr-1"
            >
              <option value="all">All Scores</option>
              <option value="high">High (70+)</option>
              <option value="medium">Medium (40-70)</option>
              <option value="low">Low (0-40)</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="relative flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs hover:border-zinc-300 transition-all">
            <ArrowUpDown className="h-3 w-3 text-zinc-400" />
            <select
              value={currentSort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-600 outline-none border-none cursor-pointer pr-1"
            >
              <option value="newest">Newest First</option>
              <option value="viral_highest">Highest Viral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Right side: Search, Toggle Stats, DB Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:justify-end">
        {/* Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[180px]">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full rounded-full border border-zinc-200 bg-white py-1.5 pr-8 pl-9 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all"
          >
            Reset
          </button>
        )}

        <span className="h-4 w-[1px] bg-zinc-200 hidden sm:inline" />

        {/* Action: Toggle Analytics */}
        <button
          onClick={onToggleStats}
          className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all shadow-sm cursor-pointer ${
            showStats 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
          title="Toggle Analytics Panel"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Analytics</span>
        </button>

        {/* Database Quick Seed / Reset */}
        <div className="flex items-center gap-1 border-l border-zinc-200 pl-2.5">
          <button
            onClick={() => handleDbAction(seedDemoData)}
            disabled={isMutating}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 shadow-sm cursor-pointer disabled:opacity-50"
            title="Load Demo Signals"
          >
            {isMutating ? (
              <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            onClick={() => handleDbAction(clearAllData)}
            disabled={isMutating}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-sm cursor-pointer disabled:opacity-50"
            title="Clear Signals Database"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Loading spinners */}
      {(isPending || isMutating) && (
        <div className="fixed top-4 right-4 z-50 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
        </div>
      )}
    </div>
  );
}

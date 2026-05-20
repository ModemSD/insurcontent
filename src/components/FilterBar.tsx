'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, ArrowUpDown, X, ListFilter, Sliders } from 'lucide-react';

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

  const currentSource = searchParams.get('source') || 'all';
  const currentViralScore = searchParams.get('viral_score') || 'all';
  const currentSort = searchParams.get('sort') || 'newest';

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
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
  }, [searchVal, router, searchParams]);

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

  const hasActiveFilters = 
    searchVal.trim() !== '' || 
    currentSource !== 'all' || 
    currentViralScore !== 'all' || 
    currentSort !== 'newest';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between transition-all">
      <div className="flex flex-wrap items-center gap-2">
        {/* Active view indicator */}
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600">
          <ListFilter className="h-3.5 w-3.5 text-indigo-600" />
          <span>Active Pipeline</span>
        </div>

        {/* Filter Capsule Group */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Source Select Pill */}
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

          {/* Viral Score Pill */}
          <div className="relative flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs hover:border-zinc-300 transition-all">
            <Sliders className="h-3 w-3 text-zinc-400" />
            <select
              value={currentViralScore}
              onChange={(e) => handleFilterChange('viral_score', e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-600 outline-none border-none cursor-pointer pr-1"
            >
              <option value="all">All Scores</option>
              <option value="high">High Score (70+)</option>
              <option value="medium">Medium Score (40-70)</option>
              <option value="low">Low Score (0-40)</option>
            </select>
          </div>

          {/* Sort Pill */}
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

      {/* Right side - search bar */}
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="relative w-full max-w-[240px]">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search signals..."
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
            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 hover:border-zinc-300 transition-all"
          >
            Reset
          </button>
        )}
      </div>

      {/* Transition loading indicator */}
      {isPending && (
        <div className="fixed top-4 right-4 z-50 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
        </div>
      )}
    </div>
  );
}

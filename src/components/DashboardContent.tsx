'use client';

import React, { useState } from 'react';
import Header from './Header';
import StatsCards from './StatsCards';
import FilterBar from './FilterBar';
import SignalsTable from './SignalsTable';
import SignalDetailModal from './SignalDetailModal';
import SeedingPanel from './SeedingPanel';
import { RawContent, seedDemoData } from '@/app/actions';

interface DashboardContentProps {
  signals: RawContent[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  stats: {
    total: number;
    avgViralScore: number;
    reddit: number;
    linkedin: number;
    google: number;
  };
  isDbEmpty: boolean;
}

export default function DashboardContent({
  signals,
  totalCount,
  currentPage,
  pageSize,
  stats,
  isDbEmpty,
}: DashboardContentProps) {
  const [selectedSignal, setSelectedSignal] = useState<RawContent | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    await seedDemoData();
    setIsSeeding(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f7] text-zinc-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Navbar */}
      <Header />

      {/* Main Workspace Dashboard */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Page title and description */}
        <div className="flex flex-col gap-1 border-l-2 border-emerald-600 pl-4">
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
            Insurvoice Intelligence Dashboard
          </h1>
          <p className="text-xs text-zinc-500 max-w-3xl">
            Real-time insurance market intelligence pipeline. Scrapes and parses industry topics, customer pain points, emotional triggers, and copy angles.
          </p>
        </div>

        {/* 1. Statistics Cards */}
        <StatsCards stats={stats} />

        {/* 2. Utility seeding panel */}
        <SeedingPanel />

        {/* 3. Search & Filters Bar */}
        <FilterBar />

        {/* 4. Filterable Table & Pagination */}
        <SignalsTable
          signals={signals}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onSelectSignal={setSelectedSignal}
          isDbEmpty={isDbEmpty}
          onSeed={handleSeedData}
          isSeeding={isSeeding}
        />
      </main>

      {/* Side Slide-over Panel Details */}
      <SignalDetailModal
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />

      {/* Footer info */}
      <footer className="border-t border-zinc-200 bg-white py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 text-center text-[11px] text-zinc-500 sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} Insurvoice Intelligence Inc. Designed as a clean spreadsheet view.
        </div>
      </footer>
    </div>
  );
}

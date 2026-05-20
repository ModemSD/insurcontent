'use client';

import React, { useState } from 'react';
import Header from './Header';
import StatsCards from './StatsCards';
import FilterBar from './FilterBar';
import SignalsTable from './SignalsTable';
import SignalDetailModal from './SignalDetailModal';
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
  const [showStats, setShowStats] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    await seedDemoData();
    setIsSeeding(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-zinc-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Navbar with compact stats ticker */}
      <Header stats={stats} />

      {/* Main Workspace Dashboard - fluid full-width layout */}
      <main className="w-full flex-1 px-6 py-6 space-y-5">
        
        {/* Page header and title block */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Insurvoice Intelligence Dashboard
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              Real-time monitoring of insurance market signals, patient and customer pain points, and copy ideas.
            </p>
          </div>
        </div>

        {/* 1. Statistics Cards - Collapsible section */}
        {showStats && (
          <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
            <StatsCards stats={stats} />
          </div>
        )}

        {/* 2. Unified Search & Filters Toolbar */}
        <FilterBar 
          showStats={showStats}
          onToggleStats={() => setShowStats(!showStats)}
        />

        {/* 3. Filterable Table & Pagination */}
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
      <footer className="border-t border-zinc-200 bg-white py-5 mt-10">
        <div className="mx-auto w-full px-6 text-center text-[10px] text-zinc-400 font-medium">
          &copy; {new Date().getFullYear()} Insurvoice Intelligence. Premium Data Workspace.
        </div>
      </footer>
    </div>
  );
}

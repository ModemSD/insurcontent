import React from 'react';
import { supabase } from '@/lib/supabase';
import DashboardContent from '@/components/DashboardContent';
import { normalizeScore } from '@/lib/utils';

export const revalidate = 0; // Disable server caching to ensure real-time updates

interface PageProps {
  searchParams: Promise<{
    search?: string;
    source?: string;
    viral_score?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function OnReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch Stats for Approved Signals
  const { data: allStatsData, error: statsError } = await supabase
    .from('raw_content')
    .select('source, viral_score')
    .eq('status', 'approved');

  if (statsError) {
    console.error('Error fetching statistics for review:', statsError.message);
  }

  const total = allStatsData?.length || 0;
  const avgViralScore = total > 0
    ? allStatsData!.reduce((sum, item) => sum + normalizeScore(item.viral_score), 0) / total
    : 0;
  const reddit = allStatsData?.filter(item => item.source.toLowerCase() === 'reddit').length || 0;
  const linkedin = allStatsData?.filter(item => item.source.toLowerCase() === 'linkedin').length || 0;
  const google = allStatsData?.filter(item => item.source.toLowerCase() === 'google').length || 0;

  const stats = { total, avgViralScore, reddit, linkedin, google };
  const isDbEmpty = total === 0;

  // 2. Parse query filters
  const search = params.search || '';
  const source = params.source || 'all';
  const viralScore = params.viral_score || 'all';
  const sort = params.sort || 'newest';
  const page = parseInt(params.page || '1', 10);
  const pageSize = 25; // Standard convenient page size

  // Fetch all signals matching the basic status query
  const { data: signals, error: queryError } = await supabase
    .from('raw_content')
    .select('*')
    .eq('status', 'approved');

  if (queryError) {
    console.error('Error fetching review signals:', queryError.message);
  }

  // Normalize scores on all retrieved signals
  let filtered = (signals || []).map(item => ({
    ...item,
    viral_score: normalizeScore(item.viral_score)
  }));

  // Text search (matches title, content, topic, or pain point)
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(item =>
      (item.title || '').toLowerCase().includes(s) ||
      (item.content || '').toLowerCase().includes(s) ||
      (item.topic || '').toLowerCase().includes(s) ||
      (item.pain_point || '').toLowerCase().includes(s)
    );
  }

  // Source filtering
  if (source && source !== 'all') {
    filtered = filtered.filter(item => (item.source || '').toLowerCase() === source.toLowerCase());
  }

  // Viral Score filtering
  if (viralScore && viralScore !== 'all') {
    if (viralScore === 'high') {
      filtered = filtered.filter(item => item.viral_score >= 70);
    } else if (viralScore === 'medium') {
      filtered = filtered.filter(item => item.viral_score >= 40 && item.viral_score < 70);
    } else if (viralScore === 'low') {
      filtered = filtered.filter(item => item.viral_score < 40);
    }
  }

  // Sorting
  if (sort === 'viral_highest') {
    filtered.sort((a, b) => b.viral_score - a.viral_score);
  } else {
    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  // Pagination (range is inclusive: e.g. 0-24, 25-49)
  const count = filtered.length;
  const from = (page - 1) * pageSize;
  const paginated = filtered.slice(from, from + pageSize);

  const safeSignals = paginated;
  const safeCount = count;

  return (
    <DashboardContent
      signals={safeSignals}
      totalCount={safeCount}
      currentPage={page}
      pageSize={pageSize}
      stats={stats}
      isDbEmpty={isDbEmpty}
      isReview={true}
    />
  );
}


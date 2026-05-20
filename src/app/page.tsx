import React from 'react';
import { supabase } from '@/lib/supabase';
import DashboardContent from '@/components/DashboardContent';

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

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch Stats & Check if DB is Empty
  const { data: allStatsData, error: statsError } = await supabase
    .from('raw_content')
    .select('source, viral_score');

  if (statsError) {
    console.error('Error fetching statistics:', statsError.message);
  }

  const total = allStatsData?.length || 0;
  const avgViralScore = total > 0
    ? allStatsData!.reduce((sum, item) => sum + item.viral_score, 0) / total
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
  const pageSize = 25; // Standard convenient page size for data feed views

  let dbQuery = supabase
    .from('raw_content')
    .select('*', { count: 'exact' });

  // Text search (matches title, content, topic, or pain point)
  if (search) {
    dbQuery = dbQuery.or(
      `title.ilike.%${search}%,content.ilike.%${search}%,topic.ilike.%${search}%,pain_point.ilike.%${search}%`
    );
  }

  // Source filtering (case-insensitive to match both capitalized and lowercase sources)
  if (source && source !== 'all') {
    dbQuery = dbQuery.ilike('source', source);
  }

  // Viral Score filtering
  if (viralScore && viralScore !== 'all') {
    if (viralScore === 'high') {
      dbQuery = dbQuery.gte('viral_score', 70);
    } else if (viralScore === 'medium') {
      dbQuery = dbQuery.gte('viral_score', 40).lt('viral_score', 70);
    } else if (viralScore === 'low') {
      dbQuery = dbQuery.lt('viral_score', 40);
    }
  }

  // Sorting
  if (sort === 'viral_highest') {
    dbQuery = dbQuery.order('viral_score', { ascending: false });
  } else {
    // default: newest
    dbQuery = dbQuery.order('created_at', { ascending: false });
  }

  // Pagination (range is inclusive: e.g. 0-4, 5-9)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dbQuery = dbQuery.range(from, to);

  const { data: signals, count, error: queryError } = await dbQuery;

  if (queryError) {
    console.error('Error fetching signals:', queryError.message);
  }

  const safeSignals = signals || [];
  const safeCount = count || 0;

  return (
    <DashboardContent
      signals={safeSignals}
      totalCount={safeCount}
      currentPage={page}
      pageSize={pageSize}
      stats={stats}
      isDbEmpty={isDbEmpty}
    />
  );
}

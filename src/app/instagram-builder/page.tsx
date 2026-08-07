import React from 'react';
import Header from '@/components/Header';
import InstagramBuilder from '@/components/InstagramBuilder';
import { supabase } from '@/lib/supabase';
import { normalizeScore } from '@/lib/utils';
import { Instagram } from 'lucide-react';

export const revalidate = 0; // Ensure fresh stats data on navigation

export default async function InstagramBuilderPage() {
  let stats = { total: 0, avgViralScore: 0, reddit: 0, linkedin: 0, google: 0 };

  try {
    const { data } = await supabase
      .from('raw_content')
      .select('source, viral_score')
      .or('status.eq.new,status.eq.approved,status.is.null');

    if (data) {
      const total = data.length;
      const avgViralScore = total > 0 ? data.reduce((sum, item) => sum + normalizeScore(item.viral_score), 0) / total : 0;
      const reddit = data.filter(item => item.source.toLowerCase() === 'reddit').length;
      const linkedin = data.filter(item => item.source.toLowerCase() === 'linkedin').length;
      const google = data.filter(item => item.source.toLowerCase() === 'google').length;
      stats = { total, avgViralScore, reddit, linkedin, google };
    }
  } catch (err) {
    console.error('Failed to fetch stats for Instagram Builder:', err);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1110] text-zinc-100 selection:bg-emerald-900 selection:text-emerald-100 font-sans">
      {/* Workspace Header */}
      <Header stats={stats} title="Instagram Post & Carousel Builder" />

      <main className="w-full flex-1 px-6 py-6 space-y-6">
        {/* Page Title Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Instagram className="h-5 w-5 text-emerald-400" />
              <span>Instagram 4:5 Visual Creator</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Конструктор постов и каруселей формата 4:5 с высокой конверсией. Оформляйте обложки, слайды и скачивайте готовый визуал в 1080&times;1350 px.
            </p>
          </div>
        </div>

        {/* Builder Component */}
        <InstagramBuilder />
      </main>
    </div>
  );
}

import React from 'react';
import { Database, Zap, MessageSquare, Linkedin, Search, ArrowUpRight } from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    avgViralScore: number;
    reddit: number;
    linkedin: number;
    google: number;
  };
  isLoading?: boolean;
}

export default function StatsCards({ stats, isLoading = false }: StatsProps) {
  const totalSignals = stats.total || 1;
  
  // Calculate distributions for visual progress bars
  const redditPct = Math.round((stats.reddit / totalSignals) * 100) || 0;
  const linkedinPct = Math.round((stats.linkedin / totalSignals) * 100) || 0;
  const googlePct = Math.round((stats.google / totalSignals) * 100) || 0;

  const items = [
    {
      name: 'Ingested Signals',
      value: isLoading ? '...' : stats.total.toLocaleString(),
      subtext: 'Database capacity: 10k max',
      icon: Database,
      badge: 'Live',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      colorClass: 'text-zinc-600',
      progress: 100,
      progressBarClass: 'bg-indigo-600',
    },
    {
      name: 'Avg Viral Score',
      value: isLoading ? '...' : `${Math.round(stats.avgViralScore)}%`,
      subtext: 'Engagement benchmark: 45%',
      icon: Zap,
      badge: stats.avgViralScore >= 50 ? 'Strong' : 'Average',
      badgeClass: stats.avgViralScore >= 50 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100',
      colorClass: 'text-indigo-600',
      progress: stats.avgViralScore,
      progressBarClass: 'bg-indigo-600',
    },
    {
      name: 'Reddit Feed',
      value: isLoading ? '...' : stats.reddit.toLocaleString(),
      subtext: `${redditPct}% of total stream`,
      icon: MessageSquare,
      badge: '+4 new',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-100',
      colorClass: 'text-orange-600',
      progress: redditPct,
      progressBarClass: 'bg-orange-500',
    },
    {
      name: 'LinkedIn Stream',
      value: isLoading ? '...' : stats.linkedin.toLocaleString(),
      subtext: `${linkedinPct}% of total stream`,
      icon: Linkedin,
      badge: 'Optimal',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-100',
      colorClass: 'text-blue-600',
      progress: linkedinPct,
      progressBarClass: 'bg-blue-500',
    },
    {
      name: 'Google News Search',
      value: isLoading ? '...' : stats.google.toLocaleString(),
      subtext: `${googlePct}% of total stream`,
      icon: Search,
      badge: 'Active',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      colorClass: 'text-cyan-600',
      progress: googlePct,
      progressBarClass: 'bg-cyan-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* Upper row: Label & Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{item.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.badgeClass}`}>
                {item.badge}
              </span>
            </div>

            {/* Middle row: Number & Icon */}
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-900 group-hover:text-indigo-600 transition-colors">
                {item.value}
              </span>
              <div className={`rounded-xl bg-zinc-50 p-2 group-hover:bg-indigo-50 transition-colors`}>
                <Icon className={`h-4.5 w-4.5 ${item.colorClass}`} />
              </div>
            </div>

            {/* Bottom row: Subtext & Progress bar */}
            <div className="mt-4 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.progressBarClass}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                <span>{item.subtext}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-indigo-600">
                  Inspect <ArrowUpRight className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

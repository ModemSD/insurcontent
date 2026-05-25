import React from 'react';
import { 
  Database, Zap, MessageSquare, Linkedin, Search, 
  Sparkles, Layers, ShieldCheck 
} from 'lucide-react';

interface HeaderProps {
  stats: {
    total: number;
    avgViralScore: number;
    reddit: number;
    linkedin: number;
    google: number;
  };
  title?: string;
}

export default function Header({ stats, title = 'Signals Feed' }: HeaderProps) {
  // Calculate percentages
  const total = stats.total || 0;
  const avgScore = Math.round(stats.avgViralScore) || 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur-md">
      <div className="w-full px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          
          {/* Left: Branding & Navigation Tab */}
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
            
            <div className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              <span className="text-xs font-bold text-zinc-900">{title}</span>
            </div>
          </div>

          {/* Center: Compact Stats Ticker (Linear-style Status bar) */}
          <div className="hidden lg:flex items-center gap-5 rounded-full border border-zinc-200/80 bg-zinc-50/50 px-4 py-1.5 text-[10px] font-bold text-zinc-500">
            {/* Total */}
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3 text-zinc-400" />
              <span>Total: <strong className="text-zinc-800">{total}</strong></span>
            </div>
            <span className="h-2.5 w-[1px] bg-zinc-200" />

            {/* Reddit */}
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
              <MessageSquare className="h-3 w-3 text-orange-500/70" />
              <span>Reddit: <strong className="text-zinc-800">{stats.reddit}</strong></span>
            </div>
            <span className="h-2.5 w-[1px] bg-zinc-200" />

            {/* LinkedIn */}
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              <Linkedin className="h-3 w-3 text-blue-500/70" />
              <span>LinkedIn: <strong className="text-zinc-800">{stats.linkedin}</strong></span>
            </div>
            <span className="h-2.5 w-[1px] bg-zinc-200" />

            {/* Google */}
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
              <Search className="h-3 w-3 text-cyan-500/70" />
              <span>Google: <strong className="text-zinc-800">{stats.google}</strong></span>
            </div>
            <span className="h-2.5 w-[1px] bg-zinc-200" />

            {/* Avg Engagement */}
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-indigo-500" />
              <span>Avg Viral: <strong className="text-indigo-600">{avgScore}%</strong></span>
            </div>
          </div>

          {/* Right: AI Agent Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>AI Core: Operational</span>
            </div>
            
            <span className="h-4 w-[1px] bg-zinc-200" />
            
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white font-extrabold text-[10px]">
              AI
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

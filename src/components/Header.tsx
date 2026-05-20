import React from 'react';
import { Sparkles, Cpu, Settings, Activity, Layers, HelpCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left section - Branding */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                <Cpu className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-zinc-900 block">
                  Insurvoice
                </span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block -mt-0.5">
                  Intelligence Core
                </span>
              </div>
            </div>

            {/* Separator */}
            <span className="h-5 w-[1px] bg-zinc-200 hidden md:block" />

            {/* Tab navigation - Linear Style */}
            <nav className="hidden md:flex items-center gap-1">
              <button className="flex items-center gap-1.5 rounded-lg bg-zinc-100/80 px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-all">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <span>Signals Feed</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all">
                <Activity className="h-3.5 w-3.5 text-zinc-400" />
                <span>Pipeline Analytics</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all">
                <Settings className="h-3.5 w-3.5 text-zinc-400" />
                <span>Engine Settings</span>
              </button>
            </nav>
          </div>

          {/* Right section - Status & Profile */}
          <div className="flex items-center gap-4">
            {/* AI Status Badge */}
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/50 px-3 py-1 text-xs font-medium text-emerald-800 lg:flex">
              <Sparkles className="h-3 w-3 text-emerald-600 animate-pulse" />
              <span>AI Agent: Listening</span>
            </div>

            {/* User profile / Actions */}
            <div className="flex items-center gap-3">
              <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
              <span className="h-4 w-[1px] bg-zinc-200" />
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold text-xs shadow-sm cursor-pointer hover:bg-zinc-800 transition-colors">
                AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Inbox, CheckSquare, ChevronLeft, ChevronRight, SendHorizontal, BarChart3
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Feed',
      href: '/',
      icon: Inbox,
    },
    {
      name: 'On Review',
      href: '/on-review',
      icon: CheckSquare,
    },
    {
      name: 'Ready to Post',
      href: '/ready-to-post',
      icon: SendHorizontal,
    },
    {
      name: 'Statistics',
      href: '/statistics',
      icon: BarChart3,
    },
  ];

  return (
    <aside 
      className={`relative flex flex-col border-r border-zinc-200/80 bg-white transition-all duration-300 ease-in-out h-screen sticky top-0 z-50 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Branding */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-200/60">
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden animate-in fade-in duration-200">
            <span className="text-xs font-black tracking-wider text-zinc-950 uppercase whitespace-nowrap">
              Insurvoice
            </span>
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 font-mono">
              v1.4
            </span>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white font-black text-[11px] animate-in fade-in duration-200">
            IV
          </div>
        )}
      </div>

      {/* Sidebar Menu Items */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-105 ${collapsed ? 'mx-auto' : 'mr-3'}`} />
              {!collapsed && (
                <span className="truncate animate-in fade-in duration-200">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Toggle Collapse Button */}
      <div className="p-3 border-t border-zinc-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all shadow-sm cursor-pointer"
          title={collapsed ? 'Expand Menu' : 'Collapse Menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

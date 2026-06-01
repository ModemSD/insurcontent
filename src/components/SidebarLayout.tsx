'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress bar animation on route change
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Simulate progress bar movement during navigation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNavigating && progress < 90) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Decelerating progress increment
          const remaining = 90 - prev;
          const step = Math.max(remaining * 0.15, 1);
          return prev + step;
        });
      }, 120);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isNavigating, progress]);

  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc]">
      {/* Top Transition Progress Bar */}
      {isNavigating && (
        <div 
          className="fixed top-0 left-0 right-0 h-[3px] bg-indigo-600 z-[9999] shadow-[0_0_8px_rgba(79,70,229,0.7)]"
          style={{ 
            width: `${progress}%`, 
            transition: progress === 100 ? 'width 150ms ease-out' : 'width 300ms cubic-bezier(0.1, 0.8, 0.3, 1)' 
          }}
        />
      )}
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        onNavigateStart={() => {
          setIsNavigating(true);
          setProgress(5);
        }} 
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}

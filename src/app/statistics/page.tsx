'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { getPosts, Post, PlatformConfig } from '@/lib/postingStore';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Globe, 
  Calendar, 
  Linkedin, 
  Send, 
  Twitter, 
  ArrowUpRight, 
  Download, 
  Search, 
  Info,
  Award,
  Sparkles
} from 'lucide-react';

interface PublishedRow {
  postId: string;
  postTitle: string;
  platform: 'linkedin' | 'telegram' | 'twitter';
  text: string;
  publishedAt: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export default function StatisticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ total: 0, avgViralScore: 0, reddit: 0, linkedin: 0, google: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<'all' | 'linkedin' | 'telegram' | 'twitter'>('all');

  // Load posts & database stats
  useEffect(() => {
    setPosts(getPosts());

    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('raw_content')
          .select('source, viral_score')
          .or('status.eq.new,status.eq.approved,status.is.null');
        
        if (!error && data) {
          const total = data.length;
          const avgViralScore = total > 0 ? data.reduce((sum, item) => sum + item.viral_score, 0) / total : 0;
          const reddit = data.filter(item => item.source.toLowerCase() === 'reddit').length;
          const linkedin = data.filter(item => item.source.toLowerCase() === 'linkedin').length;
          const google = data.filter(item => item.source.toLowerCase() === 'google').length;
          setStats({ total, avgViralScore, reddit, linkedin, google });
        }
      } catch (err) {
        console.error('Failed to load database stats:', err);
      }
    }
    
    fetchStats();
  }, []);

  // Parse all published platforms across all posts
  const publishedItems: PublishedRow[] = [];
  posts.forEach(post => {
    (['linkedin', 'telegram', 'twitter'] as const).forEach(platform => {
      const cfg = post.platforms[platform];
      if (cfg.status === 'published' && cfg.publishedAt && cfg.metrics) {
        publishedItems.push({
          postId: post.id,
          postTitle: post.title,
          platform,
          text: cfg.text,
          publishedAt: cfg.publishedAt,
          metrics: cfg.metrics
        });
      }
    });
  });

  // Calculate Aggregates
  const totalViews = publishedItems.reduce((sum, item) => sum + item.metrics.views, 0);
  const totalLikes = publishedItems.reduce((sum, item) => sum + item.metrics.likes, 0);
  const totalComments = publishedItems.reduce((sum, item) => sum + item.metrics.comments, 0);
  const totalShares = publishedItems.reduce((sum, item) => sum + item.metrics.shares, 0);
  
  const totalEngagement = totalLikes + totalComments + totalShares;
  const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

  // Breakdown by platform
  const platformStats = {
    linkedin: { views: 0, engagement: 0, postsCount: 0 },
    telegram: { views: 0, engagement: 0, postsCount: 0 },
    twitter: { views: 0, engagement: 0, postsCount: 0 }
  };

  publishedItems.forEach(item => {
    platformStats[item.platform].views += item.metrics.views;
    platformStats[item.platform].engagement += (item.metrics.likes + item.metrics.comments + item.metrics.shares);
    platformStats[item.platform].postsCount += 1;
  });

  // Filter published rows based on search and platform filters
  const filteredItems = publishedItems.filter(item => {
    const matchesSearch = item.postTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatformFilter === 'all' || item.platform === selectedPlatformFilter;
    return matchesSearch && matchesPlatform;
  });

  // Sort by date published descending
  filteredItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-zinc-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <Header stats={stats} title="Статистика" />

      <main className="w-full flex-1 px-6 py-6 space-y-6">
        {/* Page Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200/60 pb-4 gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Аналитика и статистика постов
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              Сводная статистика вовлеченности по всем опубликованным материалам из социальных сетей.
            </p>
          </div>

          <button 
            onClick={() => alert('Экспорт статистики в CSV запущен...')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" />
            Экспорт данных
          </button>
        </div>

        {/* 1. KPI Aggregates Panel */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* views */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Просмотры</span>
              <div className="rounded-lg bg-indigo-50 p-1.5">
                <Eye className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-zinc-950 tracking-tight">{totalViews.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                <TrendingUp className="h-3 w-3" />
                +14.2% за неделю
              </p>
            </div>
          </div>

          {/* likes */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Реакции (Лайки)</span>
              <div className="rounded-lg bg-rose-50 p-1.5">
                <Heart className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-zinc-950 tracking-tight">{totalLikes.toLocaleString()}</h3>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
                <TrendingUp className="h-3 w-3" />
                +8.7% за неделю
              </p>
            </div>
          </div>

          {/* engagement */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Всего взаимодействий</span>
              <div className="rounded-lg bg-emerald-50 p-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-zinc-950 tracking-tight">{totalEngagement.toLocaleString()}</h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1">
                Лайки, комменты, репосты
              </p>
            </div>
          </div>

          {/* engagement rate */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Engagement Rate (ER)</span>
              <div className="rounded-lg bg-amber-50 p-1.5">
                <Award className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-zinc-950 tracking-tight">
                {avgEngagementRate.toFixed(2)}%
              </h3>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">
                Бенчмарк по отрасли: 4.5%
              </p>
            </div>
          </div>
        </div>

        {/* 2. Visual Analytics Section: Trends & Platform Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (SVG) */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Динамика просмотров за последние 7 дней
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                Агрегированные данные просмотров по LinkedIn, Telegram и Twitter.
              </p>
            </div>

            {/* SVG Sparkline Line Chart */}
            <div className="h-48 w-full mt-6 relative flex items-end">
              <svg viewBox="0 0 500 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="gradient-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Area path */}
                <path
                  d="M 0 130 Q 80 120 120 90 T 250 50 T 380 90 T 500 35 L 500 145 L 0 145 Z"
                  fill="url(#gradient-views)"
                />
                
                {/* Line path */}
                <path
                  d="M 0 130 Q 80 120 120 90 T 250 50 T 380 90 T 500 35"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Nodes */}
                <circle cx="120" cy="90" r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="250" cy="50" r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="380" cy="90" r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="500" cy="35" r="5" fill="#4f46e5" />
              </svg>
              
              {/* Tooltip Overlay */}
              <div className="absolute top-1/4 right-[5%] rounded-lg bg-zinc-950 text-white px-2 py-1 text-[9px] font-bold shadow-md pointer-events-none">
                Пик: {(totalViews * 0.45).toFixed(0)} просм.
              </div>
            </div>

            {/* X-Axis Legends */}
            <div className="flex items-center justify-between text-[9px] text-zinc-400 font-bold border-t border-zinc-100 pt-3 mt-4">
              <span>19 Мая</span>
              <span>20 Мая</span>
              <span>21 Мая</span>
              <span>22 Мая</span>
              <span>23 Мая</span>
              <span>24 Мая</span>
              <span>Сегодня</span>
            </div>
          </div>

          {/* Platform Performance breakdown */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Доля вовлеченности платформ
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                Сравнение просмотров и кликов по каналам дистрибуции.
              </p>
            </div>

            <div className="space-y-4 my-6">
              {/* LinkedIn bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn
                  </span>
                  <span className="text-zinc-500">
                    {platformStats.linkedin.views.toLocaleString()} просм. • ({platformStats.linkedin.postsCount} постов)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${totalViews > 0 ? (platformStats.linkedin.views / totalViews) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Telegram bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <Send className="h-3.5 w-3.5 text-sky-500" /> Telegram
                  </span>
                  <span className="text-zinc-500">
                    {platformStats.telegram.views.toLocaleString()} просм. • ({platformStats.telegram.postsCount} постов)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                    style={{ width: `${totalViews > 0 ? (platformStats.telegram.views / totalViews) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Twitter bar */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700">
                    <Twitter className="h-3.5 w-3.5 text-zinc-950" /> Twitter (X)
                  </span>
                  <span className="text-zinc-500">
                    {platformStats.twitter.views.toLocaleString()} просм. • ({platformStats.twitter.postsCount} постов)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div 
                    className="h-full bg-zinc-950 rounded-full transition-all duration-500" 
                    style={{ width: `${totalViews > 0 ? (platformStats.twitter.views / totalViews) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-3 text-[9px] font-bold text-zinc-500 flex items-start gap-1.5 border border-zinc-200/60 leading-relaxed">
              <Info className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>
                LinkedIn генерирует на 35% больше вовлеченности (ER) на один просмотр благодаря специфике B2B аудитории.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Published Posts Performance List */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Table Header Filter Toolbar */}
          <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Опубликованные материалы
            </h3>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Поиск постов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-[11px] font-semibold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-44"
                />
              </div>

              {/* Platform selector */}
              <select
                value={selectedPlatformFilter}
                onChange={(e) => setSelectedPlatformFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-zinc-200 bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Все соцсети</option>
                <option value="linkedin">LinkedIn</option>
                <option value="telegram">Telegram</option>
                <option value="twitter">Twitter (X)</option>
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="rounded-full bg-zinc-50 p-3 text-zinc-400">
                <Globe className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-zinc-950 mt-3">Нет опубликованных постов</h4>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-xs">
                Посты появятся здесь после того, как вы нажмете кнопку "Опубликовать" во вкладке готового контента.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    <th className="px-5 py-3.5">Тема / Пост</th>
                    <th className="px-5 py-3.5">Сеть</th>
                    <th className="px-5 py-3.5">Дата публикации</th>
                    <th className="px-5 py-3.5 text-right">Просмотры</th>
                    <th className="px-5 py-3.5 text-right">Лайки</th>
                    <th className="px-5 py-3.5 text-right">Комменты</th>
                    <th className="px-5 py-3.5 text-right">Репосты</th>
                    <th className="px-5 py-3.5 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                  {filteredItems.map((item, idx) => {
                    const PlatformIcon = {
                      linkedin: Linkedin,
                      telegram: Send,
                      twitter: Twitter
                    }[item.platform];

                    const platformColor = {
                      linkedin: 'text-blue-600',
                      telegram: 'text-sky-500',
                      twitter: 'text-zinc-900'
                    }[item.platform];

                    return (
                      <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="px-5 py-4 max-w-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-zinc-900 truncate" title={item.postTitle}>
                              {item.postTitle}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium line-clamp-1">
                              {item.text}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 font-bold ${platformColor}`}>
                            <PlatformIcon className="h-3.5 w-3.5" />
                            {item.platform === 'linkedin' ? 'LinkedIn' : item.platform === 'telegram' ? 'Telegram' : 'Twitter (X)'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-400 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.publishedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-zinc-900">
                          {item.metrics.views.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-rose-600 font-bold">
                          {item.metrics.likes.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-zinc-500 font-bold">
                          {item.metrics.comments.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-indigo-600 font-bold">
                          {item.metrics.shares.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => alert(`Детальный анализ поста "${item.postTitle}" загружается...`)}
                            className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer"
                          >
                            Детали <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-5 mt-10">
        <div className="mx-auto w-full px-6 text-center text-[10px] text-zinc-400 font-medium">
          &copy; {new Date().getFullYear()} Insurvoice Intelligence. Premium Data Workspace.
        </div>
      </footer>
    </div>
  );
}

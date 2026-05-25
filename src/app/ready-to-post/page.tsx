'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { 
  getPosts, 
  savePosts, 
  Post, 
  PlatformConfig,
  updatePostPlatform 
} from '@/lib/postingStore';
import { 
  Linkedin, 
  Send, 
  Twitter, 
  Check, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Play, 
  Image as ImageIcon, 
  Video, 
  ExternalLink, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export default function ReadyToPostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ total: 0, avgViralScore: 0, reddit: 0, linkedin: 0, google: 0 });
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Dynamic loading indicators
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [regeneratingText, setRegeneratingText] = useState<Record<string, boolean>>({});
  const [regeneratingMedia, setRegeneratingMedia] = useState<Record<string, boolean>>({});

  // 1. Initial Load of Posts and Database Statistics
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

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Helper to handle text editing
  const handleTextChange = (postId: string, platform: 'linkedin' | 'telegram' | 'twitter', val: string) => {
    const updated = updatePostPlatform(postId, platform, (cfg) => {
      // Also update current active index content in history
      const history = [...cfg.textHistory];
      history[cfg.activeTextIndex] = val;
      return { text: val, textHistory: history };
    });
    setPosts(updated);
  };

  // Action: Publish
  const handlePublish = async (postId: string, platform: 'linkedin' | 'telegram' | 'twitter') => {
    const key = `${postId}-${platform}`;
    setPublishing(prev => ({ ...prev, [key]: true }));
    
    // Set status to publishing
    let updated = updatePostPlatform(postId, platform, () => ({
      status: 'publishing',
      error: null
    }));
    setPosts(updated);

    // Simulate Network latency (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Determine outcome: if failed previously or randomly, succeed.
    // 85% success rate on clean runs
    const isSuccess = Math.random() > 0.15;
    
    updated = updatePostPlatform(postId, platform, (cfg) => {
      if (isSuccess) {
        return {
          status: 'published',
          publishedAt: new Date().toISOString(),
          error: null,
          metrics: {
            views: Math.floor(Math.random() * 2000) + 300,
            likes: Math.floor(Math.random() * 200) + 20,
            comments: Math.floor(Math.random() * 30) + 2,
            shares: Math.floor(Math.random() * 15) + 1
          }
        };
      } else {
        return {
          status: 'failed',
          publishedAt: null,
          error: 'Ошибка интеграции API (401): Токен авторизации канала истек или недействителен.'
        };
      }
    });

    setPosts(updated);
    setPublishing(prev => ({ ...prev, [key]: false }));
  };

  // Action: Regenerate Text
  const handleRegenerateText = async (postId: string, platform: 'linkedin' | 'telegram' | 'twitter') => {
    const key = `${postId}-${platform}`;
    setRegeneratingText(prev => ({ ...prev, [key]: true }));

    // Simulate AI LLM generation time (1.2 seconds)
    await new Promise(resolve => setTimeout(resolve, 1200));

    const updated = updatePostPlatform(postId, platform, (cfg) => {
      const nextIndex = (cfg.activeTextIndex + 1) % cfg.textHistory.length;
      return {
        activeTextIndex: nextIndex,
        text: cfg.textHistory[nextIndex]
      };
    });

    setPosts(updated);
    setRegeneratingText(prev => ({ ...prev, [key]: false }));
  };

  // Action: Switch Media (Image <-> Video)
  const handleToggleMediaType = (postId: string, platform: 'linkedin' | 'telegram' | 'twitter') => {
    const updated = updatePostPlatform(postId, platform, (cfg) => ({
      mediaType: cfg.mediaType === 'image' ? 'video' : 'image'
    }));
    setPosts(updated);
  };

  // Action: Regenerate Media
  const handleRegenerateMedia = async (postId: string, platform: 'linkedin' | 'telegram' | 'twitter') => {
    const key = `${postId}-${platform}`;
    setRegeneratingMedia(prev => ({ ...prev, [key]: true }));

    // Simulate AI Diffusion/Video generation pipeline (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Force a minor update to trigger cache bust/simulate new generation
    const updated = updatePostPlatform(postId, platform, (cfg) => {
      const timestamp = Date.now();
      if (cfg.mediaType === 'image') {
        const base = cfg.imageUrl.split('?')[0];
        return { imageUrl: `${base}?v=${timestamp}` };
      } else {
        const base = cfg.videoUrl.split('?')[0];
        return { videoUrl: `${base}?v=${timestamp}` };
      }
    });

    setPosts(updated);
    setRegeneratingMedia(prev => ({ ...prev, [key]: false }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-zinc-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <Header stats={stats} title="Готовый контент" />

      <main className="w-full flex-1 px-6 py-6 space-y-6">
        {/* Page title and description */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Готовый контент к постингу
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              Проверяйте сгенерированные тексты под каждую соцсеть, меняйте форматы медиа и запускайте публикации.
            </p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
            <div className="rounded-full bg-zinc-50 p-4 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-zinc-900">Инициализация контента...</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              Подождите, пока система подгрузит тестовые посты и интегрирует их с панелью управления.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                {/* Post Header Card */}
                <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-zinc-950 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      {post.title}
                    </h2>
                    <p className="text-[10px] text-zinc-400 font-medium mt-1">
                      Первоисточник сигнала: <span className="font-semibold text-zinc-500">{post.source}</span> (Виральность: {post.viralScore}%)
                    </p>
                  </div>
                  
                  <div className="rounded-lg bg-zinc-100/80 border border-zinc-200/60 px-3 py-1.5 max-w-xs md:max-w-md">
                    <p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider leading-none">Исходный инсайт</p>
                    <p className="text-[10px] text-zinc-500 font-semibold truncate mt-1" title={post.originalSignal}>
                      "{post.originalSignal}"
                    </p>
                  </div>
                </div>

                {/* Sub-list of platforms (Rows) */}
                <div className="divide-y divide-zinc-100">
                  {(['linkedin', 'telegram', 'twitter'] as const).map((platform) => {
                    const cfg = post.platforms[platform];
                    const rowKey = `${post.id}-${platform}`;
                    
                    // Style config per platform
                    const platformMeta = {
                      linkedin: {
                        name: 'LinkedIn',
                        icon: Linkedin,
                        color: 'bg-blue-600 text-white',
                        accentText: 'text-blue-600',
                        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-100'
                      },
                      telegram: {
                        name: 'Telegram',
                        icon: Send,
                        color: 'bg-sky-500 text-white',
                        accentText: 'text-sky-500',
                        badgeStyle: 'bg-sky-50 text-sky-700 border-sky-100'
                      },
                      twitter: {
                        name: 'Twitter (X)',
                        icon: Twitter,
                        color: 'bg-zinc-950 text-white',
                        accentText: 'text-zinc-900',
                        badgeStyle: 'bg-zinc-100 text-zinc-800 border-zinc-200'
                      }
                    }[platform];

                    const IconComponent = platformMeta.icon;

                    return (
                      <div key={platform} className="p-5 flex flex-col xl:flex-row gap-5 hover:bg-zinc-50/30 transition-colors">
                        
                        {/* 1. Platform Info Column */}
                        <div className="w-full xl:w-48 flex-shrink-0 flex xl:flex-col items-center xl:items-start justify-between xl:justify-start gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${platformMeta.color}`}>
                              <IconComponent className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-900">{platformMeta.name}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 inline-block ${platformMeta.badgeStyle}`}>
                                {platform === 'twitter' ? '280 символов' : platform === 'telegram' ? 'Канал' : 'Проф. сеть'}
                              </span>
                            </div>
                          </div>

                          {/* Dynamic Status Badge */}
                          <div className="xl:mt-4">
                            {cfg.status === 'draft' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
                                Черновик
                              </span>
                            )}
                            {cfg.status === 'publishing' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                Публикация...
                              </span>
                            )}
                            {cfg.status === 'published' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                <Check className="h-3 w-3 text-emerald-500" />
                                Опубликовано
                              </span>
                            )}
                            {cfg.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                                <AlertCircle className="h-3 w-3 text-rose-500" />
                                Ошибка
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Text Content & Editor Column */}
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Текст публикации (Вариант {cfg.activeTextIndex + 1} из {cfg.textHistory.length})
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleCopyText(cfg.text, rowKey)}
                                className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 transition-all cursor-pointer"
                                title="Копировать текст"
                              >
                                {copiedStates[rowKey] ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-500" />
                                    <span className="text-emerald-600">Скопировано!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Копировать</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={cfg.text}
                            onChange={(e) => handleTextChange(post.id, platform, e.target.value)}
                            disabled={cfg.status === 'publishing'}
                            className="w-full h-32 rounded-xl border border-zinc-200 px-4 py-3 text-xs leading-relaxed font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-zinc-50/50 disabled:text-zinc-500 resize-none"
                          />

                          {cfg.error && (
                            <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-[10px] font-bold text-rose-700 flex items-start gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
                              <span>{cfg.error}</span>
                            </div>
                          )}
                          
                          {cfg.status === 'published' && cfg.publishedAt && (
                            <div className="rounded-lg bg-emerald-50/40 border border-emerald-100 p-2.5 text-[10px] font-bold text-emerald-800 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                Опубликовано: {new Date(cfg.publishedAt).toLocaleTimeString()} ({new Date(cfg.publishedAt).toLocaleDateString()})
                              </span>
                              <a 
                                href="#" 
                                onClick={(e) => e.preventDefault()}
                                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                              >
                                Посмотреть пост <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* 3. Media Panel Column */}
                        <div className="w-full sm:w-64 xl:w-72 flex-shrink-0 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Медиа: {cfg.mediaType === 'image' ? 'Изображение' : 'Видео'}
                            </span>
                            <button
                              onClick={() => handleToggleMediaType(post.id, platform)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {cfg.mediaType === 'image' ? (
                                <>
                                  <Video className="h-3 w-3" />
                                  <span>Заменить на видео</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-3 w-3" />
                                  <span>Заменить на картинку</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Media Container */}
                          <div className="relative h-36 rounded-xl border border-zinc-200/80 bg-zinc-50 overflow-hidden flex items-center justify-center group">
                            {regeneratingMedia[rowKey] ? (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-1.5">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Генерация...</span>
                              </div>
                            ) : null}

                            {cfg.mediaType === 'image' ? (
                              <>
                                <img
                                  src={cfg.imageUrl}
                                  alt="Generated Post Visual"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute bottom-2 left-2 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
                                  PNG • 1024x1024
                                </div>
                              </>
                            ) : (
                              // Video Player Mockup
                              <div className="absolute inset-0 bg-zinc-950 flex flex-col justify-between p-3 text-white overflow-hidden">
                                {/* Simulated glowing soundwave representation */}
                                <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
                                
                                <div className="z-10 flex items-center justify-between w-full">
                                  <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                    AI VIDEO
                                  </span>
                                  <span className="text-[9px] font-mono font-bold text-zinc-400">
                                    00:15
                                  </span>
                                </div>

                                <div className="z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer shadow-lg">
                                  <Play className="h-4.5 w-4.5 fill-white text-white ml-0.5" />
                                </div>

                                <div className="z-10 w-full space-y-1">
                                  {/* Waveform graphic */}
                                  <div className="flex items-end gap-[2px] h-3 px-1">
                                    <div className="h-1 flex-1 bg-white/30 rounded-t animate-pulse"></div>
                                    <div className="h-2 flex-1 bg-white/40 rounded-t"></div>
                                    <div className="h-3 flex-1 bg-indigo-500 rounded-t"></div>
                                    <div className="h-1.5 flex-1 bg-white/40 rounded-t"></div>
                                    <div className="h-2.5 flex-1 bg-white/30 rounded-t"></div>
                                    <div className="h-1 flex-1 bg-indigo-500 rounded-t animate-pulse"></div>
                                    <div className="h-3 flex-1 bg-white/50 rounded-t"></div>
                                    <div className="h-2 flex-1 bg-white/30 rounded-t"></div>
                                  </div>
                                  <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
                                    <div className="h-full w-1/3 bg-indigo-500 rounded-full" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Controls Actions Column */}
                        <div className="w-full xl:w-44 flex-shrink-0 flex flex-row xl:flex-col justify-end xl:justify-center gap-2 border-t xl:border-t-0 xl:border-l border-zinc-100 pt-4 xl:pt-0 xl:pl-4">
                          <button
                            onClick={() => handlePublish(post.id, platform)}
                            disabled={cfg.status === 'publishing'}
                            className={`flex-1 xl:flex-initial flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                              cfg.status === 'published'
                                ? 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                                : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 active:scale-[0.98]'
                            }`}
                          >
                            {publishing[rowKey] ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Публикация...</span>
                              </>
                            ) : cfg.status === 'published' ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span>Обновить пост</span>
                              </>
                            ) : cfg.status === 'failed' ? (
                              <>
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Повторить</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                <span>Опубликовать</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRegenerateText(post.id, platform)}
                            disabled={cfg.status === 'publishing' || regeneratingText[rowKey]}
                            className="flex-1 xl:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {regeneratingText[rowKey] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            )}
                            <span>Рерайт текста</span>
                          </button>

                          <button
                            onClick={() => handleRegenerateMedia(post.id, platform)}
                            disabled={cfg.status === 'publishing' || regeneratingMedia[rowKey]}
                            className="flex-1 xl:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {regeneratingMedia[rowKey] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                            <span>Обновить медиа</span>
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-5 mt-10">
        <div className="mx-auto w-full px-6 text-center text-[10px] text-zinc-400 font-medium">
          &copy; {new Date().getFullYear()} Insurvoice Intelligence. Premium Data Workspace.
        </div>
      </footer>
    </div>
  );
}

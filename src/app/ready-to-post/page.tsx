'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { 
  getRewrittenPosts, 
  updateRewrittenPostText, 
  deleteRewrittenPost,
  updateRewrittenPostStatus,
  regeneratePostText,
  regeneratePostImage,
  RewrittenPost 
} from '@/app/actions';
import { 
  Linkedin, 
  Send, 
  Check, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ExternalLink, 
  Sparkles,
  CheckCircle2,
  Trash2,
  Save,
  ThumbsUp,
  MessageSquare,
  Share2,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sparkle,
  ChevronDown,
  Clock,
  XCircle,
  Download
} from 'lucide-react';

export default function ReadyToPostPage() {
  const [posts, setPosts] = useState<RewrittenPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgViralScore: 0, reddit: 0, linkedin: 0, google: 0 });
  const [copiedStates, setCopiedStates] = useState<Record<string | number, boolean>>({});
  
  // Custom states for db-backed actions
  const [savingStates, setSavingStates] = useState<Record<string | number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [publishingStates, setPublishingStates] = useState<Record<string | number, 'draft' | 'publishing' | 'published' | 'failed'>>({});
  const [publishErrors, setPublishErrors] = useState<Record<string | number, string | null>>({});

  // Custom modal delete state
  const [postToDelete, setPostToDelete] = useState<string | number | null>(null);

  // Dropdown open state
  const [activeDropdownId, setActiveDropdownId] = useState<string | number | null>(null);

  // Regeneration loader states
  const [textRegenStates, setTextRegenStates] = useState<Record<string | number, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [imageRegenStates, setImageRegenStates] = useState<Record<string | number, 'idle' | 'loading' | 'success' | 'error'>>({});

  // 1. Initial Load of Posts and Database Statistics
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getRewrittenPosts();
      if (res.success && res.data) {
        setPosts(res.data);
      }
      setLoading(false);
    }
    
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
    
    loadData();
    fetchStats();
  }, []);

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Helper to handle text editing locally
  const handleTextChange = (id: string | number, val: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, body: val } : p));
    // Set saving state to idle (ready to save)
    setSavingStates(prev => ({ ...prev, [id]: 'idle' as const }));
  };

  // Action: Save edited text to database
  const handleSaveText = async (id: string | number, text: string) => {
    setSavingStates(prev => ({ ...prev, [id]: 'saving' as const }));
    const res = await updateRewrittenPostText(id, text);
    if (res.success) {
      setSavingStates(prev => ({ ...prev, [id]: 'saved' as const }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [id]: 'idle' as const }));
      }, 2000);
    } else {
      setSavingStates(prev => ({ ...prev, [id]: 'error' as const }));
    }
  };

  // Action: Publish
  const handlePublish = async (id: string | number) => {
    setPublishingStates(prev => ({ ...prev, [id]: 'publishing' as const }));
    setPublishErrors(prev => ({ ...prev, [id]: null }));

    // Simulate Network API Call latency (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 90% success rate simulation
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      setPublishingStates(prev => ({ ...prev, [id]: 'published' as const }));
    } else {
      setPublishingStates(prev => ({ ...prev, [id]: 'failed' as const }));
      setPublishErrors(prev => ({ ...prev, [id]: 'LinkedIn API Error (401): OAuth access token has expired or is invalid.' }));
    }
  };

  // Action: update status
  const handleStatusChange = async (id: string | number, newStatus: string | null) => {
    setSavingStates(prev => ({ ...prev, [id]: 'saving' as const }));
    const res = await updateRewrittenPostStatus(id, newStatus);
    if (res.success) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      setSavingStates(prev => ({ ...prev, [id]: 'saved' as const }));
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [id]: 'idle' as const }));
      }, 2000);
    } else {
      setSavingStates(prev => ({ ...prev, [id]: 'error' as const }));
      alert('Не удалось обновить статус: ' + res.error);
    }
    setActiveDropdownId(null);
  };

  // Action: Delete rewritten post from database (after confirmation)
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const res = await deleteRewrittenPost(postToDelete);
    if (res.success) {
      setPosts(prev => prev.filter(p => p.id !== postToDelete));
    } else {
      alert('Не удалось удалить пост: ' + res.error);
    }
    setPostToDelete(null);
  };

  // Action: Download image from Supabase storage / URL
  const handleDownloadImage = async (imageUrl: string, id: string | number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `post-${id}-visual.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open image in a new tab if download block/CORS triggers
      window.open(imageUrl, '_blank');
    }
  };

  // Action: Regenerate post text
  const handleRegenerateText = async (post: RewrittenPost) => {
    setTextRegenStates(prev => ({ ...prev, [post.id]: 'loading' }));
    const res = await regeneratePostText(post);
    if (res.success) {
      setTextRegenStates(prev => ({ ...prev, [post.id]: 'success' }));
      setTimeout(() => {
        setTextRegenStates(prev => ({ ...prev, [post.id]: 'idle' }));
      }, 3000);
    } else {
      setTextRegenStates(prev => ({ ...prev, [post.id]: 'error' }));
      alert(`Не удалось запустить генерацию текста: ${res.error}`);
      setTimeout(() => {
        setTextRegenStates(prev => ({ ...prev, [post.id]: 'idle' }));
      }, 3000);
    }
  };

  // Action: Regenerate post image
  const handleRegenerateImage = async (post: RewrittenPost) => {
    setImageRegenStates(prev => ({ ...prev, [post.id]: 'loading' }));
    const res = await regeneratePostImage(post);
    if (res.success) {
      setImageRegenStates(prev => ({ ...prev, [post.id]: 'success' }));
      setTimeout(() => {
        setImageRegenStates(prev => ({ ...prev, [post.id]: 'idle' }));
      }, 3000);
    } else {
      setImageRegenStates(prev => ({ ...prev, [post.id]: 'error' }));
      alert(`Не удалось запустить генерацию картинки: ${res.error}`);
      setTimeout(() => {
        setImageRegenStates(prev => ({ ...prev, [post.id]: 'idle' }));
      }, 3000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-zinc-800 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <Header stats={stats} title="Готовый контент (LinkedIn)" />

      <main className="w-full flex-1 px-6 py-6 space-y-6">
        {/* Page title and description */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              <span>LinkedIn Конвейер Публикаций</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              Управляйте готовыми LinkedIn-постами, сгенерированными с помощью n8n. Редактируйте тексты, оценивайте визуал и публикуйте напрямую.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
            <div className="rounded-full bg-zinc-50 p-4 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-zinc-900">Загрузка постов...</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm">
              Подгружаем готовый контент из таблицы <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-indigo-600">rewritten_content</code> в Supabase.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-16 text-center shadow-sm">
            <div className="rounded-full bg-zinc-50 p-4 text-zinc-400 border border-zinc-150">
              <Sparkles className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-zinc-900">Нет готовых постов</h3>
            <p className="mt-2 text-xs text-zinc-400 max-w-md leading-relaxed">
              Таблица <code className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-indigo-600">rewritten_content</code> пуста. Отправьте любой сигнал из вкладки ревью на переписывание, чтобы n8n обработал его и сохранил сюда.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => {
              const savingStatus = savingStates[post.id] || 'idle';
              const publishStatus = publishingStates[post.id] || 'draft';
              const publishError = publishErrors[post.id] || null;
              const textRegenStatus = textRegenStates[post.id] || 'idle';
              const imageRegenStatus = imageRegenStates[post.id] || 'idle';

              const displayId = String(post.id).length > 8 ? `${String(post.id).slice(0, 8)}...` : String(post.id);
              const displaySignalId = post.raw_content_id ? (String(post.raw_content_id).length > 8 ? `${String(post.raw_content_id).slice(0, 8)}...` : String(post.raw_content_id)) : 'N/A';
              const displaySource = post.raw_content?.source || post.platform || 'LinkedIn';
              const displayEngagement = post.engagement_score || post.raw_content?.viral_score;

              return (
                <div 
                  key={post.id} 
                  className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200"
                >
                  {/* LEFT: Meta & Editor Panel (cols: 7) */}
                  <div className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
                    
                    {/* Header: Signal Reference */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 font-mono" title={post.id}>
                            ID: #{displayId}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-400" title={post.raw_content_id}>
                            Сигнал: #{displaySignalId}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 capitalize bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg font-bold">
                            Источник: {displaySource}
                          </span>
                          {displayEngagement && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              <TrendingUp className="h-3 w-3" />
                              Score: {displayEngagement}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Original Content Accordion / Preview */}
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">
                          Тема / Заголовок:
                        </span>
                        <h4 className="text-xs font-bold text-zinc-800 leading-snug mt-1">
                          {post.raw_content?.title || post.hook || 'LinkedIn Публикация'}
                        </h4>
                        
                        {(post.raw_content?.content || post.body) && (
                          <div className="mt-3">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">
                              Исходный инсайт / Контент:
                            </span>
                            <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed mt-1 line-clamp-3 hover:line-clamp-none transition-all duration-300">
                              "{post.raw_content?.content || (post.body.length > 200 ? post.body.slice(0, 200) + '...' : post.body)}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editor Area */}
                    <div className="space-y-2 flex-1 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                          <span>Текст поста для LinkedIn</span>
                        </label>
                        
                        {/* Auto-Save & Manual Save indicator */}
                        <div className="flex items-center gap-2">
                          {savingStatus === 'saving' && (
                            <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Сохранение...
                            </span>
                          )}
                          {savingStatus === 'saved' && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Сохранено в БД
                            </span>
                          )}
                          {savingStatus === 'error' && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Ошибка записи
                            </span>
                          )}
                          
                          <button
                            onClick={() => handleRegenerateText(post)}
                            disabled={textRegenStatus === 'loading'}
                            className="flex items-center gap-1.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 transition-all cursor-pointer disabled:opacity-50"
                            title="Перегенерировать текст через n8n"
                          >
                            {textRegenStatus === 'loading' ? (
                              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            ) : (
                              <RefreshCw className="h-3 w-3 text-indigo-500" />
                            )}
                            <span>{textRegenStatus === 'loading' ? 'Генерация...' : 'Перегенерировать текст'}</span>
                          </button>

                          <button
                            onClick={() => handleSaveText(post.id, post.body)}
                            disabled={savingStatus === 'saving'}
                            className="flex items-center gap-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 px-2 py-0.5 text-[10px] font-bold text-zinc-600 transition-all cursor-pointer"
                          >
                            <Save className="h-3 w-3" />
                            Сохранить
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={post.body}
                        onChange={(e) => handleTextChange(post.id, e.target.value)}
                        className="w-full h-64 rounded-xl border border-zinc-250 px-4 py-3 text-xs leading-relaxed font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                        placeholder="Напишите текст поста..."
                      />
                    </div>

                    {/* Metadata Badges from AI (Tone, CTA, Hook) */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {post.tone && (
                        <div className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600 border border-zinc-200">
                          Тон: <span className="text-zinc-800">{post.tone}</span>
                        </div>
                      )}
                      {post.cta && (
                        <div className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600 border border-zinc-200">
                          Призыв: <span className="text-zinc-800">{post.cta}</span>
                        </div>
                      )}
                      {post.hook && (
                        <div className="rounded-lg bg-indigo-50/50 px-2 py-1 text-[10px] font-bold text-indigo-700 border border-indigo-100 max-w-full truncate" title={post.hook}>
                          Хук: <span className="text-indigo-900 font-semibold">"{post.hook}"</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Status Dropdown Selector */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === post.id ? null : post.id)}
                            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.98] ${
                              post.status === 'published'
                                ? 'bg-emerald-50 border-emerald-255 text-emerald-750 hover:bg-emerald-100/60'
                                : post.status === 'cancelled'
                                ? 'bg-amber-50 border-amber-250 text-amber-750 hover:bg-amber-100/60'
                                : post.status === 'deleted'
                                ? 'bg-rose-50 border-rose-250 text-rose-750 hover:bg-rose-100/60'
                                : 'bg-blue-50 border-blue-250 text-blue-750 hover:bg-blue-100/60' // Default: in_progress
                            }`}
                          >
                            {post.status === 'published' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : post.status === 'cancelled' ? (
                              <XCircle className="h-3.5 w-3.5 text-amber-500" />
                            ) : post.status === 'deleted' ? (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-blue-500 animate-[pulse_1.5s_infinite]" />
                            )}
                            <span>
                              {post.status === 'published'
                                ? 'Опубликовано'
                                : post.status === 'cancelled'
                                ? 'Отменено'
                                : post.status === 'deleted'
                                ? 'Удалено'
                                : 'В процессе'}
                            </span>
                            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                          </button>

                          {activeDropdownId === post.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className="absolute left-0 bottom-full mb-2 z-50 w-44 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <button
                                  onClick={() => handleStatusChange(post.id, 'in_progress')}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>В процессе</span>
                                </button>
                                <button
                                  onClick={() => handleStatusChange(post.id, 'published')}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Опубликовано</span>
                                </button>
                                <button
                                  onClick={() => handleStatusChange(post.id, 'cancelled')}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Отменено</span>
                                </button>
                                <div className="my-1 border-t border-zinc-105" />
                                <button
                                  onClick={() => handleStatusChange(post.id, 'deleted')}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Удалено</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleCopyText(post.body, post.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-600 transition-all cursor-pointer"
                          title="Скопировать в буфер"
                        >
                          {copiedStates[post.id] ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-emerald-600">Скопировано</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Копировать</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={() => setPostToDelete(post.id)}
                        className="flex items-center justify-center p-2 rounded-xl border border-rose-100 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all shadow-sm cursor-pointer"
                        title="Удалить пост"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {publishError && (
                      <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-[10px] font-bold text-rose-700 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-rose-500" />
                        <span>{publishError}</span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: LinkedIn Live Feed Mockup Simulator (cols: 5) */}
                  <div className="lg:col-span-5 p-6 bg-zinc-50/50 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-3">
                        Симулятор LinkedIn Ленты (Live View)
                      </span>
                      
                      {/* LinkedIn Mockup Card */}
                      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-left max-w-sm mx-auto">
                        
                        {/* Mockup Header */}
                        <div className="p-3.5 flex items-start gap-2.5">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-[12px] shadow-sm flex-shrink-0">
                            IV
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-900 hover:text-blue-600 hover:underline cursor-pointer">
                                Insurvoice AI Agent
                              </span>
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1 rounded flex items-center gap-0.5">
                                <Sparkle className="h-2 w-2 fill-blue-500" />
                                AI
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 block leading-tight">
                              Automated Insurance Analyst & Copywriter
                            </span>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">
                              Just now • 🌐
                            </span>
                          </div>
                        </div>

                        {/* Mockup Body Content */}
                        <div className="px-3.5 pb-3 text-[11px] leading-relaxed text-zinc-800 whitespace-pre-wrap font-sans font-medium break-words border-t border-b border-zinc-50 bg-zinc-50/20 py-2">
                          {post.body || 'Текст поста пуст. Введите текст в редакторе слева, чтобы увидеть превью...'}
                        </div>

                        {/* Mockup Media Image */}
                        {post.image_url ? (
                          <div className="relative border-b border-zinc-100 overflow-hidden bg-zinc-50 max-h-48 group/img">
                            <img 
                              src={post.image_url} 
                              alt="Post preview visual" 
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Regenerate Image Button */}
                            <button
                              onClick={() => handleRegenerateImage(post)}
                              disabled={imageRegenStatus === 'loading'}
                              className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all opacity-90 group-hover/img:opacity-100 disabled:opacity-50"
                              title="Перегенерировать изображение через n8n"
                            >
                              {imageRegenStatus === 'loading' ? (
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                              ) : (
                                <Sparkles className="h-3 w-3 text-indigo-400" />
                              )}
                              <span>{imageRegenStatus === 'loading' ? 'Генерация...' : 'Перегенерировать'}</span>
                            </button>

                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadImage(post.image_url!, post.id)}
                              className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all opacity-90 group-hover/img:opacity-100"
                              title="Скачать изображение"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Скачать</span>
                            </button>

                            <div className="absolute bottom-2 left-2 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
                              Visual Attachment
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 border-b border-zinc-100 bg-gradient-to-br from-indigo-50/20 to-blue-50/30 flex flex-col items-center justify-center text-center h-36 border-t border-zinc-50 relative group/no-img">
                            <ImageIcon className="h-6 w-6 text-zinc-300" />
                            <span className="text-[9px] text-zinc-400 font-semibold mt-1">
                              Визуальное вложение отсутствует
                            </span>
                            <button
                              onClick={() => handleRegenerateImage(post)}
                              disabled={imageRegenStatus === 'loading'}
                              className="mt-2 flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-750 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                              {imageRegenStatus === 'loading' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              <span>{imageRegenStatus === 'loading' ? 'Генерация...' : 'Сгенерировать картинку'}</span>
                            </button>
                          </div>
                        )}

                        {/* Mockup Action Footer */}
                        <div className="px-2 py-1 flex items-center justify-between border-t border-zinc-100 bg-zinc-50/30">
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-500 font-bold text-[10px] transition-colors cursor-pointer">
                            <ThumbsUp className="h-3 w-3" />
                            <span>Like</span>
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-500 font-bold text-[10px] transition-colors cursor-pointer">
                            <MessageSquare className="h-3 w-3" />
                            <span>Comment</span>
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-zinc-100 text-zinc-500 font-bold text-[10px] transition-colors cursor-pointer">
                            <Share2 className="h-3 w-3" />
                            <span>Share</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Image generation prompt detail */}
                    {post.image_prompt && (
                      <div className="mt-4 p-3 bg-white border border-zinc-200 rounded-xl">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">
                          AI Image Generation Prompt (Midjourney / DALL-E)
                        </span>
                        <p className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-300">
                          "{post.image_prompt}"
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-5 mt-10">
        <div className="mx-auto w-full px-6 text-center text-[10px] text-zinc-400 font-medium">
          &copy; {new Date().getFullYear()} Insurvoice Intelligence. Premium Data Workspace.
        </div>
      </footer>

      {/* Custom Delete Confirmation Modal */}
      {postToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[3px] transition-opacity" 
            onClick={() => setPostToDelete(null)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-sm transform overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl transition-all animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950">
                  Подтвердите удаление
                </h3>
                <p className="text-[9px] text-zinc-400 font-medium">
                  Это действие удалит пост из базы данных.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                Вы уверены, что хотите удалить этот готовый пост? Он будет безвозвратно удален из таблицы <code className="font-mono bg-zinc-50 px-1 py-0.5 rounded text-rose-600">rewritten_content</code>.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPostToDelete(null)}
                className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-600 transition-all cursor-pointer shadow-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 border border-rose-700 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper since lucide-react Image can conflict with next/image
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  );
}

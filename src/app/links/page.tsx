'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Link2,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MousePointerClick,
  X,
  Save,
  Power,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TRACKING_DOMAINS } from '@/lib/shortLinks';

interface ShortLink {
  id: string;
  domain: string;
  code: string;
  target_url: string;
  title: string | null;
  is_active: boolean;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

interface ClickEvent {
  id: string;
  clicked_at: string;
  user_agent: string | null;
  referer: string | null;
  ip: string | null;
}

type Lang = 'ru' | 'en';
type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 15;

const TRANSLATIONS = {
  ru: {
    pageTitle: 'Short Links & Redirects',
    pageSubtitle: 'Создание трекинговых ссылок для оплаты (Stripe) и управление редиректами',
    newLink: 'Новая ссылка',
    domain: 'Домен',
    targetUrlLabel: 'Целевой URL (Stripe / страница оплаты) *',
    targetUrlPlaceholder: 'https://buy.stripe.com/...',
    titleLabel: 'Название (опц.)',
    titlePlaceholder: 'Pro Plan $99',
    codeLabel: 'Код (опц.)',
    codePlaceholder: 'Авто (CKADJ)',
    createBtn: 'Создать короткую ссылку',
    creatingBtn: 'Создание...',
    searchPlaceholder: 'Поиск по коду, названию или URL...',
    filterAll: 'Все статусы',
    filterActive: 'Активные',
    filterInactive: 'Выключенные',
    allDomains: 'Все домены',
    redirectsList: 'Редиректы',
    loading: 'Загрузка...',
    empty: 'Ссылок пока нет. Создайте первую ссылку выше.',
    emptyFiltered: 'По вашему запросу ничего не найдено.',
    colShortLink: 'Короткая ссылка',
    colTitle: 'Название',
    colTargetUrl: 'Целевой URL (Stripe)',
    colClicks: 'Клики',
    colStatus: 'Статус',
    colActions: 'Действия',
    statusActive: 'Активна',
    statusInactive: 'Выкл',
    save: 'Сохранить',
    copyTitle: 'Копировать ссылку',
    openTitle: 'Открыть в новой вкладке',
    editTitle: 'Изменить целевой URL',
    deleteTitle: 'Удалить',
    clicksTitle: 'Посмотреть историю переходов',
    deleteConfirm: 'Удалить ссылку',
    modalTitle: 'Переходы',
    totalClicks: 'Всего кликов',
    last50: 'показаны последние 50',
    noClicks: 'Переходов пока не зафиксировано',
    pageOf: 'Стр.',
    from: 'из',
    shown: 'Показано',
    errLoad: 'Не удалось загрузить ссылки',
    errCreate: 'Ошибка создания ссылки',
    errSave: 'Ошибка сохранения',
    errUpdate: 'Ошибка обновления статуса',
    errDelete: 'Ошибка удаления',
  },
  en: {
    pageTitle: 'Short Links & Redirects',
    pageSubtitle: 'Create trackable payment links (Stripe) and manage redirects',
    newLink: 'New Link',
    domain: 'Domain',
    targetUrlLabel: 'Target URL (Stripe / checkout page) *',
    targetUrlPlaceholder: 'https://buy.stripe.com/...',
    titleLabel: 'Title (opt.)',
    titlePlaceholder: 'Pro Plan $99',
    codeLabel: 'Code (opt.)',
    codePlaceholder: 'Auto (CKADJ)',
    createBtn: 'Create Short Link',
    creatingBtn: 'Creating...',
    searchPlaceholder: 'Search by code, title, or URL...',
    filterAll: 'All statuses',
    filterActive: 'Active',
    filterInactive: 'Inactive',
    allDomains: 'All domains',
    redirectsList: 'Redirects',
    loading: 'Loading...',
    empty: 'No links yet. Create your first link above.',
    emptyFiltered: 'No links match your search or filter.',
    colShortLink: 'Short Link',
    colTitle: 'Title',
    colTargetUrl: 'Target URL (Stripe)',
    colClicks: 'Clicks',
    colStatus: 'Status',
    colActions: 'Actions',
    statusActive: 'Active',
    statusInactive: 'Off',
    save: 'Save',
    copyTitle: 'Copy link',
    openTitle: 'Open in new tab',
    editTitle: 'Edit target URL',
    deleteTitle: 'Delete',
    clicksTitle: 'View click history',
    deleteConfirm: 'Delete link',
    modalTitle: 'Clicks',
    totalClicks: 'Total clicks',
    last50: 'showing last 50',
    noClicks: 'No clicks recorded yet',
    pageOf: 'Page',
    from: 'of',
    shown: 'Showing',
    errLoad: 'Failed to load links',
    errCreate: 'Failed to create link',
    errSave: 'Failed to save changes',
    errUpdate: 'Failed to update status',
    errDelete: 'Failed to delete link',
  },
} as const;

export default function ShortLinksPage() {
  const [lang, setLang] = useState<Lang>('ru');
  const t = TRANSLATIONS[lang];

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, filter, pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Create form state
  const [domain, setDomain] = useState<string>(TRACKING_DOMAINS[0]);
  const [targetUrl, setTargetUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [creating, setCreating] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Clicks modal state
  const [clicksModalLink, setClicksModalLink] = useState<ShortLink | null>(null);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [clicksLoading, setClicksLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('short_links_lang');
    if (saved === 'ru' || saved === 'en') {
      setLang(saved);
    }
  }, []);

  const toggleLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem('short_links_lang', next);
  };

  const fetchLinks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/links');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errLoad);
      setLinks(data.links || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errLoad);
    } finally {
      setLoading(false);
    }
  }, [t.errLoad]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return links.filter((link) => {
      if (statusFilter === 'active' && !link.is_active) return false;
      if (statusFilter === 'inactive' && link.is_active) return false;
      if (domainFilter !== 'all' && link.domain !== domainFilter) return false;
      if (!q) return true;
      return (
        link.code.toLowerCase().includes(q) ||
        link.target_url.toLowerCase().includes(q) ||
        (link.title && link.title.toLowerCase().includes(q)) ||
        link.domain.toLowerCase().includes(q)
      );
    });
  }, [links, search, statusFilter, domainFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLinks.slice(start, start + PAGE_SIZE);
  }, [filteredLinks, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, domainFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          target_url: targetUrl.trim(),
          title: title.trim() || undefined,
          code: customCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errCreate);

      setLinks((prev) => [data.link, ...prev]);
      setTargetUrl('');
      setTitle('');
      setCustomCode('');
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errCreate);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (link: ShortLink) => {
    const fullUrl = `https://${link.domain}/${link.code}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const startEdit = (link: ShortLink) => {
    setEditingId(link.id);
    setEditTargetUrl(link.target_url);
    setEditTitle(link.title || '');
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: editTargetUrl.trim(),
          title: editTitle.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errSave);

      setLinks((prev) => prev.map((l) => (l.id === id ? data.link : l)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errSave);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (link: ShortLink) => {
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !link.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errUpdate);
      setLinks((prev) => prev.map((l) => (l.id === link.id ? data.link : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errUpdate);
    }
  };

  const handleDelete = async (link: ShortLink) => {
    if (!confirm(`${t.deleteConfirm} ${link.domain}/${link.code}?`)) return;
    try {
      const res = await fetch(`/api/links/${link.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errDelete);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errDelete);
    }
  };

  const openClicksModal = async (link: ShortLink) => {
    setClicksModalLink(link);
    setClicksLoading(true);
    setClicks([]);
    try {
      const res = await fetch(`/api/links/${link.id}`);
      const data = await res.json();
      if (res.ok) {
        setClicks(data.clicks || []);
      }
    } finally {
      setClicksLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                {t.pageTitle}
              </h1>
              <p className="text-xs text-zinc-500">{t.pageSubtitle}</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => toggleLang('ru')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                lang === 'ru'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => toggleLang('en')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                lang === 'en'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create Form */}
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-4"
        >
          <div className="text-sm font-semibold text-zinc-900">{t.newLink}</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t.domain}
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none"
              >
                {TRACKING_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t.targetUrlLabel}
              </label>
              <input
                type="url"
                required
                placeholder={t.targetUrlPlaceholder}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t.titleLabel}
              </label>
              <input
                type="text"
                placeholder={t.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                {t.codeLabel}
              </label>
              <input
                type="text"
                placeholder={t.codePlaceholder}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? t.creatingBtn : t.createBtn}
            </button>
          </div>
        </form>

        {/* Links Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs">
          {/* Toolbar: Title + Search + Filters */}
          <div className="flex flex-col gap-3 border-b border-zinc-200/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-zinc-900">
              {t.redirectsList} ({filteredLinks.length})
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-56 rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 focus:border-zinc-900 focus:bg-white focus:outline-none"
              >
                <option value="all">{t.filterAll}</option>
                <option value="active">{t.filterActive}</option>
                <option value="inactive">{t.filterInactive}</option>
              </select>

              {TRACKING_DOMAINS.length > 1 && (
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 focus:border-zinc-900 focus:bg-white focus:outline-none"
                >
                  <option value="all">{t.allDomains}</option>
                  {TRACKING_DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">{t.loading}</div>
          ) : links.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">{t.empty}</div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">{t.emptyFiltered}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200/60 bg-zinc-50/80 text-xs font-medium text-zinc-500">
                    <tr>
                      <th className="px-5 py-3">{t.colShortLink}</th>
                      <th className="px-5 py-3">{t.colTitle}</th>
                      <th className="px-5 py-3">{t.colTargetUrl}</th>
                      <th className="px-5 py-3 text-center">{t.colClicks}</th>
                      <th className="px-5 py-3 text-center">{t.colStatus}</th>
                      <th className="px-5 py-3 text-right">{t.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60">
                    {paginatedLinks.map((link) => {
                      const isEditing = editingId === link.id;
                      const shortUrl = `https://${link.domain}/${link.code}`;

                      return (
                        <tr key={link.id} className="hover:bg-zinc-50/60">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-zinc-900">
                                {link.domain}/{link.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(link)}
                                title={t.copyTitle}
                                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                              >
                                {copiedId === link.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <a
                                href={shortUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={t.openTitle}
                                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder={t.titleLabel}
                                className="w-full rounded-lg border border-zinc-300 px-2.5 py-1 text-xs focus:border-zinc-900 focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs text-zinc-700">
                                {link.title || <span className="text-zinc-400">—</span>}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 max-w-xs">
                            {isEditing ? (
                              <input
                                type="url"
                                value={editTargetUrl}
                                onChange={(e) => setEditTargetUrl(e.target.value)}
                                className="w-full rounded-lg border border-zinc-300 px-2.5 py-1 text-xs focus:border-zinc-900 focus:outline-none"
                              />
                            ) : (
                              <div
                                className="truncate text-xs text-zinc-600"
                                title={link.target_url}
                              >
                                {link.target_url}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => openClicksModal(link)}
                              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-200"
                              title={t.clicksTitle}
                            >
                              <MousePointerClick className="h-3 w-3" />
                              {link.clicks_count}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(link)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                link.is_active
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-zinc-100 text-zinc-500'
                              }`}
                            >
                              <Power className="h-3 w-3" />
                              {link.is_active ? t.statusActive : t.statusInactive}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={savingId === link.id}
                                  onClick={() => handleSaveEdit(link.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-800"
                                >
                                  <Save className="h-3 w-3" />
                                  {t.save}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(link)}
                                  title={t.editTitle}
                                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(link)}
                                  title={t.deleteTitle}
                                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-200/60 px-5 py-3 text-xs text-zinc-500">
                  <span>
                    {t.shown} {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, filteredLinks.length)} {t.from}{' '}
                    {filteredLinks.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 font-medium text-zinc-700">
                      {t.pageOf} {currentPage} {t.from} {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clicks History Modal */}
      {clicksModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">
                  {t.modalTitle}: {clicksModalLink.domain}/{clicksModalLink.code}
                </h2>
                <p className="text-xs text-zinc-500">
                  {t.totalClicks}: {clicksModalLink.clicks_count} ({t.last50})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClicksModalLink(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-5">
              {clicksLoading ? (
                <div className="py-8 text-center text-sm text-zinc-500">{t.loading}</div>
              ) : clicks.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">{t.noClicks}</div>
              ) : (
                <div className="space-y-2.5">
                  {clicks.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-medium text-zinc-900">
                        <span>
                          {new Date(c.clicked_at).toLocaleString(
                            lang === 'ru' ? 'ru-RU' : 'en-US'
                          )}
                        </span>
                        {c.ip && <span className="font-mono text-zinc-500">{c.ip}</span>}
                      </div>
                      {c.referer && (
                        <div className="mt-1 truncate text-zinc-600">
                          Referer: {c.referer}
                        </div>
                      )}
                      {c.user_agent && (
                        <div className="mt-0.5 truncate text-zinc-400">
                          {c.user_agent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

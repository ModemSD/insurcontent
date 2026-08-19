'use client';

import React, { useState } from 'react';
import { 
  MapPin, Search, Download, Loader2, Globe, Mail, Phone, ExternalLink, 
  Instagram, Facebook, Linkedin, Youtube, Send, Star, Building2, Sliders, Navigation, Plus, Trash2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { 
  parseGoogleMapsCompaniesAction, 
  fastEstimateCompaniesAction, 
  geocodeAddressAction, 
  CompanyLead, 
  ZoneConfig 
} from './actions';

const InteractiveGoogleMap = dynamic(() => import('./InteractiveGoogleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span>Загрузка интерактивной карты...</span>
    </div>
  ),
});

const BUSINESS_CATEGORIES = [
  'Страховые компании и агенты',
  'Автосалоны, СТО и автосервисы',
  'Медицинские центры и клиники',
  'Юридические услуги и адвокаты',
  'Банки и финансовые организации',
  'Недвижимость и риелторы',
  'Рестораны, кафе и общепит',
  'Строительные компании',
  'Туристические агентства',
  'Салоны красоты и СПА',
  'IT-компании и веб-студии',
  'Другое (ввести свой запрос)',
];

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Алматы': { lat: 43.238949, lng: 76.889709 },
  'Астана': { lat: 51.169392, lng: 71.449074 },
  'Шымкент': { lat: 42.3417, lng: 69.5901 },
  'Караганда': { lat: 49.8019, lng: 73.1021 },
  'Актобе': { lat: 50.2839, lng: 57.167 },
  'Тараз': { lat: 42.9, lng: 71.3667 },
  'Павлодар': { lat: 52.2856, lng: 76.9409 },
  'Усть-Каменогорск': { lat: 49.9483, lng: 82.6278 },
  'Семей': { lat: 50.4111, lng: 80.2275 },
  'Атырау': { lat: 47.1167, lng: 51.8833 },
  'Костанай': { lat: 53.2144, lng: 63.6246 },
  'Кызылорда': { lat: 44.8528, lng: 65.5092 },
  'Уральск': { lat: 51.2333, lng: 51.3667 },
  'Москва': { lat: 55.7558, lng: 37.6173 },
  'Санкт-Петербург': { lat: 59.9343, lng: 30.3351 },
  'Ташкент': { lat: 41.2995, lng: 69.2401 },
  'Бишкек': { lat: 42.8746, lng: 74.5698 },
};

export default function GoogleParserPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [customQuery, setCustomQuery] = useState<string>('');

  // Список мульти-зон
  const [zones, setZones] = useState<ZoneConfig[]>([
    {
      id: 'zone-1',
      location: 'Алматы',
      centerLat: CITY_COORDINATES['Алматы'].lat,
      centerLng: CITY_COORDINATES['Алматы'].lng,
      radiusKm: 5,
    },
  ]);
  const [activeZoneId, setActiveZoneId] = useState<string>('zone-1');

  // Лимит компаний
  const [limit, setLimit] = useState<number>(20);
  const [isCustomLimit, setIsCustomLimit] = useState<boolean>(false);
  const [customLimitInput, setCustomLimitInput] = useState<string>('35');

  const [loading, setLoading] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [companies, setCompanies] = useState<CompanyLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedCompanyId, setFocusedCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCustomCategory = selectedCategory === 'Другое (ввести свой запрос)';

  // Управление зонами
  const addZone = () => {
    const newId = `zone-${Date.now()}`;
    const defaultCenter = CITY_COORDINATES['Астана'] || { lat: 51.1693, lng: 71.4490 };
    const newZone: ZoneConfig = {
      id: newId,
      location: 'Астана',
      centerLat: defaultCenter.lat,
      centerLng: defaultCenter.lng,
      radiusKm: 5,
    };
    setZones((prev) => [...prev, newZone]);
    setActiveZoneId(newId);
  };

  const removeZone = (id: string) => {
    if (zones.length <= 1) return;
    const nextZones = zones.filter((z) => z.id !== id);
    setZones(nextZones);
    if (activeZoneId === id) {
      setActiveZoneId(nextZones[0].id);
    }
  };

  const updateZone = (id: string, patch: Partial<ZoneConfig>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  };

  const handleCityChange = async (zoneId: string, cityName: string) => {
    updateZone(zoneId, { location: cityName });

    // 1. Поиск из базового словаря
    if (CITY_COORDINATES[cityName]) {
      updateZone(zoneId, {
        centerLat: CITY_COORDINATES[cityName].lat,
        centerLng: CITY_COORDINATES[cityName].lng,
      });
      return;
    }

    // 2. Безопасный серверный геокодинг (без CORS ошибок в браузере)
    if (cityName.trim().length > 2 && !cityName.startsWith('Точка')) {
      const res = await geocodeAddressAction(cityName);
      if (res.success && res.lat && res.lng) {
        updateZone(zoneId, { centerLat: res.lat, centerLng: res.lng });
      }
    }
  };

  const handleCenterChangeFromMap = (newCenter: { lat: number; lng: number }) => {
    updateZone(activeZoneId, {
      centerLat: newCenter.lat,
      centerLng: newCenter.lng,
      location: `Точка (${newCenter.lat.toFixed(3)}, ${newCenter.lng.toFixed(3)})`,
    });
  };

  const handleZoneDragEndFromMap = (zoneId: string, newCenter: { lat: number; lng: number }) => {
    updateZone(zoneId, {
      centerLat: newCenter.lat,
      centerLng: newCenter.lng,
      location: `Точка (${newCenter.lat.toFixed(3)}, ${newCenter.lng.toFixed(3)})`,
    });
  };

  const activeLimit = isCustomLimit ? (parseInt(customLimitInput, 10) || 20) : limit;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryToUse = isCustomCategory ? '' : selectedCategory;
    if (isCustomCategory && !customQuery.trim()) {
      setError('Пожалуйста, введите ваш поисковый запрос');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    const res = await parseGoogleMapsCompaniesAction({
      category: categoryToUse,
      customQuery,
      limit: activeLimit,
      zones,
    });
    setLoading(false);

    if (res.success && res.companies) {
      setCompanies(res.companies);
      setSelectedIds(new Set(res.companies.map((c) => c.id)));
    } else {
      setError(res.error || 'Произошла ошибка при парсинге');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const exportToCSV = () => {
    const targetCompanies = companies.filter((c) => selectedIds.has(c.id));
    if (targetCompanies.length === 0) {
      alert('Выберите хотя бы одну компанию для экспорта');
      return;
    }

    const headers = [
      'Название',
      'Категория',
      'Телефон',
      'Email',
      'Сайт',
      'Instagram',
      'Facebook',
      'LinkedIn',
      'Telegram',
      'Адрес',
      'Широта',
      'Долгота',
      'Рейтинг',
      'Отзывов',
      'Ссылка Google Maps',
    ];

    const rows = targetCompanies.map((c) => [
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.website || '').replace(/"/g, '""')}"`,
      `"${(c.instagram || '').replace(/"/g, '""')}"`,
      `"${(c.facebook || '').replace(/"/g, '""')}"`,
      `"${(c.linkedin || '').replace(/"/g, '""')}"`,
      `"${(c.telegram || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.lat || '',
      c.lng || '',
      c.rating || '',
      c.reviewsCount || '',
      `"${(c.googleUrl || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const queryTag = (isCustomCategory ? customQuery : selectedCategory).replace(/[^a-zA-Z0-9а-яА-Я]/g, '_');
    link.setAttribute('download', `leads_${queryTag}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <MapPin className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Мульти-зональный Парсер Google Maps</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Добавляйте произвольное количество зон поиска на карте и парсьте компании из разных городов одновременно
          </p>
        </div>

        {companies.length > 0 && (
          <button
            onClick={exportToCSV}
            disabled={selectedIds.size === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Выгрузить в CSV ({selectedIds.size})</span>
          </button>
        )}
      </div>

      {/* Interactive Multi-Zone Map */}
      <div className="mb-6">
        <InteractiveGoogleMap
          zones={zones}
          activeZoneId={activeZoneId}
          onSelectActiveZone={setActiveZoneId}
          onActiveZoneCenterChange={handleCenterChangeFromMap}
          onZoneDragEnd={handleZoneDragEndFromMap}
          companies={companies}
          selectedCompanyId={focusedCompanyId}
          onSelectCompany={setFocusedCompanyId}
        />
      </div>

      {/* Filter Form */}
      <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Category Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Тематика / Категория бизнеса</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {isCustomCategory && (
              <div className="animate-in fade-in duration-200">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Ваш точный ключевой запрос
                </label>
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Например: Производство мебели, Оптовая торговля запчастями..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            )}
          </div>

          {/* Zones Config List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Зоны поиска на карте ({zones.length})</span>
              </h3>
              <button
                type="button"
                onClick={addZone}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Добавить еще зону</span>
              </button>
            </div>

            <div className="space-y-3">
              {zones.map((z, idx) => {
                const isActive = z.id === activeZoneId;
                return (
                  <div
                    key={z.id}
                    onClick={() => setActiveZoneId(z.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    {/* Zone Badge */}
                    <div className="md:col-span-2 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white ${
                          isActive ? 'bg-blue-600' : 'bg-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {isActive ? 'Активная' : `Зона #${idx + 1}`}
                      </span>
                    </div>

                    {/* Location input */}
                    <div className="md:col-span-6" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={z.location}
                          onChange={(e) => handleCityChange(z.id, e.target.value)}
                          onFocus={() => setActiveZoneId(z.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault(); // Предотвращаем случайный запуск парсинга формы!
                              handleCityChange(z.id, z.location); // Мгновенно обновить позицию точки на карте
                            }
                          }}
                          placeholder="Введите адрес или город и нажмите Enter для показа на карте"
                          list={`cities-list-${z.id}`}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                          required
                        />
                        <datalist id={`cities-list-${z.id}`}>
                          {Object.keys(CITY_COORDINATES).map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Radius select or custom input */}
                    <div className="md:col-span-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex-1">
                        {z.isCustomRadius ? (
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="100"
                              value={z.radiusKm}
                              onChange={(e) => updateZone(z.id, { radiusKm: parseFloat(e.target.value) || 1 })}
                              onFocus={() => setActiveZoneId(z.id)}
                              placeholder="Радиус"
                              className="w-full rounded-lg border border-slate-200 bg-white pl-2.5 pr-8 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                            />
                            <span className="absolute right-6 top-2 text-[10px] font-bold text-slate-400 pointer-events-none select-none">
                              км
                            </span>
                          </div>
                        ) : (
                          <select
                            value={z.radiusKm}
                            onChange={(e) => updateZone(z.id, { radiusKm: Number(e.target.value) })}
                            onFocus={() => setActiveZoneId(z.id)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                          >
                            <option value={1}>1 км (Квартал)</option>
                            <option value={2}>2 км (Микрорайон)</option>
                            <option value={5}>5 км (Район)</option>
                            <option value={10}>10 км (Весь город)</option>
                            <option value={25}>25 км (Пригород)</option>
                            <option value={50}>50 км (Область)</option>
                          </select>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => updateZone(z.id, { isCustomRadius: !z.isCustomRadius })}
                        className="text-blue-600 hover:underline font-semibold text-[10px] whitespace-nowrap"
                        title="Переключить тип ввода радиуса"
                      >
                        {z.isCustomRadius ? 'Из списка' : 'Свой'}
                      </button>
                    </div>

                    {/* Delete button */}
                    <div className="md:col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      {zones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeZone(z.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Удалить эту зону"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Limits + Submit */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-3 border-t border-slate-100">
            {/* Custom Limit Controls */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Компаний на каждую зону:</span>
              
              {isCustomLimit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={customLimitInput}
                    onChange={(e) => setCustomLimitInput(e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomLimit(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    К пресетам
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {[10, 20, 50, 100, 200].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLimit(num)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        limit === num
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomLimit(true)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-all cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Своё число</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Кнопка быстрой оценки количества */}
              <button
                type="button"
                disabled={loading || isEstimating}
                onClick={async () => {
                  const categoryToUse = isCustomCategory ? '' : selectedCategory;
                  if (isCustomCategory && !customQuery.trim()) {
                    setError('Пожалуйста, введите ваш поисковый запрос');
                    return;
                  }
                  setIsEstimating(true);
                  setError(null);
                  const res = await fastEstimateCompaniesAction({
                    category: categoryToUse,
                    customQuery,
                    limit: activeLimit,
                    zones,
                  });
                  setIsEstimating(false);
                  if (res.success && res.companies) {
                    setCompanies(res.companies);
                    setSelectedIds(new Set(res.companies.map((c) => c.id)));
                  } else {
                    setError(res.error || 'Ошибка быстрой оценки');
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                title="Быстрая оценка: показывает количество и расположение мест без парсинга почт"
              >
                {isEstimating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Быстрая оценка...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 text-blue-600" />
                    <span>Быстрая оценка</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={loading || isEstimating}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Сбор контактов...</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    <span>Спарсить с контактами ({activeLimit * zones.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Loader Banner */}
      {(loading || isEstimating) && (
        <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-center animate-pulse">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-3" />
          <h3 className="text-sm font-bold text-blue-950">
            {isEstimating ? 'Идёт быстрая оценка зон...' : 'Идёт процесс сбора полных контактов...'}
          </h3>
          <p className="mt-1 text-xs text-blue-600/80">
            {isEstimating
              ? 'Моментальный подсчёт количества мест и отображение маркеров на карте без захода на сайты.'
              : 'Глубокое сканирование карт и сайтов компаний для сбора телефонов, почты и социальных сетей.'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          ⚠️ {error}
        </div>
      )}

      {/* Results Table */}
      {companies.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.size === companies.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Найдено компаний на карте: {companies.length} (Выбрано: {selectedIds.size})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 w-10"></th>
                  <th className="py-3.5 px-3">Компания</th>
                  <th className="py-3.5 px-3">Контакты</th>
                  <th className="py-3.5 px-3">Email & Сайт</th>
                  <th className="py-3.5 px-3">Соцсети</th>
                  <th className="py-3.5 px-3">Адрес</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Рейтинг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-medium">
                {companies.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const isFocused = c.id === focusedCompanyId;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setFocusedCompanyId(c.id)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isFocused
                          ? 'bg-blue-50/80 font-semibold border-l-4 border-l-blue-600'
                          : isSelected
                          ? 'bg-blue-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-4 pl-6 pr-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Title & Category */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            {c.title}
                            {c.googleUrl && (
                              <a
                                href={c.googleUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-blue-600"
                                title="Открыть в Google Maps"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </span>
                          {c.category && (
                            <span className="text-[10px] text-slate-500 mt-0.5">{c.category}</span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-3">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 font-mono text-[11px]"
                          >
                            <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span>{c.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Email & Website */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1">
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-blue-600 hover:underline text-[11px] truncate max-w-[180px]"
                              title={c.email}
                            >
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </a>
                          )}
                          {c.website && (
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-[11px] truncate max-w-[180px]"
                            >
                              <Globe className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                            </a>
                          )}
                          {!c.email && !c.website && <span className="text-slate-300 text-[11px]">—</span>}
                        </div>
                      </td>

                      {/* Socials */}
                      <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {c.instagram && (
                            <a
                              href={c.instagram}
                              target="_blank"
                              rel="noreferrer"
                              className="text-pink-600 hover:scale-110 transition-transform"
                              title="Instagram"
                            >
                              <Instagram className="h-4 w-4" />
                            </a>
                          )}
                          {c.facebook && (
                            <a
                              href={c.facebook}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:scale-110 transition-transform"
                              title="Facebook"
                            >
                              <Facebook className="h-4 w-4" />
                            </a>
                          )}
                          {c.linkedin && (
                            <a
                              href={c.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 hover:scale-110 transition-transform"
                              title="LinkedIn"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          )}
                          {c.telegram && (
                            <a
                              href={c.telegram}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-500 hover:scale-110 transition-transform"
                              title="Telegram"
                            >
                              <Send className="h-4 w-4" />
                            </a>
                          )}
                          {!c.instagram && !c.facebook && !c.linkedin && !c.telegram && (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-4 px-3">
                        <span className="text-slate-600 text-[11px] line-clamp-2 max-w-[200px]">
                          {c.address || c.city || '—'}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        {c.rating ? (
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800 text-[11px]">{c.rating}</span>
                            {c.reviewsCount && (
                              <span className="text-slate-400 text-[10px]">({c.reviewsCount})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

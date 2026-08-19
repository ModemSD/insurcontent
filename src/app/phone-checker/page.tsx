'use client';

import React, { useState } from 'react';
import { 
  PhoneCall, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldQuestion, 
  Search, 
  Loader2, 
  Radio, 
  MapPin, 
  User, 
  AlertTriangle,
  Info,
  Copy,
  Check
} from 'lucide-react';
import { checkPhoneNumbersAction, PhoneCheckResult } from './actions';

export default function PhoneCheckerPage() {
  const [inputPhones, setInputPhones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PhoneCheckResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<PhoneCheckResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const phones = inputPhones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (phones.length === 0) {
      setError('Введите хотя бы один телефонный номер США');
      return;
    }

    setLoading(true);
    try {
      const res = await checkPhoneNumbersAction(phones);
      if (res.success && res.results) {
        setResults(res.results);
      } else {
        setError(res.error || 'Произошла ошибка при проверке');
      }
    } catch (err: any) {
      setError(err?.message || 'Не удалось выполнить запрос');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = (phone: string, idx: number) => {
    navigator.clipboard.writeText(phone);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
              <PhoneCall className="w-4 h-4" />
              <span>US Phone Lookup & Spam Check</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">
              Проверка номеров США на Спам
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Проверка валидности, оператора, типа линии и параметров фрода/спама напрямую через Apify.
            </p>
          </div>
        </div>

        {/* Input Form & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Input */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Ввод номеров</span>
            </h2>
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  Номера США (по одному на строку):
                </label>
                <textarea
                  rows={6}
                  value={inputPhones}
                  onChange={(e) => setInputPhones(e.target.value)}
                  placeholder={`+1 (555) 234-5678\n+1 212 555 0199\n3105550142`}
                  className="w-full text-xs font-mono p-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none bg-zinc-50/50"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Выполняется проверка...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Запустить проверку</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Info */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-zinc-900 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-medium backdrop-blur-md">
                <Info className="w-3.5 h-3.5" />
                <span>Abstract Phone Intelligence API</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                Анализ телефонов США и оценка рисков
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Инструмент выполняет проверку номеров через Abstract API: определяет официального оператора связи (AT&T, Verizon, Onvoy), тип линии (Mobile, Landline, VoIP), точную локацию в США и зафиксированный уровень спам-риска (Risk Level).
              </p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Результаты ответа ({results.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Сводные параметры из ответа сервера
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-6">Телефон</th>
                    <th className="py-3 px-6">Оператор</th>
                    <th className="py-3 px-6">Тип Линии</th>
                    <th className="py-3 px-6">Спам / Валидность</th>
                    <th className="py-3 px-6">Локация / Имя</th>
                    <th className="py-3 px-6 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                  {results.map((res, index) => {
                    const isHighRisk = res.spamRiskLevel === 'HIGH' || res.isSpam;
                    const isMediumRisk = res.spamRiskLevel === 'MEDIUM';

                    return (
                      <tr key={index} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-zinc-900 align-top">
                          <div className="flex items-center gap-2 pt-0.5">
                            <span>{res.phone}</span>
                            <button
                              onClick={() => handleCopyPhone(res.phone, index)}
                              className="text-zinc-400 hover:text-zinc-700 transition"
                              title="Скопировать номер"
                            >
                              {copiedIndex === index ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-2 pt-0.5">
                            <Radio className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                            <span className="font-semibold text-zinc-800">{res.carrier}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            res.lineType.toLowerCase().includes('mobile') 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : res.lineType.toLowerCase().includes('voip')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                            {res.lineType}
                          </span>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1">
                            {!res.valid ? (
                              <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 w-fit">
                                <ShieldAlert className="w-4 h-4" />
                                <span>INVALID / UNKNOWN</span>
                              </div>
                            ) : isHighRisk ? (
                              <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 w-fit">
                                <ShieldAlert className="w-4 h-4" />
                                <span>SPAM RISK ({res.spamScore}%)</span>
                              </div>
                            ) : isMediumRisk ? (
                              <div className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                                <ShieldQuestion className="w-4 h-4" />
                                <span>SUSPICIOUS ({res.spamScore}%)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                                <ShieldCheck className="w-4 h-4" />
                                <span>CLEAN ({res.spamScore}%)</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="space-y-0.5 pt-0.5">
                            {res.location && (
                              <div className="flex items-center gap-1 text-zinc-500">
                                <MapPin className="w-3 h-3 text-zinc-400" />
                                <span>{res.location}</span>
                              </div>
                            )}
                            {res.ownerName && (
                              <div className="flex items-center gap-1 text-zinc-800 font-semibold">
                                <User className="w-3 h-3 text-zinc-400" />
                                <span>{res.ownerName}</span>
                              </div>
                            )}
                            {!res.location && !res.ownerName && (
                              <span className="text-zinc-400 font-normal">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right align-top">
                          <button
                            onClick={() => setSelectedResult(res)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 border border-zinc-200 text-[11px] font-bold text-zinc-700 transition shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            JSON Детали
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal JSON Viewer */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h4 className="text-sm font-bold text-zinc-900">
                  Сырые детали ответа для {selectedResult.phone}
                </h4>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-zinc-400 hover:text-zinc-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-zinc-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-zinc-800 shadow-inner min-h-[250px]">
                <pre className="whitespace-pre-wrap break-all leading-relaxed">
                  {selectedResult.detailsJson}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

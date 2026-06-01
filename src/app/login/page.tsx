'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';
import { 
  Loader2, Lock, Mail, ShieldAlert, 
  ArrowRight, ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Пожалуйста, заполните все поля.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const res = await loginAction(formData);

      if (res.success) {
        // Refresh router context to register auth cookie state and redirect
        router.refresh();
        router.push('/');
      } else {
        setErrorMsg(res.error || 'Неверный логин или пароль.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Произошла ошибка при авторизации.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col justify-center items-center bg-[#f8fafc] px-4 py-12 relative overflow-hidden">
      
      {/* Decorative Radial Background Light */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-blue-400/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-indigo-400/5 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8 relative z-10 select-none">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white font-black text-xs shadow-md mb-2.5">
          IV
        </div>
        <span className="text-xs font-black tracking-widest text-zinc-950 uppercase leading-none">
          Insurvoice
        </span>
        <span className="text-[8px] font-bold text-zinc-400 font-mono mt-1">
          v1.4 • Supabase Secured
        </span>
      </div>

      {/* Login Card Container */}
      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-zinc-200/70 rounded-3xl p-8 shadow-xl shadow-zinc-200/30 hover:shadow-2xl hover:shadow-zinc-200/40 transition-all duration-300 relative z-10">
        
        {/* Card Title */}
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-black text-zinc-900">
            Вход в систему управления
          </h2>
          <p className="text-[11px] font-semibold text-zinc-400">
            Авторизуйтесь в системе, используя данные учетной записи Supabase, для доступа к панели.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
              Email Адрес
            </label>
            <div className="relative rounded-2xl shadow-sm transition-all duration-200">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                disabled={loading}
                className="block w-full rounded-xl border border-zinc-250 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-800 placeholder-zinc-450 focus:border-indigo-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50 disabled:bg-zinc-50"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
              Пароль
            </label>
            <div className="relative rounded-2xl shadow-sm transition-all duration-200">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
                className="block w-full rounded-xl border border-zinc-250 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-zinc-800 placeholder-zinc-450 focus:border-indigo-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50 disabled:bg-zinc-50"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-[11px] font-bold text-rose-600 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-950 text-xs font-extrabold text-white py-2.5 shadow-md shadow-zinc-950/10 hover:shadow-lg hover:shadow-zinc-950/15 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-zinc-450" />
                <span>Авторизация...</span>
              </>
            ) : (
              <>
                <span>Войти в аккаунт</span>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Secure gate footer */}
        <div className="mt-8 text-center text-[10px] text-zinc-400 font-semibold flex items-center justify-center gap-1.5 border-t border-zinc-100 pt-6">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Доступ ограничен. Защищено шифрованием SSL.</span>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-[10px] text-zinc-400 font-semibold max-w-xs leading-relaxed pointer-events-none select-none">
        © {new Date().getFullYear()} Insurvoice Inc. Все права защищены.
      </div>
      
    </div>
  );
}

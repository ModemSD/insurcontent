'use client';

import React, { useState, useEffect, useRef } from 'react';
import { saveMediaPlanSettings } from '@/app/actions';

interface CalcInputs {
  arpu: number;
  gm: number;
  churn: number;
  gtm: number;
  cust: number;
  sellers: number;
  salary: number;
  months: number;
  other: number;
  startClients?: number;
}

interface ChannelMonthState {
  budget: number;
  impr: number;
  cpc: number;
  cr1: number;
  crL: number;
  cr2: number;
  cr3: number;
  cr4: number;
  cr5: number;
  muted?: boolean;
}

type PlanState = ChannelMonthState[][];

interface MediaPlanDashboardProps {
  initialCalcData: CalcInputs | null;
  initialPlanData: PlanState | null;
}

interface RoadmapTask {
  id: string;
  month: string;
  phase: string;
  initiative: string;
  source?: string;
  type?: string;
  comment?: string;
  completed: boolean;
}

const MONTHS = ['Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const CH = [
  { n: 'Meta (Paid Social)',   b: [1600, 3300, 3300, 4800, 4800, 4800],  im: [60000, 120000, 120000, 150000, 150000, 150000], r: [0.007, 0.22, 0.045, 0.60, 0.55, 0.38] },
  { n: 'LinkedIn Ads (таргет)', b: [600, 1500, 1500, 1800, 1800, 1800],   im: [8000, 18000, 18000, 24000, 24000, 24000],  r: [0.008, 0.25, 0.06, 0.62, 0.55, 0.40] },
  { n: 'Cold Email',           b: [2800, 3800, 3800, 4200, 4200, 4200],  im: [6000, 6500, 6500, 7000, 7000, 7000],       r: [0.033, 0.85, 0.112, 0.65, 0.60, 0.32] },
  { n: 'LinkedIn (founder)',   b: [800, 1200, 1200, 1500, 1500, 1500],   im: [850, 950, 950, 1000, 1000, 1000],         r: [0.20, 0.70, 0.071, 0.65, 0.60, 0.40] },
  { n: 'Тёплая сеть / реферал', b: [200, 300, 400, 500, 800, 1000],       im: [24, 28, 30, 34, 40, 46],                   r: [0.70, 0.85, 0.53, 0.80, 0.70, 0.45] },
  { n: 'Google Search',        b: [1200, 1800, 1800, 2200, 2200, 2200],  im: [3200, 3600, 3600, 4000, 4000, 4000],       r: [0.045, 0.30, 0.08, 0.65, 0.60, 0.42] },
  { n: 'Вебинары / демо',      b: [400, 750, 750, 1100, 1100, 1100],     im: [0, 280, 280, 380, 380, 380],               r: [0.12, 0.40, 0.45, 0.70, 0.60, 0.42] },
  { n: 'Подкасты / медиа',     b: [400, 1200, 1200, 1300, 1300, 1300],   im: [3500, 7000, 7000, 8500, 8500, 8500],       r: [0.008, 0.25, 0.06, 0.65, 0.60, 0.42] },
  { n: 'Партнёрства / события', b: [0, 750, 750, 4400, 4400, 4400],       im: [0, 30, 30, 140, 160, 180],                 r: [0.20, 0.35, 0.371, 0.75, 0.65, 0.48] }
];

const CALC_DEFAULTS: CalcInputs = {
  arpu: 600,
  gm: 72,
  churn: 4,
  gtm: 105000,
  cust: 50,
  sellers: 1,
  salary: 4500,
  months: 6,
  other: 0,
  startClients: 0
};

function defaultStateForScenario(scenarioName: 'realistic' | 'optimistic' | 'pessimistic'): PlanState {
  const plan: PlanState = [];
  
  for (let c = 0; c < 9; c++) {
    const chName = CH[c].n;
    const monthsData: ChannelMonthState[] = [];
    
    for (let m = 0; m < 6; m++) {
      let budget = 0;
      let cpc = 0;
      let cr1 = 0; // CTR
      let crL = 0; // CRл
      let cr2 = 0; // CR2
      let cr3 = 0; // CR3
      let cr4 = 0; // CR4
      let cr5 = 0; // CR5
      let muted = false;
      
      if (scenarioName === 'realistic') {
        if (chName === 'Meta (Paid Social)') {
          const budgets = [3500, 4500, 4500, 7000, 7000, 7000];
          budget = budgets[m];
          cpc = 3.50; cr1 = 0.018; crL = 0.05;
          cr2 = m === 0 ? 0.36 : 0.34; cr3 = m === 0 ? 0.72 : 0.70; cr4 = 0.60; cr5 = m === 0 ? 0.43 : (m < 3 ? 0.40 : 0.44);
        } else if (chName === 'LinkedIn Ads (таргет)') {
          if (m !== 1) { muted = true; }
          else { budget = 400; cpc = 0.50; cr1 = 0.010; crL = 0.015; cr2 = 0.32; cr3 = 0.65; cr4 = 0.55; cr5 = 0.35; }
        } else if (chName === 'Google Search') {
          const budgets = [1500, 1500, 1500, 2000, 2000, 2000];
          budget = budgets[m]; cpc = 10.00; cr1 = 0.045; crL = 0.07;
          cr2 = m === 0 ? 0.50 : 0.48; cr3 = m === 0 ? 0.70 : 0.65; cr4 = m === 0 ? 0.70 : 0.65; cr5 = m === 0 ? 0.45 : (m < 3 ? 0.42 : 0.46);
        } else if (chName === 'Cold Email') {
          budget = 100; cr1 = 0.010;
          cpc = m === 0 ? 5.00 : 2.50; crL = m === 0 ? 0.15 : 0.10;
          cr2 = m === 0 ? 0.70 : 0.60; cr3 = m === 0 ? 0.60 : 0.55; cr4 = m === 0 ? 0.70 : 0.65; cr5 = m === 0 ? 0.45 : (m < 3 ? 0.40 : 0.42);
        } else if (chName === 'LinkedIn (founder)') {
          budget = 250; cr1 = m === 0 ? 0.043 : 0.045;
          cpc = m === 0 ? 7.14 : 5.00; crL = m === 0 ? 0.15 : 0.10;
          cr2 = m === 0 ? 0.30 : 0.28; cr3 = m === 0 ? 0.70 : 0.65; cr4 = m === 0 ? 0.65 : 0.60; cr5 = m === 0 ? 0.45 : (m < 3 ? 0.40 : 0.42);
        } else if (chName === 'Вебинары / демо') {
          muted = true;
        } else if (chName === 'Партнёрства / события') {
          if (m < 3) { muted = true; }
          else {
            budget = m === 3 ? 1000 : (m === 4 ? 1000 : 800);
            cpc = 150.00; cr1 = 0.45; crL = 0.35; cr2 = 0.75; cr3 = 0.70; cr4 = 0.70; cr5 = 0.60;
          }
        } else if (chName === 'Тёплая сеть / реферал') {
          if (m < 3) { muted = true; }
          else {
            budget = m === 3 ? 200 : (m === 4 ? 300 : 400);
            cpc = 20.00; cr1 = 0.60; crL = 0.60; cr2 = 0.75; cr3 = 0.75; cr4 = 0.75; cr5 = 0.70;
          }
        } else {
          muted = true;
        }
      } else if (scenarioName === 'pessimistic') {
        if (chName === 'Meta (Paid Social)') {
          const budgets = [4000, 5500, 6000, 8000, 9000, 6500];
          budget = budgets[m];
          cpc = 5.00; cr1 = 0.015; crL = 0.038;
          cr2 = 0.28; cr3 = 0.68; cr4 = 0.55; cr5 = 0.32;
        } else if (chName === 'LinkedIn Ads (таргет)') {
          muted = true;
        } else if (chName === 'Google Search') {
          const budgets = [1500, 2000, 2000, 2500, 3000, 2500];
          budget = budgets[m]; cpc = 12.00; cr1 = 0.04; crL = 0.05;
          cr2 = 0.42; cr3 = 0.58; cr4 = 0.64; cr5 = 0.38;
        } else if (chName === 'Cold Email') {
          budget = 100; cr1 = 0.010; crL = 0.08;
          cpc = m === 0 ? 5.00 : 2.50;
          cr2 = 0.58; cr3 = 0.48; cr4 = 0.60; cr5 = 0.30;
        } else if (chName === 'LinkedIn (founder)') {
          budget = 250; cr1 = m === 0 ? 0.043 : 0.045; crL = 0.08;
          cpc = m === 0 ? 7.14 : 5.00;
          cr2 = 0.24; cr3 = 0.60; cr4 = 0.54; cr5 = 0.34;
        } else if (chName === 'Вебинары / демо') {
          muted = true;
        } else if (chName === 'Партнёрства / события') {
          muted = true;
        } else if (chName === 'Тёплая сеть / реферал') {
          muted = true;
        } else {
          muted = true;
        }
      } else if (scenarioName === 'optimistic') {
        if (chName === 'Meta (Paid Social)') {
          const budgets = [5000, 8500, 9000, 13000, 15000, 11000];
          budget = budgets[m];
          cpc = 3.00; cr1 = 0.018; crL = 0.065;
          cr2 = 0.35; cr3 = 0.70; cr4 = 0.60; cr5 = 0.45;
        } else if (chName === 'LinkedIn Ads (таргет)') {
          if (m !== 1) { muted = true; }
          else { budget = 500; cpc = 0.50; cr1 = 0.010; crL = 0.02; cr2 = 0.35; cr3 = 0.65; cr4 = 0.55; cr5 = 0.35; }
        } else if (chName === 'Google Search') {
          const gsBudgets = [2000, 3000, 3000, 3500, 4000, 3500];
          budget = gsBudgets[m]; cpc = 9.00; cr1 = 0.050; crL = 0.08;
          cr2 = 0.50; cr3 = 0.62; cr4 = 0.68; cr5 = 0.42;
        } else if (chName === 'Cold Email') {
          budget = 100; cr1 = 0.010; crL = 0.12;
          cpc = m === 0 ? 4.00 : 2.00;
          cr2 = 0.65; cr3 = 0.52; cr4 = 0.70; cr5 = 0.38;
        } else if (chName === 'LinkedIn (founder)') {
          budget = 250; cr1 = m === 0 ? 0.050 : 0.054; crL = 0.12;
          cpc = m === 0 ? 6.25 : 4.16;
          cr2 = 0.28; cr3 = 0.70; cr4 = 0.60; cr5 = 0.40;
        } else if (chName === 'Вебинары / демо') {
          muted = true;
        } else if (chName === 'Партнёрства / события') {
          if (m < 2) { muted = true; }
          else {
            const partBudgets = [0, 0, 1500, 2500, 3000, 2500];
            budget = partBudgets[m];
            cpc = 150.00; cr1 = 0.45; crL = 0.38; cr2 = 0.78; cr3 = 0.70; cr4 = 0.70; cr5 = 0.58;
          }
        } else if (chName === 'Тёплая сеть / реферал') {
          if (m === 0) { muted = true; }
          else {
            const wnBudgets = [0, 100, 150, 200, 300, 400];
            budget = wnBudgets[m];
            cpc = 20.00; cr1 = 0.60; crL = 0.65; cr2 = 0.80; cr3 = 0.80; cr4 = 0.80; cr5 = 0.65;
          }
        } else {
          muted = true;
        }
      }
      
      const clicks = cpc > 0 ? budget / cpc : 0;
      const imprComputed = cr1 > 0 ? clicks / cr1 : 0;
      
      monthsData.push({
        budget,
        impr: Math.round(imprComputed) || 0,
        cpc,
        cr1,
        crL,
        cr2,
        cr3,
        cr4,
        cr5,
        muted: budget === 0 || muted
      });
    }
    
    plan.push(monthsData);
  }
  
  return plan;
}

const ROADMAP_INITIATIVES = [
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Публичный демо-номер, по которому любой может поговорить с AI", "source": "v3", "type": "Продукт/маркетинг", "comment": "Канал #3 \"Демо-номер\" — фундамент, всё остальное на него ссылается." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "3 лендинга под ключевые сценарии (after-hours, speed-to-lead, renewals)", "source": "v3", "type": "Content", "comment": "Материалы для продаж и посадочные под будущий платный трафик." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "ICP-базы и сегментация; настройка и прогрев email-доменов", "source": "v3", "type": "Outbound", "comment": "Подготовка Cold Email — канала #1." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Запуск поисковых кампаний по высокоинтентным запросам", "source": "v3 + Бэклог #3", "type": "Google Search", "comment": "Бэклог-гипотеза про \"информационную прокладку под AI receptionist use-case\" теперь прямо соответствует стратегии — можно запускать." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Контент-завод / система производства креативов — сборка инфраструктуры", "source": "Бэклог #10, #15", "type": "Content", "comment": "Поддержка Meta и будущих кейсов." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Сценарий демо и материалы для продаж", "source": "v3", "type": "Sales enablement", "comment": "" },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Масштабный холодный outbound (Cold Email, ~2000 писем/нед)", "source": "v3", "type": "Outbound", "comment": "Канал #1, KPI reply >5%, письмо→демо >0,7%." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Ежедневный founder-led LinkedIn (органика)", "source": "v3", "type": "Social", "comment": "Канал #2, KPI accept >25%, →демо >5%." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Meta: масштабирование на подтверждённом CPL + retargeting квиза + video creatives с hook + LAL", "source": "v3 + Бэклог #14,#12,#22,#2", "type": "Paid", "comment": "Meta уже \"работает сейчас\" — усиливаем гипотезами с самым высоким RICE (retargeting 14.4, video creatives 9.1, LAL 7.5)." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Цепочка писем для новых лидов", "source": "Бэклог #11, RICE 21.4", "type": "Content/CRM", "comment": "Самый высокий RICE в бэклоге — напрямую поддерживает конверсию лидов в демо." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Работа с тёплой сетью и рекомендациями", "source": "v3", "type": "Networking", "comment": "" },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Персональные демонстрации, быстрый сбор обратной связи", "source": "v3", "type": "Sales", "comment": "Итог фазы: 10 клиентов, ~40 состоявшихся демо, ~60 назначенных." },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "SEO (Доп страницы по ключам, сравнение с конкурентами)", "source": "-", "type": "-", "comment": "-" },
  { "month": "Июль", "phase": "Фаза 1", "initiative": "Подключение демо номера", "source": "-", "type": "-", "comment": "-" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Reddit", "source": "v3", "type": "Paid", "comment": "600 - африка, 1500 норм ребята" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Ретаргетинг Meta + тест похожих аудиторий (LAL)", "source": "v3", "type": "Paid", "comment": "" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "LinkedIn Ads — повторный тест (таргетинг Agency Owner/Principal)", "source": "v3", "type": "Paid", "comment": "ВАЖНО: пересматривает более раннее решение \"Stop\". Сузить таргетинг именно на Agency Owner/Principal, не запускать широкие гипотезы из бэклога (лидформы, презентации) в исходном виде." },
  { "month": "Август", "phase": "Фаза 2", "initiative": "PR (статьи)", "source": "", "type": "", "comment": "" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Работа в профессиональных сообществах", "source": "v3", "type": "Community", "comment": "" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Составить топ-20 целевых партнёров", "source": "Бэклог, новое", "type": "Partnership", "comment": "Конкретизация \"старта переговоров с партнёрами\" из v3." },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Выстроить Афилиейт", "source": "", "type": "", "comment": "" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Старт переговоров с партнёрами и AMS-вендорами", "source": "v3", "type": "Partnership", "comment": "Ориентир v3: → 17–18 клиентов к концу августа." },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Первые кейсы и отзывы в маркетинговых материалах", "source": "v3", "type": "Content", "comment": "" },
  { "month": "Август", "phase": "Фаза 2", "initiative": "Отдельная страница для отдела продаж", "source": "v3", "type": "Content", "comment": "" },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "Закупка ссылок", "source": "", "type": "", "comment": "" },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "Первый открытый вебинар; медиа и подкасты", "source": "v3", "type": "Content", "comment": "" },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "Первый раунд outreach к топ-20 партнёрам + закрытие первых 3–5 pilot-партнёрств", "source": "Бэклог, новое", "type": "Partnership", "comment": "" },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "X twitter", "source": "v3", "type": "", "comment": "" },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "Подготовка к событиям Q4; формирование партнёрского пайплайна", "source": "v3", "type": "Partnership", "comment": "Итог фазы: ~25 клиентов, подтверждённая юнит-экономика." },
  { "month": "Сентябрь", "phase": "Фаза 2", "initiative": "Видео для посадочных вебинаров на 5-15 минут", "source": "v3", "type": "", "comment": "" },
  { "month": "Октябрь", "phase": "Фаза 3", "initiative": "Участие в крупных отраслевых событиях, живое демо с AI", "source": "v3", "type": "Events", "comment": "" },
  { "month": "Октябрь", "phase": "Фаза 3", "initiative": "Кампании для Medicare в период AEP (15 окт – 7 дек)", "source": "v3", "type": "Paid/Content", "comment": "ICP Tier 2 — сезонное окно." },
  { "month": "Октябрь", "phase": "Фаза 3", "initiative": "Первые партнёрские соглашения; масштабирование каналов", "source": "v3", "type": "Partnership", "comment": "" },
  { "month": "Ноябрь", "phase": "Фаза 2", "initiative": "Второй вебинар; больше инвестиций в лучший по цене демо канал", "source": "v3", "type": "Paid/Content", "comment": "Решение по каналу — на основе данных к этому моменту (Meta / Google Search / LinkedIn retest)." },
  { "month": "Ноябрь", "phase": "Фаза 3", "initiative": "Google Ads грант", "source": "v3", "type": "-", "comment": "" },
  { "month": "Ноябрь", "phase": "Фаза 3", "initiative": "Запуск реферальной программы", "source": "v3", "type": "Referral", "comment": "" },
  { "month": "Ноябрь", "phase": "Фаза 3", "initiative": "Развитие партнёрской дистрибуции; видео-кейсы", "source": "v3", "type": "Content/Partnership", "comment": "" },
  { "month": "Ноябрь", "phase": "Фаза 3", "initiative": "Больше инвестиций в 1–2 самых эффективных канала", "source": "v3", "type": "Paid", "comment": "По факту к этому моменту должно быть понятно, какой платный канал лучший — туда и концентрируем бюджет." },
  { "month": "Декабрь", "phase": "Фаза 3", "initiative": "Работа с агентствами, откладывавшими решение", "source": "v3", "type": "Sales", "comment": "" },
  { "month": "Декабрь", "phase": "Фаза 3", "initiative": "Кейсы и рекомендации существующих клиентов", "source": "v3", "type": "Content", "comment": "" },
  { "month": "Декабрь", "phase": "Фаза 3", "initiative": "Активизация партнёрского пайплайна; сценарии продлений", "source": "v3", "type": "Partnership", "comment": "Итог: 50 клиентов, предсказуемая модель роста." }
];

function money(n: number) {
  return '$' + Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
}

function pctv(x: number) {
  return Math.round(x * 10000) / 100;
}

export default function MediaPlanDashboard({
  initialCalcData,
  initialPlanData
}: MediaPlanDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'original' | 'improved' | 'v3' | 'calc' | 'media' | 'roadmap'>('overview');
  const [curMonth, setCurMonth] = useState<number>(0);
  const [activeScenario, setActiveScenario] = useState<'realistic' | 'optimistic' | 'pessimistic'>('realistic');
  const [roadmapView, setRoadmapView] = useState<'grid' | 'list'>('grid');

  // Initialize maps for plans and calculator inputs
  const [plans, setPlans] = useState<Record<'realistic' | 'optimistic' | 'pessimistic', PlanState>>(() => {
    // Check if initialPlanData has scenario keys
    if (initialPlanData && typeof initialPlanData === 'object' && !Array.isArray(initialPlanData) && ('realistic' in initialPlanData)) {
      const data = initialPlanData as any;
      return {
        realistic: data.realistic || defaultStateForScenario('realistic'),
        optimistic: data.optimistic || defaultStateForScenario('optimistic'),
        pessimistic: data.pessimistic || defaultStateForScenario('pessimistic')
      };
    }
    // Legacy array or empty
    const realistic = (initialPlanData && Array.isArray(initialPlanData) && initialPlanData.length === CH.length)
      ? initialPlanData
      : defaultStateForScenario('realistic');

    return {
      realistic: realistic,
      optimistic: defaultStateForScenario('optimistic'),
      pessimistic: defaultStateForScenario('pessimistic')
    };
  });

  const [calcInputsMap, setCalcInputsMap] = useState<Record<'realistic' | 'optimistic' | 'pessimistic', CalcInputs>>(() => {
    if (initialCalcData && typeof initialCalcData === 'object' && !Array.isArray(initialCalcData) && ('realistic' in initialCalcData)) {
      const data = initialCalcData as any;
      const startClientsGlobal = data.realistic?.startClients || data.optimistic?.startClients || data.pessimistic?.startClients || 0;
      return {
        realistic: { ...CALC_DEFAULTS, ...data.realistic, startClients: startClientsGlobal },
        optimistic: { ...CALC_DEFAULTS, churn: 3, ...data.optimistic, startClients: startClientsGlobal },
        pessimistic: { ...CALC_DEFAULTS, churn: 5, ...data.pessimistic, startClients: startClientsGlobal }
      };
    }
    // Legacy single object
    const baseCalc = (initialCalcData && typeof initialCalcData === 'object' && !Array.isArray(initialCalcData))
      ? (initialCalcData as CalcInputs)
      : CALC_DEFAULTS;

    const startClientsGlobal = baseCalc.startClients || 0;

    return {
      realistic: { ...baseCalc, startClients: startClientsGlobal },
      optimistic: { ...baseCalc, churn: 3, startClients: startClientsGlobal },
      pessimistic: { ...baseCalc, churn: 5, startClients: startClientsGlobal }
    };
  });

  const [roadmapTasks, setRoadmapTasks] = useState<RoadmapTask[]>(() => {
    let raw: any[] = [];
    if (initialPlanData && typeof initialPlanData === 'object' && 'roadmap' in initialPlanData) {
      raw = (initialPlanData as any).roadmap || ROADMAP_INITIATIVES;
    } else {
      raw = ROADMAP_INITIATIVES;
    }
    return raw.map((t, idx) => ({
      id: t.id || `task-${idx}-${Date.now()}`,
      month: t.month || 'Июль',
      phase: t.phase || 'Фаза 1',
      initiative: t.initiative || '',
      source: t.source || '',
      type: t.type || '',
      comment: t.comment || '',
      completed: !!t.completed
    }));
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const planState = plans[activeScenario];
  const calcInputs = calcInputsMap[activeScenario];

  const setPlanState = (updateFn: PlanState | ((prev: PlanState) => PlanState)) => {
    setPlans(prevPlans => {
      const prevPlan = prevPlans[activeScenario];
      const nextPlan = typeof updateFn === 'function' ? (updateFn as any)(prevPlan) : updateFn;
      return {
        ...prevPlans,
        [activeScenario]: nextPlan
      };
    });
  };

  const [flashMessage, setFlashMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedState, setCopiedState] = useState<ChannelMonthState | null>(null);
  const isFirstRender = useRef(true);

  // Debounced auto-save hook to Supabase database
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      setFlashMessage('💾 сохранение...');
      const res = await saveMediaPlanSettings(calcInputsMap, {
        ...plans,
        roadmap: roadmapTasks
      });
      setIsSaving(false);
      if (res.success) {
        setFlashMessage('💾 сохранено в БД ✓');
        setTimeout(() => setFlashMessage(''), 2000);
      } else {
        setFlashMessage('⚠️ ошибка сохранения: ' + res.error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [calcInputsMap, plans, roadmapTasks]);

  const triggerFlash = (msg: string) => {
    setFlashMessage(msg);
    setTimeout(() => {
      setFlashMessage(prev => prev === msg ? '' : prev);
    }, 2000);
  };

  const handleCalcChange = (field: keyof CalcInputs, val: number) => {
    setCalcInputsMap(prev => {
      if (field === 'startClients') {
        return {
          realistic: { ...prev.realistic, startClients: val },
          optimistic: { ...prev.optimistic, startClients: val },
          pessimistic: { ...prev.pessimistic, startClients: val }
        };
      }
      return {
        ...prev,
        [activeScenario]: {
          ...prev[activeScenario],
          [field]: val
        }
      };
    });
  };

  // Switch tabs and scroll to top
  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  // Reset helper
  const handleCalcReset = () => {
    setCalcInputsMap(prev => ({
      ...prev,
      [activeScenario]: CALC_DEFAULTS
    }));
    triggerFlash('Сброшено к базовым ✓');
  };

  const handlePlanReset = () => {
    showConfirm(
      'Сброс медиаплана',
      'Вы уверены, что хотите сбросить медиаплан к исходным цифрам? Все ваши текущие правки по этому сценарию будут удалены.',
      () => {
        setPlans(prev => ({
          ...prev,
          [activeScenario]: defaultStateForScenario(activeScenario)
        }));
        triggerFlash('↺ сброшено к плану ✓');
      }
    );
  };

  // Zero channel budget for current month
  const handleZeroChannel = (ci: number) => {
    setPlanState(prev => {
      const next = prev.map((ch, cIndex) => {
        if (cIndex !== ci) return ch;
        return ch.map((m, mIndex) => {
          if (mIndex !== curMonth) return m;
          return { ...m, budget: 0, impr: 0 };
        });
      });
      return next;
    });
    triggerFlash(`✕ канал обнулён на ${MONTHS[curMonth]} ✓`);
  };

  // Toggle channel muting for current month only
  const handleToggleMute = (ci: number) => {
    setPlanState(prev => {
      const next = prev.map((ch, cIndex) => {
        if (cIndex !== ci) return ch;
        return ch.map((m, mIndex) => {
          if (mIndex !== curMonth) return m;
          return { ...m, muted: !m.muted };
        });
      });
      return next;
    });
    const isMutedNow = !(planState[ci][curMonth]?.muted || false);
    triggerFlash(`Канал ${isMutedNow ? 'приглушён' : 'активирован'} на ${MONTHS[curMonth]} ✓`);
  };

  // Copy row data (budget, cpc, CTR, and all CRs)
  const handleCopyRow = (ci: number) => {
    setCopiedState({ ...planState[ci][curMonth] });
    triggerFlash(`Данные ${CH[ci].n} скопированы ✓`);
  };

  // Paste copied data to row
  const handlePasteRow = (ci: number) => {
    if (!copiedState) return;
    setPlanState(prev => {
      const next = prev.map((ch, cIndex) => {
        if (cIndex !== ci) return ch;
        return ch.map((m, mIndex) => {
          if (mIndex !== curMonth) return m;
          return {
            ...m,
            budget: copiedState.budget,
            cpc: copiedState.cpc,
            cr1: copiedState.cr1,
            crL: copiedState.crL,
            cr2: copiedState.cr2,
            cr3: copiedState.cr3,
            cr4: copiedState.cr4,
            cr5: copiedState.cr5
          };
        });
      });
      return next;
    });
    triggerFlash(`Данные вставлены в ${CH[ci].n} ✓`);
  };

  // Export to JSON
  const handleExport = () => {
    const snap = {
      version: 2,
      exported: new Date().toISOString(),
      calc: calcInputsMap,
      plan: plans
    };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `insurvoice-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    triggerFlash('⬇ файл выгружен ✓');
  };

  // Import from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result as string);
        if (d.plan && typeof d.plan === 'object' && !Array.isArray(d.plan) && d.plan.realistic) {
          setPlans(d.plan);
        } else if (d.plan && Array.isArray(d.plan)) {
          setPlans(prev => ({
            ...prev,
            [activeScenario]: d.plan
          }));
        }
        
        if (d.calc && typeof d.calc === 'object' && !Array.isArray(d.calc) && d.calc.realistic) {
          setCalcInputsMap(d.calc);
        } else if (d.calc) {
          setCalcInputsMap(prev => ({
            ...prev,
            [activeScenario]: d.calc
          }));
        }
        triggerFlash('⬆ импортировано ✓');
      } catch (err: any) {
        alert('Не удалось прочитать файл: ' + err.message);
      }
    };
    rd.readAsText(file);
    e.target.value = '';
  };

  // Math Helper for Channel Calculations
  const computeChannelMetrics = (s: ChannelMonthState) => {
    const clicks = s.cpc > 0 ? s.budget / s.cpc : 0;
    const impr = s.cr1 > 0 ? clicks / s.cr1 : 0;
    const leads = clicks * s.crL;
    const cpl = leads > 0 ? s.budget / leads : 0;
    const booked = leads * s.cr2;
    const cpa = booked > 0 ? s.budget / booked : 0;
    const completed = booked * s.cr3;
    const cpa2 = completed > 0 ? s.budget / completed : 0;
    const sent = completed * s.cr4;
    const cpa3 = sent > 0 ? s.budget / sent : 0;
    const signed = sent * s.cr5;
    const cpa4 = signed > 0 ? s.budget / signed : 0;
    return { impr, clicks, cpc: s.cpc, leads, cpl, booked, cpa, completed, cpa2, sent, cpa3, signed, cpa4 };
  };

  // 1. Economics Calculations
  const arpu = calcInputs.arpu;
  const gm = calcInputs.gm / 100;
  const churn = calcInputs.churn / 100;
  const gtm = calcInputs.gtm;
  const cust = calcInputs.cust;
  const sellers = calcInputs.sellers;
  const salary = calcInputs.salary;
  const months = calcInputs.months;
  const other = calcInputs.other;

  const cacSub = cust > 0 ? gtm / cust : 0;
  const salesCost = sellers * salary * months;
  const cacFull = cust > 0 ? (gtm + salesCost + other) / cust : 0;
  const life = churn > 0 ? 1 / churn : 0;
  const ltv = arpu * gm * life;
  const ratio = cacFull > 0 ? ltv / cacFull : 0;
  const payback = cacFull / (arpu * gm);

  // Churn Sensitivity rows
  const sensitivityRows = [0.03, 0.04, 0.05, 0.06, 0.07].map(c => {
    const l = 1 / c;
    const lt = arpu * gm * l;
    const r = cacFull > 0 ? lt / cacFull : 0;
    let cls = 'bad';
    let txt = 'ломается';
    if (r >= 3) {
      cls = 'good';
      txt = 'здорово';
    } else if (r >= 2) {
      cls = 'warn';
      txt = 'погранично';
    }
    return { c, l, lt, r, cls, txt };
  });

  // 2. Budget Phase Summary Calculations
  const groups = [
    { label: 'Phase 1 (июль)', idx: [0] },
    { label: 'Phase 2 (авг–сен, ~/мес)', idx: [1, 2] },
    { label: 'Phase 3 (Q4, ~/мес)', idx: [3, 4, 5] }
  ];

  const phaseMonthly = groups.map(g => {
    let sum = 0;
    CH.forEach((_, ci) => {
      g.idx.forEach(mi => {
        sum += planState[ci][mi].budget;
      });
    });
    return sum / g.idx.length;
  });

  let totalGtmAll = 0;
  planState.forEach(channel => {
    channel.forEach(month => {
      totalGtmAll += month.budget;
    });
  });

  // 3. Monthly detail calculation
  let curMonthBudget = 0;
  let curMonthImpr = 0;
  let curMonthClicks = 0;
  let curMonthLeads = 0;
  let curMonthBooked = 0;
  let curMonthCompleted = 0;
  let curMonthSent = 0;
  let curMonthSigned = 0;

  const monthRows = CH.map((c, ci) => {
    const s = planState[ci][curMonth];
    const r = computeChannelMetrics(s);
    curMonthBudget += s.budget;
    curMonthImpr += r.impr;
    curMonthClicks += r.clicks;
    curMonthLeads += r.leads;
    curMonthBooked += r.booked;
    curMonthCompleted += r.completed;
    curMonthSent += r.sent;
    curMonthSigned += r.signed;
    return { name: c.n, s, r, ci };
  });

  const bCR1 = curMonthImpr > 0 ? curMonthClicks / curMonthImpr : 0;
  const bCPC = curMonthClicks > 0 ? curMonthBudget / curMonthClicks : 0;
  const bCRL = curMonthClicks > 0 ? curMonthLeads / curMonthClicks : 0;
  const bCPL = curMonthLeads > 0 ? curMonthBudget / curMonthLeads : 0;
  const bCR2 = curMonthLeads > 0 ? curMonthBooked / curMonthLeads : 0;
  const blendedCpa = curMonthBooked > 0 ? curMonthBudget / curMonthBooked : 0;
  const bCR3 = curMonthBooked > 0 ? curMonthCompleted / curMonthBooked : 0;
  const bCPA2 = curMonthCompleted > 0 ? curMonthBudget / curMonthCompleted : 0;
  const bCR4 = curMonthCompleted > 0 ? curMonthSent / curMonthCompleted : 0;
  const bCPA3 = curMonthSent > 0 ? curMonthBudget / curMonthSent : 0;
  const bCR5 = curMonthSent > 0 ? curMonthSigned / curMonthSent : 0;
  const blendedCac = curMonthSigned > 0 ? curMonthBudget / curMonthSigned : 0;

  // 4. Cumulative months summary
  let cumulativeSigned = calcInputs.startClients || 0;
  let gtBudget = 0;
  let gtLeads = 0;
  let gtBooked = 0;
  let gtCompleted = 0;
  let gtSigned = 0;

  const summaryRows = MONTHS.map((m, mi) => {
    let b = 0, l = 0, bk = 0, co = 0, si = 0;
    CH.forEach((_, ci) => {
      const r = computeChannelMetrics(planState[ci][mi]);
      b += planState[ci][mi].budget;
      l += r.leads;
      bk += r.booked;
      co += r.completed;
      si += r.signed;
    });
    cumulativeSigned += si;
    gtBudget += b;
    gtLeads += l;
    gtBooked += bk;
    gtCompleted += co;
    gtSigned += si;

    const cac = si > 0 ? b / si : 0;
    return { m, b, l, bk, co, si, cac, cumulativeSigned };
  });

  const gtCac = gtSigned > 0 ? gtBudget / gtSigned : 0;

  // Safe input handler for table cells
  const handleCellBlur = (ci: number, field: keyof ChannelMonthState, valStr: string) => {
    let v = parseFloat(valStr.replace(',', '.')) || 0;
    if (field.startsWith('cr')) {
      v = v / 100;
    }
    
    // Only update state if value has actually changed
    const currentVal = planState[ci][curMonth][field];
    if (currentVal === v) return;

    setPlanState(prev => {
      const next = prev.map((ch, cIndex) => {
        if (cIndex !== ci) return ch;
        return ch.map((m, mIndex) => {
          if (mIndex !== curMonth) return m;
          return { ...m, [field]: v };
        });
      });
      return next;
    });
  };

  // Roadmap CRUD handlers
  const handleToggleComplete = (id: string) => {
    setRoadmapTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (month: string) => {
    const newTask: RoadmapTask = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      month,
      phase: month === 'Июль' ? 'Фаза 1' : (['Август', 'Сентябрь'].includes(month) ? 'Фаза 2' : 'Фаза 3'),
      initiative: 'Новая инициатива',
      source: 'v3',
      type: 'Paid',
      comment: '',
      completed: false
    };
    setRoadmapTasks(prev => [...prev, newTask]);
    triggerFlash('➕ Инициатива добавлена ✓');
  };

  const handleUpdateTaskField = (id: string, field: keyof RoadmapTask, value: any) => {
    setRoadmapTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    showConfirm(
      'Удаление инициативы',
      'Вы уверены, что хотите удалить эту инициативу из роадмапа? Это действие нельзя будет отменить.',
      () => {
        setRoadmapTasks(prev => prev.filter(t => t.id !== id));
        triggerFlash('✕ Инициатива удалена ✓');
      }
    );
  };

  // Custom budget table rendering shared for tabs
  const renderSharedBudgetTable = (tabId: string) => {
    return (
      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>Статья</th>
              {groups.map((g, idx) => <th key={idx}>{g.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {CH.map((c, ci) => {
              let tag = null;
              if (c.n.startsWith('Meta')) tag = <span className="tag good ml-1.5">работает сейчас</span>;
              else if (c.n.startsWith('LinkedIn Ads')) tag = <span className="tag ml-1.5">повторный тест</span>;
              return (
                <tr key={ci}>
                  <td>{c.n}{tag}</td>
                  {groups.map((g, gi) => {
                    let sum = 0;
                    g.idx.forEach(mi => sum += planState[ci][mi].budget);
                    const avg = sum / g.idx.length;
                    const pct = phaseMonthly[gi] > 0 ? Math.round(avg / phaseMonthly[gi] * 100) : 0;
                    return (
                      <td key={gi}>{pct}% · ${(avg / 1000).toFixed(1)}K</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td><b>Итого / мес</b></td>
              {phaseMonthly.map((v, gi) => (
                <td key={gi}><b>${(v / 1000).toFixed(1)}K</b></td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="mediaplan-container min-h-screen bg-[#0b1020] text-[#e8edf7] font-sans pb-16">
      {/* Scoped CSS Style Sheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mediaplan-container {
          --bg:#0b1020; --panel:#121a30; --panel2:#0f1730; --line:#22304f;
          --ink:#e8edf7; --mut:#93a2c4; --brand:#4f7cff; --brand2:#22d3ee;
          --good:#34d399; --warn:#fbbf24; --bad:#f87171; --orig:#7c8db5; --imp:#34d399;
          --chip:#1a2440;
          background: var(--bg);
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          line-height: 1.5;
        }
        .mediaplan-container * { box-sizing: border-box; }
        .mediaplan-container a { color: var(--brand2); }
        .mediaplan-container .wrap { max-width: 1240px; margin: 0 auto; padding: 0 20px; }
        .mediaplan-container header.top { position: sticky; top: 0; z-index: 50; background: rgba(11,16,32,.86); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
        .mediaplan-container .topbar { display: flex; align-items: center; gap: 18px; min-height: 62px; padding: 6px 0; flex-wrap: wrap; }
        .mediaplan-container .logo { font-weight: 800; letter-spacing: .3px; font-size: 18px; display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
        .mediaplan-container .logo .dot { width: 11px; height: 11px; border-radius: 50%; background: linear-gradient(135deg,var(--brand),var(--brand2)); box-shadow: 0 0 14px var(--brand2); }
        .mediaplan-container nav.tabs { display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap; }
        .mediaplan-container nav.tabs button { background: transparent; border: 1px solid transparent; color: var(--mut); padding: 8px 13px; border-radius: 9px; cursor: pointer; font-size: 13.5px; font-weight: 600; }
        .mediaplan-container nav.tabs button:hover { color: var(--ink); background: var(--chip); }
        .mediaplan-container nav.tabs button.active { color: #fff; background: linear-gradient(135deg,var(--brand),#3b63e0); border-color: #3b63e0; }
        .mediaplan-container section.page { display: none; padding: 34px 0 80px; }
        .mediaplan-container section.page.active { display: block; animation: fade-mediaplan .3s ease; }
        @keyframes fade-mediaplan { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .mediaplan-container h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: -.5px; color: #fff; }
        .mediaplan-container h2 { font-size: 23px; margin: 34px 0 14px; letter-spacing: -.3px; color: #fff; }
        .mediaplan-container h3 { font-size: 16px; margin: 0 0 8px; color: #fff; }
        .mediaplan-container .sub { color: var(--mut); font-size: 15px; max-width: 820px; }
        .mediaplan-container .hero { background: radial-gradient(1200px 400px at 15% -20%,rgba(79,124,255,.22),transparent), radial-gradient(900px 400px at 100% 0%,rgba(34,211,238,.14),transparent); border: 1px solid var(--line); border-radius: 20px; padding: 38px 34px; margin-bottom: 8px; }
        .mediaplan-container .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 26px; }
        .mediaplan-container .kpi { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; }
        .mediaplan-container .kpi .n { font-size: 27px; font-weight: 800; letter-spacing: -.5px; color: #fff; }
        .mediaplan-container .kpi .l { color: var(--mut); font-size: 12.5px; margin-top: 3px; }
        .mediaplan-container .grid { display: grid; gap: 16px; }
        .mediaplan-container .cols-3 { grid-template-columns: repeat(3, 1fr); }
        .mediaplan-container .cols-2 { grid-template-columns: repeat(2, 1fr); }
        .mediaplan-container .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
        .mediaplan-container .card h3 { display: flex; align-items: center; gap: 8px; }
        .mediaplan-container .card p { color: var(--mut); font-size: 14px; margin: 6px 0; }
        .mediaplan-container .tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: var(--chip); color: var(--mut); border: 1px solid var(--line); }
        .mediaplan-container .tag.good { color: var(--good); border-color: #1f5641; background: #0f2a20; }
        .mediaplan-container .tag.warn { color: var(--warn); border-color: #5a4a17; background: #2a2310; }
        .mediaplan-container .tag.bad { color: var(--bad); border-color: #5a2323; background: #2a1414; }
        .mediaplan-container ul.clean { margin: 8px 0 0; padding-left: 18px; color: var(--mut); font-size: 14px; }
        .mediaplan-container ul.clean li { margin: 5px 0; }
        .mediaplan-container .funnel { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .mediaplan-container .frow { display: flex; align-items: center; gap: 14px; }
        .mediaplan-container .fbar { height: 44px; border-radius: 9px; display: flex; align-items: center; padding: 0 16px; font-weight: 700; color: #04122a; background: linear-gradient(90deg,var(--brand2),var(--brand)); white-space: nowrap; }
        .mediaplan-container .fmeta { color: var(--mut); font-size: 13px; }
        .mediaplan-container table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .mediaplan-container th, .mediaplan-container td { padding: 9px 10px; text-align: right; border-bottom: 1px solid var(--line); white-space: nowrap; }
        .mediaplan-container th:first-child, .mediaplan-container td:first-child { text-align: left; }
        .mediaplan-container thead th { color: var(--mut); font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; background: var(--panel2); }
        .mediaplan-container tbody tr:hover { background: #0e1830; }
        .mediaplan-container tfoot td { font-weight: 800; border-top: 2px solid var(--line); background: #0e1830; }
        .mediaplan-container .tblwrap { overflow: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); }
        .mediaplan-container .cmp { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
        .mediaplan-container .cmp .col { padding: 20px; }
        .mediaplan-container .cmp .col.orig { background: var(--panel2); }
        .mediaplan-container .cmp .col.imp { background: linear-gradient(180deg,rgba(52,211,153,.06),transparent); }
        .mediaplan-container .cmp .hd { display: flex; align-items: center; gap: 9px; font-weight: 800; margin-bottom: 6px; font-size: 15px; }
        .mediaplan-container .cmp .hd.orig { color: var(--orig); }
        .mediaplan-container .cmp .hd.imp { color: var(--imp); }
        .mediaplan-container .issue { border: 1px solid var(--line); border-radius: 12px; padding: 15px 17px; margin: 12px 0; background: var(--panel); }
        .mediaplan-container .issue .h { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; }
        .mediaplan-container .issue .sev { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
        .mediaplan-container .sev.crit { background: #2a1414; color: var(--bad); border: 1px solid #5a2323; }
        .mediaplan-container .sev.med { background: #2a2310; color: var(--warn); border: 1px solid #5a4a17; }
        .mediaplan-container .issue .body { color: var(--mut); font-size: 14px; margin-top: 8px; }
        .mediaplan-container .issue .fix { margin-top: 10px; font-size: 13.5px; color: var(--ink); background: #0f2a20; border: 1px solid #1f5641; border-radius: 9px; padding: 10px 12px; }
        .mediaplan-container .fix b { color: var(--good); }
        .mediaplan-container .calc { display: grid; grid-template-columns: 340px 1fr; gap: 18px; }
        .mediaplan-container .controls .row { margin: 0 0 15px; }
        .mediaplan-container .controls label { display: flex; justify-content: space-between; font-size: 13px; color: var(--mut); margin-bottom: 6px; }
        .mediaplan-container .controls label b { color: var(--ink); font-variant-numeric: tabular-nums; }
        .mediaplan-container .hint { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: var(--chip); border: 1px solid var(--line); color: var(--mut); font-size: 10px; font-weight: 700; margin-left: 5px; cursor: help; flex-shrink: 0; }
        .mediaplan-container .hint:hover { color: #fff; border-color: var(--brand); }
        .mediaplan-container .lbltxt { display: inline-flex; align-items: center; }
        .mediaplan-container input[type=range] { width: 100%; accent-color: var(--brand); cursor: pointer; }
        .mediaplan-container input.num { width: 100%; background: #0b1224; border: 1px solid var(--line); color: var(--ink); border-radius: 8px; padding: 8px 10px; font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
        .mediaplan-container .out { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .mediaplan-container .out .o { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 15px; }
        .mediaplan-container .out .o .n { font-size: 25px; font-weight: 800; letter-spacing: -.5px; color: #fff; }
        .mediaplan-container .out .o .l { color: var(--mut); font-size: 12px; margin-top: 2px; }
        .mediaplan-container .verdict { margin-top: 14px; padding: 13px 15px; border-radius: 11px; font-size: 14px; font-weight: 600; }
        .mediaplan-container .monthtabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 14px; }
        .mediaplan-container .monthtabs button { background: var(--chip); border: 1px solid var(--line); color: var(--mut); padding: 7px 14px; border-radius: 9px; cursor: pointer; font-weight: 700; font-size: 13px; transition: all 150ms; }
        .mediaplan-container .monthtabs button:hover { color: var(--ink); border-color: var(--brand); }
        .mediaplan-container .monthtabs button.active { background: linear-gradient(135deg,var(--brand),#3b63e0); color: #fff; border-color: #3b63e0; }
        .mediaplan-container .mp-in { width: 74px; background: #0b1224; border: 1px solid var(--line); color: var(--ink); border-radius: 6px; padding: 5px 6px; font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
        .mediaplan-container .mp-in.pct { width: 56px; }
        .mediaplan-container .mp-zero { background: var(--chip); border: 1px solid var(--line); color: var(--mut); border-radius: 6px; padding: 5px 9px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 150ms; }
        .mediaplan-container .mp-zero:hover { border-color: var(--bad); color: var(--bad); background: rgba(248,113,113,.06); }
        .mediaplan-container tr.row-muted { opacity: 0.3; filter: grayscale(85%); transition: opacity 200ms; }
        .mediaplan-container tr.row-muted:hover { opacity: 0.85; }
        .mediaplan-container .mp-mute { background: var(--chip); border: 1px solid var(--line); color: var(--mut); border-radius: 6px; padding: 5px 8px; font-size: 11.5px; cursor: pointer; transition: all 150ms; display: inline-flex; align-items: center; justify-content: center; }
        .mediaplan-container .mp-mute:hover { border-color: var(--brand2); color: var(--brand2); background: rgba(34,211,238,.06); }
        .mediaplan-container .mp-mute.active { background: #22304f; color: var(--brand2); border-color: var(--brand2); }
        .mediaplan-container td.calc-cell { color: var(--brand2); font-variant-numeric: tabular-nums; }
        .mediaplan-container td.money { font-variant-numeric: tabular-nums; }
        .mediaplan-container .legend { display: flex; gap: 16px; flex-wrap: wrap; color: var(--mut); font-size: 12px; margin: 8px 0 0; }
        .mediaplan-container .legend span { display: inline-flex; align-items: center; gap: 6px; }
        .mediaplan-container .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
        .mediaplan-container .note { color: var(--mut); font-size: 12.5px; margin-top: 10px; font-style: italic; }
        .mediaplan-container .toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 14px 0 4px; }
        .mediaplan-container .toolbar .saved { font-size: 12.5px; color: var(--good); display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
        .mediaplan-container .toolbar .saved.flash { color: var(--brand2); text-shadow: 0 0 4px var(--brand2); }
        .mediaplan-container .tbtn { background: var(--chip); border: 1px solid var(--line); color: var(--ink); border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 150ms; }
        .mediaplan-container .tbtn:hover { border-color: var(--brand); color: #fff; background: #202d50; }
        .mediaplan-container .tbtn.warnb:hover { border-color: var(--bad); color: var(--bad); background: #2a1414; }
        .mediaplan-container .toolbar label.tbtn { margin: 0; }
        .mediaplan-container .roadmap { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 10px; }
        .mediaplan-container .rm { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 13px; }
        .mediaplan-container .rm .m { font-weight: 800; color: var(--brand2); font-size: 14px; }
        .mediaplan-container .rm .g { font-size: 12px; color: var(--mut); margin-top: 5px; }
        .mediaplan-container .rm .t { font-size: 22px; font-weight: 800; margin-top: 8px; color: #fff; }
        .mediaplan-container .pill { font-size: 11px; color: var(--mut); }

        .mediaplan-container .scenario-selector { display: flex; gap: 8px; align-items: center; background: var(--panel); border: 1px solid var(--line); padding: 8px 16px; border-radius: 12px; margin-top: 10px; width: fit-content; }
        .mediaplan-container .scenario-selector span { font-weight: 700; font-size: 13.5px; color: var(--mut); margin-right: 8px; }
        .mediaplan-container .scenario-selector button { background: var(--chip); border: 1px solid var(--line); color: var(--mut); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12.5px; font-weight: 700; transition: all 150ms; }
        .mediaplan-container .scenario-selector button:hover { color: var(--ink); border-color: var(--brand); }
        .mediaplan-container .scenario-selector button.active { background: linear-gradient(135deg,var(--brand),#3b63e0); color: #fff; border-color: #3b63e0; }

        .mediaplan-container .roadmap-grid { display: flex; flex-direction: column; gap: 24px; }
        .mediaplan-container .roadmap-month-section { border: 1px solid var(--line); border-radius: 16px; background: var(--panel2); padding: 20px; }
        .mediaplan-container .roadmap-month-title { font-size: 20px; font-weight: 800; color: var(--brand2); border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .mediaplan-container .roadmap-month-title span.phase-badge { font-size: 12px; color: #fff; background: var(--brand); padding: 3px 8px; border-radius: 6px; font-weight: 700; }
        .mediaplan-container .roadmap-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
        .mediaplan-container .roadmap-item { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; }
        .mediaplan-container .roadmap-item-header { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
        .mediaplan-container .roadmap-item-title { font-weight: 700; font-size: 14px; color: #fff; line-height: 1.4; }
        .mediaplan-container .roadmap-item-type { font-size: 11px; font-weight: 700; color: var(--brand2); text-transform: uppercase; background: rgba(34,211,238,.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(34,211,238,.2); height: fit-content; white-space: nowrap; }
        .mediaplan-container .roadmap-item-comment { font-size: 13px; color: var(--mut); margin-top: 6px; line-height: 1.4; flex-grow: 1; }
        .mediaplan-container .roadmap-item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: var(--mut); border-top: 1px solid rgba(255,255,255,0.03); padding-top: 6px; }
        .mediaplan-container .roadmap-item-source { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
        
        @media(max-width: 980px) {
          .mediaplan-container .kpis, .mediaplan-container .cols-3, .mediaplan-container .cols-2, .mediaplan-container .out { grid-template-columns: 1fr 1fr; }
          .mediaplan-container .calc, .mediaplan-container .cmp { grid-template-columns: 1fr; }
          .mediaplan-container .roadmap { grid-template-columns: 1fr 1fr 1fr; }
        }
        @media(max-width: 640px) {
          .mediaplan-container .kpis, .mediaplan-container .out { grid-template-columns: 1fr 1fr; }
          .mediaplan-container .cols-3, .mediaplan-container .cols-2 { grid-template-columns: 1fr; }
        }
        @media print {
          .mediaplan-container nav.tabs, .mediaplan-container header.top { position: static; }
          .mediaplan-container section.page { display: block!important; page-break-after: always; }
        }
        
        /* Interactive Roadmap CSS */
        .mediaplan-container .roadmap-item.completed { opacity: 0.55; border-color: rgba(52, 211, 153, 0.25); background: rgba(52, 211, 153, 0.01); }
        .mediaplan-container .roadmap-item.completed .roadmap-input-title { text-decoration: line-through; color: var(--mut); }
        .mediaplan-container .roadmap-btn-add { background: transparent; border: 1px dashed var(--line); color: var(--mut); font-weight: 700; border-radius: 12px; cursor: pointer; padding: 16px; font-size: 13px; text-align: center; transition: all 150ms; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 140px; width: 100%; }
        .mediaplan-container .roadmap-btn-add:hover { border-color: var(--brand); color: #fff; background: rgba(255,255,255,0.02); }
        .mediaplan-container .roadmap-input-title { background: transparent; border: none; font-weight: 700; font-size: 14px; color: #fff; line-height: 1.4; width: 100%; outline: none; padding: 2px 0; border-bottom: 1px dashed transparent; }
        .mediaplan-container .roadmap-input-title:focus { border-bottom-color: var(--brand); }
        .mediaplan-container .roadmap-textarea-comment { background: transparent; border: none; font-size: 13px; color: var(--mut); margin-top: 6px; line-height: 1.4; width: 100%; resize: none; outline: none; padding: 2px 0; border-bottom: 1px dashed transparent; height: 50px; font-family: inherit; }
        .mediaplan-container .roadmap-textarea-comment:focus { border-bottom-color: var(--brand); }
        .mediaplan-container .roadmap-select-type { background: var(--chip); border: 1px solid var(--line); border-radius: 4px; color: var(--brand2); font-size: 10px; font-weight: 700; outline: none; cursor: pointer; padding: 1px 4px; text-transform: uppercase; }
        .mediaplan-container .roadmap-input-source { background: transparent; border: none; font-size: 11px; color: var(--mut); width: 130px; outline: none; border-bottom: 1px dashed transparent; }
        .mediaplan-container .roadmap-input-source:focus { border-bottom-color: var(--brand); }
        .mediaplan-container .roadmap-item-delete { background: transparent; border: none; color: #ef4444; opacity: 0.3; cursor: pointer; padding: 4px; transition: opacity 150ms; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; }
        .mediaplan-container .roadmap-item-delete:hover { opacity: 1; }
        .mediaplan-container .roadmap-checkbox { width: 16px; height: 16px; accent-color: var(--good); cursor: pointer; border-radius: 4px; }
        
        /* List-view (строчный) layout */
        .mediaplan-container .roadmap-list.list-view { display: flex; flex-direction: column; gap: 8px; }
        .mediaplan-container .roadmap-list.list-view .roadmap-item { min-height: auto; padding: 10px 14px; flex-direction: row; }
        .mediaplan-container .roadmap-list.list-view .roadmap-btn-add { min-height: auto; padding: 10px 14px; border-radius: 12px; }
        .mediaplan-container .roadmap-view-switcher { display: flex; gap: 4px; background: var(--panel); border: 1px solid var(--line); padding: 4px; border-radius: 8px; width: fit-content; }
        .mediaplan-container .roadmap-view-switcher button { background: transparent; border: none; color: var(--mut); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-weight: 700; transition: all 150ms; }
        .mediaplan-container .roadmap-view-switcher button:hover { color: #fff; }
        .mediaplan-container .roadmap-view-switcher button.active { background: var(--chip); color: #fff; }


      `}} />

      <header className="top">
        <div className="wrap topbar">
          <div className="logo">
            <img 
              src="/images/logo-horizontal-green-white.png" 
              alt="InsurVoice" 
              style={{ height: '24px', display: 'block' }} 
            />
          </div>
          <nav className="tabs">
            <button
              onClick={() => handleTabClick('overview')}
              className={activeTab === 'overview' ? 'active' : ''}
            >
              Обзор
            </button>
            <button
              onClick={() => handleTabClick('original')}
              className={activeTab === 'original' ? 'active' : ''}
            >
              Стратегия (ориг.)
            </button>
            <button
              onClick={() => handleTabClick('improved')}
              className={activeTab === 'improved' ? 'active' : ''}
            >
              Стратегия v2
            </button>
            <button
              onClick={() => handleTabClick('v3')}
              className={activeTab === 'v3' ? 'active' : ''}
            >
              Стратегия v3
            </button>
            <button
              onClick={() => handleTabClick('calc')}
              className={activeTab === 'calc' ? 'active' : ''}
            >
              Калькулятор
            </button>
            <button
              onClick={() => handleTabClick('media')}
              className={activeTab === 'media' ? 'active' : ''}
            >
              Медиаплан
            </button>
            <button
              onClick={() => handleTabClick('roadmap')}
              className={activeTab === 'roadmap' ? 'active' : ''}
            >
              Роадмап
            </button>
          </nav>
        </div>
      </header>

      {/* Global Scenario Selector */}
      {(activeTab === 'calc' || activeTab === 'media') && (
        <div className="wrap" style={{ marginTop: '16px', marginBottom: '8px' }}>
          <div className="scenario-selector">
            <span>Версия медиаплана:</span>
            <button 
              className={activeScenario === 'realistic' ? 'active' : ''} 
              onClick={() => setActiveScenario('realistic')}
            >
              Реалистичный (Realistic)
            </button>
            <button 
              className={activeScenario === 'optimistic' ? 'active' : ''} 
              onClick={() => setActiveScenario('optimistic')}
            >
              Оптимистичный (Optimistic)
            </button>
            <button 
              className={activeScenario === 'pessimistic' ? 'active' : ''} 
              onClick={() => setActiveScenario('pessimistic')}
            >
              Пессимистичный (Pessimistic)
            </button>
          </div>
        </div>
      )}

      {/* ================= OVERVIEW ================= */}
      <section className={`page ${activeTab === 'overview' ? 'active' : ''}`}>
        <div className="wrap">
          <div className="hero">
            <span className="tag">GTM-стратегия · Рынок США · 2026</span>
            <h1 style={{ marginTop: '14px' }}>Голосовой AI для независимых страховых агентств</h1>
            <p className="sub">
              Цель — <b style={{ color: '#fff' }}>50 платящих агентств до конца 2026</b> и закрепление в статусе специализированного AI Voice-решения для независимых страховых агентств США. Модель роста — founder-led: прямые продажи, personalized outbound и продукт, который продаёт себя через живой звонок.
            </p>
            <div className="kpis">
              <div className="kpi">
                <div className="n">50</div>
                <div className="l">агентств до конца года</div>
              </div>
              <div className="kpi">
                <div className="n">~300</div>
                <div className="l">назначенных демо (вся воронка)</div>
              </div>
              <div className="kpi">
                <div className="n">${(totalGtmAll / 1000).toFixed(0)}–111K</div>
                <div className="l">GTM-бюджет за период</div>
              </div>
              <div className="kpi">
                <div className="n">${arpu}</div>
                <div className="l">целевой ARPU / мес</div>
              </div>
            </div>
          </div>

          <div className="grid cols-3" style={{ marginTop: '22px' }}>
            <div className="card">
              <h3>🎯 Позиционирование</h3>
              <p>«Каждый пропущенный звонок — это клиент, который уже говорит с вашим конкурентом.» AI отвечает 24/7 и превращает входящие в назначенные встречи без найма персонала.</p>
            </div>
            <div className="card">
              <h3>📞 Продукт продаёт себя</h3>
              <p>Публичный номер: позвони, поговори с AI, за 2 минуты оцени качество. Демо = реклама + квалификация + снятие возражения «звучит как робот».</p>
            </div>
            <div className="card">
              <h3>🚀 Каналы роста</h3>
              <p>Стартуем с прямого outbound, по мере появления кейсов смещаемся к повторяемым каналам, а в Q4 — к дистрибуции через партнёров и события. Бюджет каждую неделю перетекает в канал с лучшей ценой демо.</p>
            </div>
          </div>

          <h2>Каналы по фазам</h2>
          <p className="sub" style={{ marginBottom: '14px' }}>
            Каналы <b style={{ color: 'var(--ink)' }}>накапливаются</b>: каждая следующая фаза сохраняет работающие каналы предыдущей (и масштабирует их), а сверху добавляет новые. Ниже — что <b style={{ color: 'var(--ink)' }}>добавляется</b> на каждой фазе.
          </p>
          <div className="grid cols-3">
            <div className="card">
              <span className="tag good">Фаза 1 · старт продаж</span>
              <ul className="clean" style={{ marginTop: '10px' }}>
                <li><b style={{ color: 'var(--ink)' }}>Meta (Paid Social)</b> — уже даёт лиды, масштабируем по CPL</li>
                <li><b style={{ color: 'var(--ink)' }}>Cold email</b> — ядро, привязка к реальному пропущенному звонку</li>
                <li><b style={{ color: 'var(--ink)' }}>LinkedIn Ads</b> — повторный тест таргета + founder-led органика</li>
                <li><b style={{ color: 'var(--ink)' }}>Тёплая сеть</b> — рекомендации, интро, прямые звонки</li>
                <li><b style={{ color: 'var(--ink)' }}>Google Search</b> — высокоинтентные запросы</li>
                <li><b style={{ color: 'var(--ink)' }}>Демо-номер</b> — как самостоятельный канал</li>
              </ul>
            </div>
            <div className="card">
              <span className="tag">Фаза 2 · повторяемость</span>
              <ul className="clean" style={{ marginTop: '10px' }}>
                <li style={{ listStyle: 'none', marginLeft: '-18px', color: 'var(--good)' }}>
                  <b>↑ Всё из Фазы 1 продолжает работать и масштабируется</b>
                </li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Ретаргетинг</b> и похожие аудитории</li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Вебинары</b> и живые демонстрации</li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Подкасты и отраслевые медиа</b></li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Профессиональные сообщества</b></li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Старт переговоров</b> с партнёрами и AMS-вендорами</li>
              </ul>
            </div>
            <div className="card">
              <span className="tag">Фаза 3 · дистрибуция</span>
              <ul className="clean" style={{ marginTop: '10px' }}>
                <li style={{ listStyle: 'none', marginLeft: '-18px', color: 'var(--good)' }}>
                  <b>↑ Всё из Фаз 1–2 работает и масштабируется</b>
                </li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Партнёрства</b> — кластеры, сети, AMS/CRM</li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Отраслевые события</b> — живое демо с AI</li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Реферальная программа</b> и видео-кейсы</li>
                <li><b style={{ color: 'var(--ink)' }}>＋ Medicare AEP</b> — сезонный спрос (окт–дек)</li>
              </ul>
            </div>
          </div>
          <p className="note">По мере накопления данных бюджет каждую неделю перетекает в каналы с лучшей ценой демо. Не в приоритете до 50 клиентов: широкие имиджевые кампании, TV/CTV, массовый direct mail, SEO как основной источник спроса.</p>

          <h2>Дорожная карта: путь к 50</h2>
          <div className="roadmap">
            <div className="rm"><div className="m">Июль</div><div className="g">Первые клиенты</div><div className="t">10</div><div className="pill">outbound + founder-led</div></div>
            <div className="rm"><div className="m">Август</div><div className="g">Повторяемость</div><div className="t">18</div><div className="pill">ретаргетинг, вебинары</div></div>
            <div className="rm"><div className="m">Сентябрь</div><div className="g">Юнит-экономика</div><div className="t">25</div><div className="pill">кейсы, лучшие каналы</div></div>
            <div className="rm"><div className="m">Октябрь</div><div className="g">Партнёрства + AEP</div><div className="t">34</div><div className="pill">события, Medicare</div></div>
            <div className="rm"><div className="m">Ноябрь</div><div className="g">Дистрибуция</div><div className="t">42</div><div className="pill">реферралы, партнёры</div></div>
            <div className="rm"><div className="m">Декабрь</div><div className="g">Цель года</div><div className="t">50</div><div className="pill">срочность конца года</div></div>
          </div>

          <div className="card" style={{ marginTop: '22px', borderColor: '#5a4a17', background: 'linear-gradient(180deg,rgba(251,191,36,.06),transparent)' }}>
            <h3>⚠️ Три версии стратегии перед вами</h3>
            <p>Вкладка <b style={{ color: 'var(--orig)' }}>«Стратегия (оригинал)»</b> — ваша исходная стратегия в презентационном виде. Вкладка <b style={{ color: 'var(--imp)' }}>«Стратегия v2»</b> — разбор правок side-by-side (честная юнит-экономика, разрешённое TCPA-противоречие, ёмкость продаж, retention, конкуренты, pricing). Вкладка <b style={{ color: 'var(--imp)' }}>«Стратегия v3 (финал)»</b> — единая чистая версия с уже встроенными правками, готовая к показу клиенту. Калькулятор и медиаплан — интерактивные и редактируемые.</p>
          </div>
        </div>
      </section>

      {/* ================= ORIGINAL ================= */}
      <section className={`page ${activeTab === 'original' ? 'active' : ''}`}>
        <div className="wrap">
          <h1>Стратегия <span style={{ color: 'var(--orig)' }}>— оригинальная версия</span></h1>
          <p className="sub">Презентационное представление вашего документа «как есть». Готово показывать клиенту.</p>

          <h2>1. Воронка роста</h2>
          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Фаза</th>
                  <th>Период</th>
                  <th>Цель (накоп.)</th>
                  <th>Новые</th>
                  <th>Сост. демо</th>
                  <th>Назнач. демо</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Фаза 1 · Product-Market Fit</td><td>23 июн – 31 июл</td><td>10</td><td>+10</td><td>~40</td><td>~60</td></tr>
                <tr><td>Фаза 2 · Повторяемая система</td><td>Авг – сен</td><td>25</td><td>+15</td><td>~60</td><td>~90</td></tr>
                <tr><td>Фаза 3 · Масштабирование</td><td>Окт – дек</td><td>50</td><td>+25</td><td>~100</td><td>~150</td></tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Итого</td>
                  <td>Июнь–Декабрь</td>
                  <td>50</td>
                  <td>+50</td>
                  <td>~200</td>
                  <td>~300</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="note">Конверсии: назначенное демо → состоявшееся ≈ 65%; состоявшееся → клиент ≈ 25%.</p>

          <h3 style={{ marginTop: '24px', fontSize: '18px' }}>Описание фаз</h3>
          <div className="grid cols-3" style={{ marginTop: '8px' }}>
            <div className="card">
              <span className="tag good">Фаза 1</span>
              <h3 style={{ marginTop: '8px' }}>Product-Market Fit</h3>
              <p className="pill">23 июня – 31 июля · цель 10 клиентов</p>
              <p>Главное ограничение — не спрос, а скорость поиска работающего канала и первых кейсов. Ставка на прямой outbound и личные продажи, максимальная плотность разговоров с рынком. Платный трафик — вспомогательный: тест гипотез, перехват спроса, сбор аудиторий для ретаргетинга.</p>
            </div>
            <div className="card">
              <span className="tag">Фаза 2</span>
              <h3 style={{ marginTop: '8px' }}>Повторяемая система продаж</h3>
              <p className="pill">Август – сентябрь · цель 25</p>
              <p>Переход от первых клиентов к предсказуемости. Первые кейсы включаются в маркетинг; запускаются ретаргетинг, вебинары, медиа/подкасты, работа в сообществах; стартуют переговоры с партнёрами. Задача — найти каналы с приемлемой стоимостью демо и подтверждённой юнит-экономикой.</p>
            </div>
            <div className="card">
              <span className="tag">Фаза 3</span>
              <h3 style={{ marginTop: '8px' }}>Масштабирование</h3>
              <p className="pill">Октябрь – декабрь · цель 50</p>
              <p>Рывок за счёт дистрибуции: партнёрства и агентские кластеры, отраслевые события, сезонный спрос (Medicare AEP), реферальная программа. Бюджет диверсифицируется, инвестиции идут в подтверждённые каналы и партнёров с доступом к сотням агентств.</p>
            </div>
          </div>

          <h3 style={{ marginTop: '24px', fontSize: '18px' }}>Помесячный план</h3>
          <div className="grid cols-2" style={{ marginTop: '8px' }}>
            <div className="card">
              <h3>Июнь · Фундамент <span className="pill">Фаза 1</span></h3>
              <ul className="clean">
                <li>Публичный номер, по которому любой может поговорить с AI</li>
                <li>3 лендинга под ключевые сценарии (after-hours, speed-to-lead, renewals)</li>
                <li>ICP-базы и сегментация; настройка и прогрев email-доменов</li>
                <li>Запуск поисковых кампаний по высокоинтентным запросам</li>
                <li>Сценарий демо и материалы для продаж</li>
              </ul>
            </div>
            <div className="card">
              <h3>Июль · Первые 10 клиентов <span className="pill">Фаза 1</span></h3>
              <ul className="clean">
                <li>Масштабный холодный outbound + ежедневный LinkedIn</li>
                <li>Работа с тёплой сетью и рекомендациями</li>
                <li>Персональные демонстрации, быстрый сбор обратной связи</li>
                <li>Результат: 10 клиентов + первые дизайн-партнёры и кейсы</li>
              </ul>
            </div>
            <div className="card">
              <h3>Август · Повторяемость <span className="pill">Фаза 2</span></h3>
              <ul className="clean">
                <li>Ретаргетинг и тест похожих аудиторий</li>
                <li>Первый открытый вебинар; медиа и подкасты</li>
                <li>Работа в профессиональных сообществах</li>
                <li>Старт переговоров с партнёрами и AMS-вендорами → 17–18 клиентов</li>
              </ul>
            </div>
            <div className="card">
              <h3>Сентябрь · 25 клиентов <span className="pill">Фаза 2</span></h3>
              <ul className="clean">
                <li>Первые кейсы и отзывы в маркетинговых материалах</li>
                <li>Второй вебинар; больше инвестиций в лучший по цене демо канал</li>
                <li>Подготовка к событиям Q4; формирование партнёрского пайплайна</li>
                <li>Результат: ~25 клиентов и подтверждённая юнит-экономика</li>
              </ul>
            </div>
            <div className="card">
              <h3>Октябрь · Ускорение + партнёры <span className="pill">Фаза 3</span></h3>
              <ul className="clean">
                <li>Участие в крупных отраслевых события, живое демо с AI</li>
                <li>Кампании для Medicare в период AEP</li>
                <li>Первые партнёрские соглашения; масштабирование каналов</li>
              </ul>
            </div>
            <div className="card">
              <h3>Ноябрь · Дистрибуция <span className="pill">Фаза 3</span></h3>
              <ul className="clean">
                <li>Запуск реферальной программы</li>
                <li>Развитие партнёрской дистрибуции; видео-кейсы</li>
                <li>Больше инвестиций в 1–2 самых эффективных канала</li>
              </ul>
            </div>
            <div className="card">
              <h3>Декабрь · Цель 50 <span className="pill">Фаза 3</span></h3>
              <ul className="clean">
                <li>Работа с агентствами, откладывавшими решение</li>
                <li>Кейсы и рекомендации существующих клиентов</li>
                <li>Активизация партнёрского пайплайна; сценарии продлений</li>
                <li>Результат: 50 клиентов и предсказуемая модель роста</li>
              </ul>
            </div>
            <div className="card" style={{ borderColor: '#3b63e0', background: 'linear-gradient(180deg,rgba(79,124,255,.06),transparent)' }}>
              <h3>Логика дорожной карты</h3>
              <p>Июнь — инфраструктура · Июль — первые 10 и кейсы · Август–сентябрь — повторяемая система и 25 · Октябрь–декабрь — масштабирование через партнёрства, сезонный спрос и подтверждённые каналы до 50.</p>
            </div>
          </div>

          <h2>2. ICP — приоритетные сегменты</h2>
          <div className="grid cols-2">
            <div className="card">
              <h3><span className="tag good">Tier 1</span> Независимые P&C (Personal Lines), 2–15 чел.</h3>
              <ul className="clean">
                <li>Авто/дом-страхование, большой поток входящих и интернет-лидов</li>
                <li>Активно закупают лиды / инвестируют в рекламу — чувствительны к скорости</li>
                <li>Быстрорастущие и новые агентства без ресепшн-покрытия</li>
                <li>Владелец лично отвечает на звонки — боль ощущается ежедневно</li>
              </ul>
            </div>
            <div className="card">
              <h3><span className="tag">Tier 2</span> Для масштабирования</h3>
              <ul className="clean">
                <li>Medicare / Health — пик в AEP (15 окт – 7 дек)</li>
                <li>Commercial Lines — длиннее цикл, меньше входящих</li>
                <li>Многоофисные — высокий LTV, долгое принятие решений</li>
              </ul>
            </div>
          </div>

          <h2>3. Позиционирование</h2>
          <div className="grid cols-3">
            <div className="card">
              <h3>Потерянные звонки = потерянная выручка</h3>
              <p>Пропущенное обращение — финансовая, а не операционная проблема. Особенно у тех, кто покупает лиды.</p>
            </div>
            <div className="card">
              <h3>Голос должен звучать естественно</h3>
              <p>Главное возражение — «робот». Снимается не описанием, а живым звонком с AI.</p>
            </div>
            <div className="card">
              <h3>Усиливает команду, а не заменяет</h3>
              <p>Нерабочее время, пики, ситуации когда не успевают ответить. Дополнительный слой покрытия.</p>
            </div>
          </div>

          <h2>4. Каналы привлечения (приоритеты тестирования)</h2>
          <div className="grid cols-2">
            <div className="card">
              <h3>#1 Cold Email <span className="tag">ядро</span></h3>
              <p>~2 000 писем/нед → 300–500/день с прогретых доменов. Привязка к реальному пропущенному звонку. KPI: reply &gt;5%, письмо→демо &gt;0,7%.</p>
            </div>
            <div className="card">
              <h3>#2 Founder-led LinkedIn</h3>
              <p>Точечные приглашения + личные сообщения + контент с реальными разговорами AI. KPI: accept &gt;25%, →демо &gt;5%.</p>
            </div>
            <div className="card">
              <h3>#3 Демо как канал</h3>
              <p>Публичный номер во всех точках контакта. KPI: доля позвонивших, записавшихся на полноценное демо.</p>
            </div>
            <div className="card">
              <h3>#4 Google Search</h3>
              <p>«AI receptionist for insurance», «after-hours answering service». KPI: стоимость демо &lt;$300.</p>
            </div>
          </div>
          <p className="note">Q3 (авг–сен): ретаргетинг, вебинары, подкасты, сообщества. Q4: партнёрства (кластеры, AMS), отраслевые события, реферальная программа.</p>

          <h2>5. Бюджет по фазам</h2>
          {renderSharedBudgetTable('original')}
          <p className="note" style={{ marginTop: '10px' }}>
            Итого GTM за июль–декабрь ≈ <b style={{ color: 'var(--ink)' }}>${fmt(totalGtmAll)}</b> — считается автоматически по цифрам из медиаплана (вкладка «Медиаплан VII–XII»); поменяете бюджет там — обновится и здесь.
          </p>
          <p className="note" style={{ fontStyle: 'normal' }}>
            <b style={{ color: 'var(--ink)' }}>Факт сегодня:</b> Meta уже приносит лиды при тестовом спенде ~$100 — это первый канал на масштабирование, как только подтвердится CPL и стоимость назначенного демо. <b style={{ color: 'var(--ink)' }}>LinkedIn Ads (таргет)</b> возвращается в план отдельной строкой как повторный тест, параллельно с органическим founder-led LinkedIn.
          </p>

          <h2>6. Целевые метрики</h2>
          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Уровень</th>
                  <th>Метрика</th>
                  <th>Цель</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Лидген</td><td>Email Reply Rate</td><td>&gt;5%</td></tr>
                <tr><td>Лидген</td><td>Cost per Booked Demo (Paid)</td><td>&lt;$300–400</td></tr>
                <tr><td>Продажи</td><td>Booked → Completed Demo</td><td>&gt;65%</td></tr>
                <tr><td>Продажи</td><td>Completed → Closed Won</td><td>&gt;25%</td></tr>
                <tr><td>Юнит-эк.</td><td>Blended CAC</td><td>&lt;$2 500</td></tr>
                <tr><td>Удержание</td><td>Monthly Logo Churn</td><td>&lt;3%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= IMPROVED ================= */}
      <section className={`page ${activeTab === 'improved' ? 'active' : ''}`}>
        <div className="wrap">
          <h1>Стратегия <span style={{ color: 'var(--imp)' }}>v2 — с правками</span></h1>
          <p className="sub">Та же стратегия, но с закрытыми пробелами. Слева — как было, справа — как усилить. Ниже — 5 критических правок и достроенные разделы, которых в оригинале не было.</p>

          <h2>Оригинал → v2: ключевые сдвиги</h2>
          <div className="cmp">
            <div className="col orig">
              <div className="hd orig">● Оригинал</div>
              <b>CAC $2–2,5K, экономика «устойчива»</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>CAC = только GTM-бюджет ($105K/50), <u>без зарплаты продавца</u>, который ведёт все сделки и онбординг.</p>
            </div>
            <div className="col imp">
              <div className="hd imp">✔ v2</div>
              <b>CAC с зарплатой sales-менеджера</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>Добавляем стоимость продавца (его подписываем как фаундера, но это оплачиваемая позиция). Это умеренная, но реальная статья CAC — см. калькулятор.</p>
            </div>
          </div>
          <div className="cmp" style={{ marginTop: '14px' }}>
            <div className="col orig">
              <div className="hd orig">● Оригинал</div>
              <b>Churn &lt;3%/мес — заявлен как цель</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>На этой цифре висит весь LTV, но retention не является рабочим потоком: только «онбординг для Founding 10».</p>
            </div>
            <div className="col imp">
              <div className="hd imp">✔ v2</div>
              <b>Retention = отдельный поток + сценарии</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>Планируем при 3/5/7%. Метрики активации (звонки принято, лиды пойманы, $ возвращено), time-to-value, разбор оттока. Ранний SMB-churn обычно 4–6%.</p>
            </div>
          </div>
          <div className="cmp" style={{ marginTop: '14px' }}>
            <div className="col orig">
              <div className="hd orig">● Оригинал</div>
              <b>Позиционируемся как inbound / after-hours</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>Но самые сильные ROI-сценарии — speed-to-lead по купленным лидам, продления, ночные claim — это <u>исходящие</u> звонки.</p>
            </div>
            <div className="col imp">
              <div className="hd imp">✔ v2</div>
              <b>TCPA-развилка решена явно</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>FCC 2024: AI-голос = «artificial voice», для звонков на мобильные нужен prior express consent. Inbound-first + отдельный consent-flow для speed-to-lead, иначе теряем сильнейшую историю ценности.</p>
            </div>
          </div>
          <div className="cmp" style={{ marginTop: '14px' }}>
            <div className="col orig">
              <div className="hd orig">● Оригинал</div>
              <b>Всё на одном продавце до конца года</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>50 сделок = ~200 демо = ~1,5 демо/день + онбординг 50 SMB + outbound + партнёрства. Один sales-менеджер это не вывезет.</p>
            </div>
            <div className="col imp">
              <div className="hd imp">✔ v2</div>
              <b>Второй продавец / SDR заложен рано</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>SDR на генерацию демо + второй закрывающий/помощь по онбордингу уже в августе — до того как ёмкость продаж станет узким горлышком.</p>
            </div>
          </div>
          <div className="cmp" style={{ marginTop: '14px' }}>
            <div className="col orig">
              <div className="hd orig">● Оригинал</div>
              <b>Цель 50 back-loaded на Q4</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>Последние +25 держатся на партнёрствах, реферралах и одном событии — самых длинных и непроверенных каналах.</p>
            </div>
            <div className="col imp">
              <div className="hd imp">✔ v2</div>
              <b>Партнёрства стартуют в июле, буфер +15%</b>
              <p style={{ color: 'var(--mut)', fontSize: '14px' }}>Переговоры с AMS/кластерами начинаем сразу (цикл — месяцы). Медиаплан строим с запасом ~57–60 подписаний, чтобы 50 были базой, а не потолком.</p>
            </div>
          </div>

          <h2>Критические проблемы (приоритет)</h2>
          <div className="issue">
            <div className="h"><span className="sev crit">CRIT 1</span> CAC занижен — в нём нет зарплаты продавца</div>
            <div className="body">Заявленный CAC $2–2,5K учитывает только GTM-бюджет и <b>не включает зарплату sales-менеджера</b>, который ведёт все сделки (его подписываете как фаундера, но это оплачиваемая позиция, а не бесплатное время). Это реальная статья затрат: при загрузке продавца CAC растёт, и её нужно закладывать сразу, чтобы «экономика масштабируема» была честным выводом.</div>
            <div className="fix"><b>Фикс:</b> добавить стоимость продаж в CAC (GTM + зарплата продавца/AE, разнесённая на сделки). В калькуляторе — две цифры: «без стоимости продаж» и «с зарплатой продавца».</div>
          </div>

          <div className="issue">
            <div className="h"><span className="sev crit">CRIT 2</span> Churn &lt;3% — допущение, а не план; на нём держится весь LTV</div>
            <div className="body">Вся LTV (~$20K) висит на одной непроверенной цифре. Для нового продукта, продаваемого несведущим SMB-владельцам, ранний месячный churn обычно 4–6%+. При 5% срок жизни падает с 33 до 20 мес, LTV — на ~40%. Retention в стратегии почти не адресован.</div>
            <div className="fix"><b>Фикс:</b> retention как отдельный поток. Метрики активации (звонков принято, лидов поймано, $ возвращено на клиента), time-to-value, разбор драйверов оттока. Планировать при 3/5/7%.</div>
          </div>

          <div className="issue">
            <div className="h"><span className="sev crit">CRIT 3</span> Противоречие TCPA: позиционирование inbound, а ценность — в outbound</div>
            <div className="body">Комплаенс советует inbound / after-hours. Но сильнейшие ROI-сценарии (speed-to-lead по купленным интернет-лидам, продления, ночные claim) — исходящие звонки. По FCC 2024 AI-голос требует prior express consent для звонков на мобильные. Противоречие не разрешено и бьёт по value prop.</div>
            <div className="fix"><b>Фикс:</b> либо inbound-only (переписать сценарии ценности), либо строить consent-flow для outbound speed-to-lead. Решить явно — это влияет на весь оффер.</div>
          </div>

          <div className="issue">
            <div className="h"><span className="sev crit">CRIT 4</span> Ёмкость продаж — один менеджер не закроет 50 сделок</div>
            <div className="body">50 сделок = ~200 состоявшихся демо = ~1,5 демо каждый рабочий день + онбординг 50 SMB + outbound + партнёрства + контент. Всё это на одном продавце (которого подписываем как фаундера) не помещается. Ёмкость продаж — связывающее ограничение, и второй человек в плане недофинансирован.</div>
            <div className="fix"><b>Фикс:</b> заложить SDR (генерация демо) и второго закрывающего/помощь по онбордингу с августа. Определить, при каком числе демо/нед первый продавец перестаёт справляться.</div>
          </div>

          <div className="issue">
            <div className="h"><span className="sev crit">CRIT 5</span> Цель 50 back-loaded на самые недоказанные каналы</div>
            <div className="body">Последние +25 в Q4 держатся на партнёрствах (цикл — месяцы), реферралах (нужны довольные удержанные клиенты) и одном событии. Если партнёрства сдвинутся, Q4 падает на тот же outbound, который дал 10–25.</div>
            <div className="fix"><b>Фикс:</b> партнёрские переговоры с июля. Медиаплан с буфером. Не ставить всю Q4 на один ивент.</div>
          </div>

          <h2>Разделы, которых не было в оригинале</h2>
          <div className="grid cols-2">
            <div className="issue">
              <div className="h"><span className="sev med">GAP</span> Конкурентный анализ</div>
              <div className="body">Ни слова, почему InsurVoice, а не горизонтальный AI-ресепшн, не фича AMS-вендора, не answering service за $200–400/мес, не «ничего не делать». Реальный конкурент маленького агентства — сервис за $15/час.</div>
              <div className="fix"><b>Добавить:</b> раздел competitive + «why us / why now», позиционирование против альтернатив.</div>
            </div>
            <div className="issue">
              <div className="h"><span className="sev med">GAP</span> Pricing и глубина продукта</div>
              <div className="body">$600 ARPU — допущение без модели (за место? минуту? звонок? flat?). У голосового AI переменный COGS (телефония + LLM/мин) — от модели зависит маржа. Без интеграции с AMS (Applied Epic, EZLynx, HawkSoft, AMS360) продукт = дорогой автоответчик → драйвер оттока.</div>
              <div className="fix"><b>Добавить:</b> модель ценообразования + маржинальность; AMS-интеграция как продуктовое требование, а не только канал.</div>
            </div>
            <div className="issue">
              <div className="h"><span className="sev med">GAP</span> Метрики доставки ценности</div>
              <div className="body">Воронка измеряет путь до продажи, но не то, доставляет ли продукт ценность после. Нет метрик: звонков принято, лидов поймано, $ возвращено на клиента — а это и раннее выявление оттока, и топливо для кейсов и ROI-калькулятора.</div>
              <div className="fix"><b>Добавить:</b> продуктовые KPI пост-продажи в еженедельный обзор.</div>
            </div>
            <div className="issue">
              <div className="h"><span className="sev med">GAP</span> Fit продавца (которого подписываем как фаундера)</div>
              <div className="body">Вся «owner-to-owner» / warm-network механика держится на том, что продавец — US-based, native English, с credibility в страховании и убедительно выступает как владелец. Это несущее допущение, которое надо проверить при найме.</div>
              <div className="fix"><b>Проверить:</b> нанимать US-based продавца с отраслевым бэкграундом; если такого fit нет — усиливать партнёрский заход, где доверие даёт партнёр, а не «фаундер».</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px', borderColor: '#1f5641', background: 'linear-gradient(180deg,rgba(52,211,153,.06),transparent)' }}>
            <h3>Итог v2</h3>
            <p>Оригинал силён как план привлечения спроса на Phase 1. Как «стратегия» он неполон: нет retention, pricing, продукта/интеграций, конкурентов и модели ёмкости. Три правки в первую очередь: <b style={{ color: 'var(--good)' }}>(1)</b> добавить зарплату продавца в CAC + стресс-тест churn, <b style={{ color: 'var(--good)' }}>(2)</b> разрешить inbound/outbound в TCPA и синхронизировать с value prop, <b style={{ color: 'var(--good)' }}>(3)</b> заложить второго продавца/SDR до того, как ёмкость станет горлышком.</p>
          </div>
        </div>
      </section>

      {/* ================= V3 FINAL ================= */}
      <section className={`page ${activeTab === 'v3' ? 'active' : ''}`}>
        <div className="wrap">
          <div className="hero" style={{ marginBottom: '22px' }}>
            <span className="tag">Рынок США · Независимые страховые агентства · 2026</span>
            <h1 style={{ marginTop: '14px' }}>InsurVoice.ai — путь к <span style={{ color: 'var(--imp)' }}>50 агентствам</span></h1>
            <p className="sub">Голосовой AI отвечает на звонки агентства 24/7 и превращает пропущенные обращения в назначенные встречи. Дальше — как за шесть месяцев дойти до 50 платящих независимых агентств в США: сегменты, каналы, экономика и помесячный план.</p>
          </div>

          <h2>1. Стратегический фокус</h2>
          <div className="card">
            <p style={{ color: 'var(--mut)', fontSize: '15px', margin: 0 }}>Цель — <b style={{ color: '#fff' }}>50 платящих агентств до конца 2026</b> и статус специализированного AI Voice-решения для независимых страховых агентств США. Главное ограничение на старте — не спрос, а скорость поиска работающего канала и первых кейсов. Поэтому основа — прямые продажи и personalized outbound, а продукт продаёт себя через живой звонок с AI. Ключевой принцип коммуникации: <b style={{ color: 'var(--ink)' }}>«не рассказывать о продукте, а давать его попробовать»</b>.</p>
          </div>

          <h2>2. Воронка и фазы роста</h2>
          <div className="tblwrap">
            <table>
              <thead><tr><th>Фаза</th><th>Период</th><th>Цель (накоп.)</th><th>Новые</th><th>Сост. демо</th><th>Назнач. демо</th></tr></thead>
              <tbody>
                <tr><td>Фаза 1 · Product-Market Fit</td><td>Июль</td><td>10</td><td>+10</td><td>~40</td><td>~60</td></tr>
                <tr><td>Фаза 2 · Повторяемая система</td><td>Авг – сен</td><td>25</td><td>+15</td><td>~60</td><td>~90</td></tr>
                <tr><td>Фаза 3 · Масштабирование</td><td>Окт – дек</td><td>50</td><td>+25</td><td>~100</td><td>~150</td></tr>
              </tbody>
              <tfoot><tr><td>Итого</td><td>Июль–Декабрь</td><td>50</td><td>+50</td><td>~200</td><td>~300</td></tr></tfoot>
            </table>
          </div>
          <div className="grid cols-3" style={{ marginTop: '14px' }}>
            <div className="card"><span className="tag good">Фаза 1</span><h3 style={{ marginTop: '8px' }}>Product-Market Fit</h3>
              <p>Прямой outbound + Meta (уже даёт лиды) + личные продажи. Запуск демо-номера, ICP-баз, 3 лендингов, ежедневный LinkedIn. Первые кейсы и 10 дизайн-партнёров.</p></div>
            <div className="card"><span className="tag">Фаза 2</span><h3 style={{ marginTop: '8px' }}>Повторяемая система</h3>
              <p>Тест Reddit ($600-$1500), LinkedIn Ads re-test (Owner/Principal), топ-20 партнёров, афилиейт. В сентябре: открытый вебинар, закрытие 3-5 пилотов, X twitter, видео для посадочных. <b style={{ color: 'var(--imp)' }}>Нанимаем SDR/Sellers с августа</b>.</p></div>
            <div className="card"><span className="tag">Фаза 3</span><h3 style={{ marginTop: '8px' }}>Масштабирование</h3>
              <p>Отраслевые события (live AI demo), сезонный Medicare AEP (15 окт – 7 дек), Google Ads грант, реферальная программа, дожим сделок (delayed decisions) к декабрю.</p></div>
          </div>

          <h2>3. ICP — приоритетные сегменты</h2>
          <div className="grid cols-2">
            <div className="card"><h3><span className="tag good">Tier 1</span> Независимые P&amp;C (Personal Lines), 2–15 чел.</h3>
              <ul className="clean">
                <li>Большой поток входящих и интернет-лидов; скорость ответа = продажа</li>
                <li>Закупают лиды / инвестируют в рекламу — чувствительны к скорости</li>
                <li>Новые и быстрорастущие агентства без ресепшн-покрытия</li>
                <li>Владелец лично отвечает на звонки — боль ощущается ежедневно</li>
              </ul></div>
            <div className="card"><h3><span className="tag">Tier 2</span> Для масштабирования</h3>
              <ul className="clean">
                <li>Medicare / Health — пик в AEP (15 окт – 7 дек)</li>
                <li>Commercial Lines — длиннее цикл, меньше входящих</li>
                <li>Многоофисные — высокий LTV, долгое принятие решений</li>
              </ul></div>
          </div>

          <h2>4. Позиционирование, конкуренты, оффер</h2>
          <div className="grid cols-3">
            <div className="card"><h3>Потерянные звонки = потерянная выручка</h3><p>Пропущенное обращение — финансовая, а не операционная проблема. Особенно у тех, кто покупает лиды.</p></div>
            <div className="card"><h3>Голос должен звучать естественно</h3><p>Главное возражение — «робот». Снимается не описанием, а живым звонком с AI.</p></div>
            <div className="card"><h3>Усиливает команду, а не заменяет</h3><p>Нерабочее время, пики, ситуации когда не успевают ответить. Дополнительный слой покрытия.</p></div>
          </div>
          <div className="card" style={{ marginTop: '14px', borderColor: '#3b63e0' }}>
            <h3>Почему InsurVoice, а не альтернативы</h3>
            <p>Реальные конкуренты маленького агентства — не другой стартап, а <b style={{ color: 'var(--ink)' }}>answering service за $200–400/мес, оффшорный VA, голосовая почта или «ничего»</b>, а также горизонтальные AI-ресепшены и будущая фича AMS-вендора. Наш угол: <b style={{ color: 'var(--ink)' }}>специализация на страховании</b> (сценарии котировок, продлений, claim), качество голоса, которое слышно в первом же звонке, и запуск за 48 часов. Против AMS-вендоров — скорость и глубина сценариев; интеграцию с AMS (Applied Epic, EZLynx, HawkSoft, AMS360) закладываем в продукт.</p>
          </div>
          <div className="card" style={{ marginTop: '14px' }}>
            <h3>Ценообразование</h3>
            <p>Базовый ARPU ≈ $600/мес. Модель — <b style={{ color: 'var(--ink)' }}>фикс за тариф + лимит минут/звонков</b>, сверх лимита — по цене за минуту (покрывает переменные затраты: телефония + LLM). Так маржа предсказуема при росте объёма звонков. Для первых клиентов — спец-условия в обмен на отзыв и кейс.</p>
          </div>

          <h2>5. Каналы привлечения</h2>
          <div className="grid cols-3">
            <div className="card"><span className="tag good">Работает сейчас</span><h3 style={{ marginTop: '8px' }}>Meta (Paid Social)</h3><p>Уже приносит лиды при тестовом спенде ~$100. Первый канал на масштабирование по мере подтверждения CPL и цены демо. Креативы: аудио реальных разговоров AI, before/after, ROI.</p></div>
            <div className="card"><span className="tag">Повторный тест</span><h3 style={{ marginTop: '8px' }}>LinkedIn Ads (таргет)</h3><p>Возвращаем таргетинг по должностям Agency Owner/Principal — параллельно с органическим founder-led LinkedIn.</p></div>
            <div className="card"><span className="tag">Ядро outbound</span><h3 style={{ marginTop: '8px' }}>Cold Email</h3><p>Персонализация + привязка к реальному пропущенному звонку. KPI: reply &gt;5%, письмо→демо &gt;0,7%.</p></div>
            <div className="card"><h3>Демо-номер как канал</h3><p>Публичный номер во всех точках контакта: реклама + квалификация + снятие возражения одним звонком.</p></div>
            <div className="card"><h3>Google Search</h3><p>«AI receptionist for insurance», «after-hours answering service». KPI: цена демо &lt;$300.</p></div>
            <div className="card"><h3>Тёплая сеть + Q3/Q4</h3><p>Рекомендации, интро; далее вебинары, подкасты, сообщества → партнёрства, события, реферралы, Medicare AEP.</p></div>
          </div>

          <h2>6. Юнит-экономика и удержание</h2>
          <div className="grid cols-2">
            <div className="card"><h3>Полный CAC — с учётом продаж</h3>
              <p>Продажи ведёт sales-менеджер — оплачиваемая позиция, и её стоимость входит в полный CAC. Считаем две цифры: только по каналам (~$2 100) и полный, с продажами и прочими расходами (~$2 660). Всё пересчитывается на вкладке «Калькулятор экономики».</p></div>
            <div className="card"><h3>Удержание — отдельный приоритет</h3>
              <p>Весь LTV зависит от churn, поэтому планируем при <b style={{ color: 'var(--ink)' }}>3 / 5 / 7% в месяц</b> и меряем не только воронку до продажи, но и пользу для клиента: сколько звонков принято, лидов поймано, денег возвращено, как быстро клиент видит результат. Эти же цифры идут в кейсы.</p></div>
            <div className="card"><h3>Ёмкость продаж</h3>
              <p>50 сделок ≈ 200 демо плюс онбординг каждого клиента. Одному продавцу это не потянуть — <b style={{ color: 'var(--ink)' }}>SDR и второй закрывающий с августа</b>. Объём лидов растим синхронно с тем, сколько успеваем обработать.</p></div>
            <div className="card"><h3>Целевые ориентиры</h3>
              <p>LTV/CAC ≥ 3, окупаемость ≤ 12 мес. При ARPU $600, марже ~72% и churn 4% модель здорова даже с учётом продаж. Опасная зона начинается при churn ≥ 6% — поэтому удержание так важно.</p></div>
          </div>

          <h2>7. Бюджет по фазам</h2>
          {renderSharedBudgetTable('v3')}
          <p className="note" style={{ marginTop: '10px' }}>
            Итого GTM за июль–декабрь ≈ <b style={{ color: 'var(--ink)' }}>${fmt(totalGtmAll)}</b> — считается автоматически по цифрам из медиаплана (вкладка «Медиаплан VII–XII»); поменяете бюджет там — обновится и здесь.
          </p>

          <h2>8. Метрики и система решений</h2>
          <div className="tblwrap">
            <table>
              <thead><tr><th>Уровень</th><th>Метрика</th><th>Цель</th></tr></thead>
              <tbody>
                <tr><td>Лидген</td><td>Email Reply Rate</td><td>&gt;5%</td></tr>
                <tr><td>Лидген</td><td>Cost per Booked Demo (Paid)</td><td>&lt;$300–400</td></tr>
                <tr><td>Продажи</td><td>Booked → Completed Demo</td><td>&gt;65%</td></tr>
                <tr><td>Продажи</td><td>Completed → Closed Won</td><td>&gt;25%</td></tr>
                <tr><td>Юнит-эк.</td><td>CAC с зарплатой продавца</td><td>&lt;$2 700</td></tr>
                <tr><td>Удержание</td><td>Monthly Logo Churn</td><td>&lt;4%</td></tr>
                <tr><td><b style={{ color: 'var(--imp)' }}>Ценность (v3)</b></td><td>Звонков принято / лидов поймано / $ возвращено</td><td>трек по каждому клиенту</td></tr>
              </tbody>
            </table>
          </div>
          <p className="note">North Star: число назначенных квалифицированных демо в неделю и сделок на их основе. Правило остановки: нет ни одного демо за 2 недели после тестового бюджета → канал на паузу.</p>

          <h2>9. Комплаенс и риски</h2>
          <div className="grid cols-2">
            <div className="card"><h3>TCPA и исходящие звонки</h3>
              <p><b style={{ color: 'var(--ink)' }}>Начинаем с входящих:</b> приём звонков, after-hours, пропущенные обращения — низкий риск. Для сценария <b style={{ color: 'var(--ink)' }}>быстрого ответа на купленные лиды</b> (это уже исходящие звонки, а FCC с 2024 требует явного согласия для AI-голоса на мобильные) делаем отдельный сбор согласия. Регулярно сверяемся с Do-Not-Call и правилами конкретных штатов.</p></div>
            <div className="card"><h3>Прочие риски</h3>
              <ul className="clean">
                <li><b style={{ color: 'var(--ink)' }}>Ёмкость продавца</b> — демо растут быстрее, чем их успевают обрабатывать → найм заранее</li>
                <li><b style={{ color: 'var(--ink)' }}>Длинные партнёрские циклы</b> — переговоры с июля</li>
                <li><b style={{ color: 'var(--ink)' }}>Сезонность</b> — Medicare AEP планируем заранее</li>
                <li><b style={{ color: 'var(--ink)' }}>Fit продавца</b> — US-based, native English, отраслевой бэкграунд</li>
              </ul></div>
          </div>
        </div>
      </section>

      {/* ================= CALCULATOR ================= */}
      <section className={`page ${activeTab === 'calc' ? 'active' : ''}`}>
        <div className="wrap">
          <h1>Калькулятор юнит-экономики</h1>
          <p className="sub">Двигайте ползунки — экономика пересчитывается вживую. Отдельно заложены продавцы и другие расходы, чтобы видеть <b style={{ color: 'var(--imp)' }}>полный CAC</b>, а не только стоимость каналов. Ниже — чувствительность к churn.</p>
          
          <div className="toolbar">
            <span className={`saved ${isSaving ? 'flash' : ''}`}>{flashMessage || '💾 значения сохраняются автоматически в БД'}</span>
            <button className="tbtn warnb" onClick={handleCalcReset}>Сбросить к базовым</button>
          </div>

          <div className="calc" style={{ marginTop: '18px' }}>
            <div className="controls card">
              <div className="row">
                <label>
                  <span className="lbltxt">
                    ARPU, $/мес
                    <span className="hint" title="Средний доход с одного клиента в месяц (Average Revenue Per User). Влияет на LTV и на срок окупаемости.">?</span>
                  </span>
                  <b>{calcInputs.arpu}</b>
                </label>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="25"
                  value={calcInputs.arpu}
                  onChange={(e) => handleCalcChange('arpu', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Валовая маржа, %
                    <span className="hint" title="Доля выручки, которая остаётся после переменных расходов (телефония, LLM/минуты). Чем выше маржа, тем больше LTV с той же выручки.">?</span>
                  </span>
                  <b>{calcInputs.gm}</b>
                </label>
                <input
                  type="range"
                  min="40"
                  max="90"
                  step="1"
                  value={calcInputs.gm}
                  onChange={(e) => handleCalcChange('gm', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Месячный logo churn, %
                    <span className="hint" title="Доля клиентов, отваливающихся каждый месяц. Ключевой параметр: чем выше churn, тем короче срок жизни клиента и меньше LTV — от него зависит вся экономика.">?</span>
                  </span>
                  <b>{calcInputs.churn}</b>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={calcInputs.churn}
                  onChange={(e) => handleCalcChange('churn', parseFloat(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Бюджет на каналы за период, $
                    <span className="hint" title="Сколько тратим на рекламу и лидогенерацию (Meta, LinkedIn, email, Google и т.д.) за весь период — без зарплат и прочих расходов.">?</span>
                  </span>
                  <b>{fmt(calcInputs.gtm)}</b>
                </label>
                <input
                  type="range"
                  min="60000"
                  max="160000"
                  step="5000"
                  value={calcInputs.gtm}
                  onChange={(e) => handleCalcChange('gtm', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Клиентов привлечено
                    <span className="hint" title="Сколько новых платящих агентств планируем привлечь за этот период. На это число делится весь бюджет и все расходы при расчёте CAC.">?</span>
                  </span>
                  <b>{calcInputs.cust}</b>
                </label>
                <input
                  type="range"
                  min="30"
                  max="70"
                  step="1"
                  value={calcInputs.cust}
                  onChange={(e) => handleCalcChange('cust', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Текущих клиентов (на старте)
                    <span className="hint" title="Количество активных клиентов перед началом периода (начало июля). С этого числа стартует накопительный расчёт клиентов в медиаплане.">?</span>
                  </span>
                  <b>{calcInputs.startClients || 0}</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={calcInputs.startClients || 0}
                  onChange={(e) => handleCalcChange('startClients', parseInt(e.target.value) || 0)}
                />
              </div>

              <hr style={{ borderColor: 'var(--line)' }} />

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Продавцов, чел
                    <span className="hint" title="Сколько человек занимается продажами и онбордингом клиентов в этот период. Их зарплата — реальная статья расходов, которая обычно не попадает в GTM-бюджет, но должна быть в CAC.">?</span>
                  </span>
                  <b>{calcInputs.sellers}</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={calcInputs.sellers}
                  onChange={(e) => handleCalcChange('sellers', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Зарплата продавца, $/мес
                    <span className="hint" title="Полная стоимость одного продавца в месяц (оклад + налоги/бонусы, по вашей оценке).">?</span>
                  </span>
                  <b>{fmt(calcInputs.salary)}</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max="12000"
                  step="250"
                  value={calcInputs.salary}
                  onChange={(e) => handleCalcChange('salary', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Период, мес
                    <span className="hint" title="За сколько месяцев считаем расходы на продавцов (обычно совпадает с периодом, за который привлекаются «Клиентов привлечено»).">?</span>
                  </span>
                  <b>{calcInputs.months}</b>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={calcInputs.months}
                  onChange={(e) => handleCalcChange('months', parseInt(e.target.value))}
                />
              </div>

              <div className="row">
                <label>
                  <span className="lbltxt">
                    Другие расходы за период, $
                    <span className="hint" title="Любые расходы, которых нет выше: инструменты, аналитика, подрядчики, юрист/комплаенс и т.п. — просто добавляются в полный CAC.">?</span>
                  </span>
                  <b>{fmt(calcInputs.other)}</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80000"
                  step="1000"
                  value={calcInputs.other}
                  onChange={(e) => handleCalcChange('other', parseInt(e.target.value))}
                />
              </div>
              <p className="note">Полный CAC = (бюджет на каналы + продавцы × зарплата × период + другие расходы) ÷ клиентов. Поставьте продавцов или зарплату в 0, чтобы увидеть CAC только по каналам.</p>
            </div>

            <div>
              <div className="out">
                <div className="o">
                  <div className="n" style={{ color: 'var(--orig)' }}>{money(cacSub)}</div>
                  <div className="l">CAC только по каналам</div>
                </div>
                <div className="o">
                  <div className="n" style={{ color: 'var(--imp)' }}>{money(cacFull)}</div>
                  <div className="l">Полный CAC (каналы + продажи + прочее)</div>
                </div>
                <div className="o">
                  <div className="n">{money(ltv)}</div>
                  <div className="l">LTV (валовая прибыль)</div>
                </div>
                <div className="o">
                  <div className="n">{ratio.toFixed(1)}×</div>
                  <div className="l">LTV / CAC (полный)</div>
                </div>
                <div className="o">
                  <div className="n">{Math.round(life)}</div>
                  <div className="l">Срок жизни клиента, мес</div>
                </div>
                <div className="o">
                  <div className="n">{payback.toFixed(1)}</div>
                  <div className="l">Payback (на марже), мес</div>
                </div>
                <div className="o">
                  <div className="n">{money(salesCost + other)}</div>
                  <div className="l">Продажи + прочее за период</div>
                </div>
              </div>

              {/* Dynamic Verdict box */}
              {ratio >= 3 && payback <= 12 ? (
                <div className="verdict" style={{ background: '#0f2a20', color: 'var(--good)', border: '1px solid #1f5641' }}>
                  ✔ Здоровая экономика: LTV/CAC {ratio.toFixed(1)}× и payback {payback.toFixed(1)} мес — модель масштабируема с учётом всех расходов.
                </div>
              ) : ratio >= 2 ? (
                <div className="verdict" style={{ background: '#2a2310', color: 'var(--warn)', border: '1px solid #5a4a17' }}>
                  ⚠ Пограничная зона: LTV/CAC {ratio.toFixed(1)}×. С учётом продаж и прочих расходов запаса почти нет. Снижайте churn или растите ARPU.
                </div>
              ) : (
                <div className="verdict" style={{ background: '#2a1414', color: 'var(--bad)', border: '1px solid #5a2323' }}>
                  ✖ Модель не сходится: LTV/CAC {ratio.toFixed(1)}×. С полными затратами масштабирование убыточно.
                </div>
              )}

              <h3 style={{ marginTop: '22px' }}>Чувствительность к churn (при полном CAC)</h3>
              <div className="tblwrap">
                <table>
                  <thead>
                    <tr>
                      <th>Месячный churn</th>
                      <th>Срок жизни, мес</th>
                      <th>LTV (маржа)</th>
                      <th>LTV / CAC</th>
                      <th>Вердикт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>{Math.round(row.c * 100)}%</td>
                        <td>{Math.round(row.l)}</td>
                        <td>{money(row.lt)}</td>
                        <td>{row.r.toFixed(1)}×</td>
                        <td>
                          <span className={`tag ${row.cls}`}>{row.txt}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">Ориентир для SaaS: LTV/CAC ≥ 3, окупаемость ≤ 12 мес. Красная зона показывает, где модель ломается, если churn окажется выше 3–4%.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MEDIA PLAN ================= */}
      <section className={`page ${activeTab === 'media' ? 'active' : ''}`}>
        <div className="wrap">
          <h1>Медиаплан: июль — декабрь</h1>
          <p className="sub">По каналам, по всей воронке, включая лиды. Все ячейки <b>Бюджет / Показы / CR1–CR5</b> редактируемые — цифры пересчитываются вживую. Это плановая модель (aggressive base case); подстраивайте под реальные данные каждую неделю.</p>

          <div className="legend">
            <span><span className="sw" style={{ background: 'var(--brand2)' }}></span> синие столбцы — расчётные</span>
            <span><b style={{ color: 'var(--ink)' }}>CR1</b> показ→клик · <b style={{ color: 'var(--ink)' }}>CRл</b> клик→лид · <b style={{ color: 'var(--ink)' }}>CPL</b> цена лида (бюджет ÷ лиды) · <b style={{ color: 'var(--ink)' }}>CR2</b> лид→букд.демо · <b style={{ color: 'var(--ink)' }}>CPA</b> цена букд.демо · <b style={{ color: 'var(--ink)' }}>CR3</b> доходимость · <b style={{ color: 'var(--ink)' }}>CPA2</b> цена сост.демо · <b style={{ color: 'var(--ink)' }}>CR4</b> →контракт выслан · <b style={{ color: 'var(--ink)' }}>CR5</b> →подписан</span>
          </div>

          <div className="toolbar">
            <span className={`saved ${isSaving ? 'flash' : ''}`}>{flashMessage || '💾 изменения сохраняются автоматически в БД'}</span>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', background: 'var(--panel)', border: '1px solid var(--line)', padding: '5px 12px', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--mut)', fontWeight: 600 }}>Клиентов на старте (текущих):</span>
              <input
                type="number"
                className="num"
                style={{ width: '55px', padding: '4px 6px', textAlign: 'center', background: '#0b1224', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: '6px', fontSize: '12px' }}
                min="0"
                max="500"
                value={calcInputs.startClients || 0}
                onChange={(e) => handleCalcChange('startClients', Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>

            <button className="tbtn" onClick={handleExport}>⬇ Экспорт всех данных (.json)</button>
            <label className="tbtn">
              ⬆ Импорт
              <input type="file" onChange={handleImport} accept="application/json,.json" hidden />
            </label>
            <button className="tbtn warnb" onClick={handlePlanReset}>Сбросить к плану</button>
          </div>
          <p className="note" style={{ marginTop: 0 }}>Данные теперь хранятся надежно в базе данных Supabase. «Экспорт» и «Импорт» позволяют легко переносить ваши планы в виде JSON-файлов.</p>

          <div className="monthtabs">
            {MONTHS.map((m, i) => (
              <button
                key={i}
                className={curMonth === i ? 'active' : ''}
                onClick={() => setCurMonth(i)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Канал</th>
                  <th>Бюджет $</th>
                  <th>Показы</th>
                  <th>CTR</th>
                  <th>Клики</th>
                  <th>CPC $</th>
                  <th>CRл</th>
                  <th>Лиды</th>
                  <th>CPL $</th>
                  <th>CR2</th>
                  <th>Букд.<br />демо</th>
                  <th>CPA $</th>
                  <th>CR3</th>
                  <th>Сост.<br />демо</th>
                  <th>CPA2 $</th>
                  <th>CR4</th>
                  <th>Контракт<br />выслан</th>
                  <th>CPA3 $</th>
                  <th>CR5</th>
                  <th>Подпи-<br />сано</th>
                  <th>CPA4 $</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row, idx) => (
                  <tr key={idx} className={row.s.muted ? 'row-muted' : ''}>
                    <td>{row.name}</td>
                    
                    {/* Uncontrolled Inputs keyed to current month and channel to avoid decimal typing issues */}
                    <td>
                      <input
                        className="mp-in"
                        key={`b-${row.ci}-${curMonth}-${row.s.budget}`}
                        defaultValue={row.s.budget}
                        onBlur={(e) => handleCellBlur(row.ci, 'budget', e.target.value)}
                      />
                    </td>
                    <td className="calc-cell">{fmt(row.r.impr)}</td>
                    <td>
                      <input
                        className="mp-in pct"
                        key={`cr1-${row.ci}-${curMonth}-${row.s.cr1}`}
                        defaultValue={pctv(row.s.cr1)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cr1', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell">{fmt(row.r.clicks)}</td>
                    <td>
                      <input
                        className="mp-in"
                        key={`cpc-${row.ci}-${curMonth}-${row.s.cpc}`}
                        defaultValue={row.s.cpc.toFixed(2)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cpc', e.target.value)}
                      />
                    </td>
                    
                    <td>
                      <input
                        className="mp-in pct"
                        key={`crl-${row.ci}-${curMonth}-${row.s.crL}`}
                        defaultValue={pctv(row.s.crL)}
                        onBlur={(e) => handleCellBlur(row.ci, 'crL', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell">{fmt(row.r.leads)}</td>
                    <td className="calc-cell">${fmt(row.r.cpl)}</td>
                    
                    <td>
                      <input
                        className="mp-in pct"
                        key={`cr2-${row.ci}-${curMonth}-${row.s.cr2}`}
                        defaultValue={pctv(row.s.cr2)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cr2', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell">{fmt(row.r.booked)}</td>
                    <td className="calc-cell">${fmt(row.r.cpa)}</td>
                    
                    <td>
                      <input
                        className="mp-in pct"
                        key={`cr3-${row.ci}-${curMonth}-${row.s.cr3}`}
                        defaultValue={pctv(row.s.cr3)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cr3', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell">{fmt(row.r.completed)}</td>
                    <td className="calc-cell">${fmt(row.r.cpa2)}</td>
                    
                    <td>
                      <input
                        className="mp-in pct"
                        key={`cr4-${row.ci}-${curMonth}-${row.s.cr4}`}
                        defaultValue={pctv(row.s.cr4)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cr4', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell">{fmt(row.r.sent)}</td>
                    <td className="calc-cell">${fmt(row.r.cpa3)}</td>
                    
                    <td>
                      <input
                        className="mp-in pct"
                        key={`cr5-${row.ci}-${curMonth}-${row.s.cr5}`}
                        defaultValue={pctv(row.s.cr5)}
                        onBlur={(e) => handleCellBlur(row.ci, 'cr5', e.target.value)}
                      />
                      %
                    </td>
                    
                    <td className="calc-cell" style={{ color: 'var(--good)', fontWeight: 700 }}>{fmt(row.r.signed)}</td>
                    <td className="calc-cell" style={{ color: 'var(--good)', fontWeight: 700 }}>${fmt(row.r.cpa4)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          className="mp-zero"
                          onClick={() => handleCopyRow(row.ci)}
                          title="Копировать строку (бюджет, CPC, CTR, конверсии)"
                          style={{ padding: '5px 7px' }}
                        >
                          📋
                        </button>
                        {copiedState && (
                          <button
                            className="mp-zero"
                            onClick={() => handlePasteRow(row.ci)}
                            title="Вставить скопированные данные в эту строку"
                            style={{ padding: '5px 7px', borderColor: 'var(--good)', color: 'var(--good)', background: 'rgba(52,211,153,.04)' }}
                          >
                            📥
                          </button>
                        )}
                        <button
                          className={`mp-mute ${row.s.muted ? 'active' : ''}`}
                          onClick={() => handleToggleMute(row.ci)}
                          title={row.s.muted ? "Активировать канал (сделать ярким)" : "Приглушить канал (сделать серым)"}
                        >
                          👁
                        </button>
                        <button
                          className="mp-zero"
                          onClick={() => handleZeroChannel(row.ci)}
                          title={`Обнулить бюджет этого канала в ${MONTHS[curMonth]}`}
                        >
                          ✕ 0
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>ИТОГО {MONTHS[curMonth]}</td>
                  <td>${fmt(curMonthBudget)}</td>
                  <td>{fmt(curMonthImpr)}</td>
                  <td>{pctv(bCR1)}%</td>
                  <td>{fmt(curMonthClicks)}</td>
                  <td>{bCPC > 0 ? `$${bCPC.toFixed(2)}` : '$0.00'}</td>
                  <td>{pctv(bCRL)}%</td>
                  <td>{fmt(curMonthLeads)}</td>
                  <td>${fmt(bCPL)}</td>
                  <td>{pctv(bCR2)}%</td>
                  <td>{fmt(curMonthBooked)}</td>
                  <td>${fmt(blendedCpa)}</td>
                  <td>{pctv(bCR3)}%</td>
                  <td>{fmt(curMonthCompleted)}</td>
                  <td>${fmt(bCPA2)}</td>
                  <td>{pctv(bCR4)}%</td>
                  <td>{fmt(curMonthSent)}</td>
                  <td>${fmt(bCPA3)}</td>
                  <td>{pctv(bCR5)}%</td>
                  <td>{fmt(curMonthSigned)}</td>
                  <td>${fmt(blendedCac)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="note">
            В строке ИТОГО проценты (CR) и стоимости (CPC/CPL/CPA) — <b>взвешенные</b> по всем каналам, а не сумма. Blended CPC: <b>{bCPC > 0 ? `$${bCPC.toFixed(2)}` : '$0.00'}</b> · CPL считается на лиды, не на клики: <b>${fmt(bCPL)}</b> за лид. Blended CPA демо: <b>${fmt(blendedCpa)}</b> · Blended CAC (канальный бюджет ÷ подписания): <b>${fmt(blendedCac)}</b>.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '34px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Сводка по месяцам</h2>
            <div className="scenario-selector" style={{ marginTop: 0 }}>
              <span>Версия:</span>
              <button 
                className={activeScenario === 'realistic' ? 'active' : ''} 
                onClick={() => setActiveScenario('realistic')}
              >
                Реалистичный
              </button>
              <button 
                className={activeScenario === 'optimistic' ? 'active' : ''} 
                onClick={() => setActiveScenario('optimistic')}
              >
                Оптимистичный
              </button>
              <button 
                className={activeScenario === 'pessimistic' ? 'active' : ''} 
                onClick={() => setActiveScenario('pessimistic')}
              >
                Пессимистичный
              </button>
            </div>
          </div>
          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Месяц</th>
                  <th>Бюджет $</th>
                  <th>Лиды</th>
                  <th>Букд.демо</th>
                  <th>Сост.демо</th>
                  <th>Подписано</th>
                  <th>CAC $ (GTM)</th>
                  <th>Накопит. клиентов</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.m}</td>
                    <td>${fmt(row.b)}</td>
                    <td>{fmt(row.l)}</td>
                    <td>{fmt(row.bk)}</td>
                    <td>{fmt(row.co)}</td>
                    <td style={{ color: 'var(--good)', fontWeight: 700 }}>{fmt(row.si)}</td>
                    <td>${fmt(row.cac)}</td>
                    <td><b>{fmt(row.cumulativeSigned)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>ИТОГО</td>
                  <td>${fmt(gtBudget)}</td>
                  <td>{fmt(gtLeads)}</td>
                  <td>{fmt(gtBooked)}</td>
                  <td>{fmt(gtCompleted)}</td>
                  <td>{fmt(gtSigned)}</td>
                  <td>${fmt(gtCac)}</td>
                  <td><b>{fmt(Math.round((calcInputs.startClients || 0) + gtSigned))}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="note">CAC здесь — только GTM/канальный бюджет ÷ подписания (без времени фаундера). Реальный CAC см. во вкладке «Калькулятор экономики».</p>
        </div>
      </section>

      {/* ================= ROADMAP ================= */}
      <section className={`page ${activeTab === 'roadmap' ? 'active' : ''}`}>
        <div className="wrap">
          <div className="hero" style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '680px' }}>
              <span className="tag">Дорожная карта · GTM-активности · 2026</span>
              <h1 style={{ marginTop: '14px', marginBottom: '8px' }}>Интерактивный Роадмап (Roadmap)</h1>
              <p className="sub" style={{ margin: 0 }}>
                Помесячный план действий для запуска и масштабирования. Теперь вы можете отмечать задачи как выполненные, 
                добавлять новые, редактировать существующие и удалять неактуальные. Все изменения автоматически сохраняются в базу данных.
              </p>
            </div>
            
            <div className="roadmap-view-switcher">
              <button 
                className={roadmapView === 'grid' ? 'active' : ''} 
                onClick={() => setRoadmapView('grid')}
              >
                🎴 Карточки
              </button>
              <button 
                className={roadmapView === 'list' ? 'active' : ''} 
                onClick={() => setRoadmapView('list')}
              >
                ≡ Строчный
              </button>
            </div>
          </div>

          <div className="roadmap-grid">
            {['Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map(month => {
              const items = roadmapTasks.filter(x => x.month === month);
              
              // Find the phase for this month
              const phase = month === 'Июль' ? 'Фаза 1' : (['Август', 'Сентябрь'].includes(month) ? 'Фаза 2' : 'Фаза 3');
              
              return (
                <div key={month} className="roadmap-month-section">
                  <div className="roadmap-month-title">
                    {month}
                    {phase && <span className="phase-badge">{phase}</span>}
                  </div>
                  {roadmapView === 'list' ? (
                    <div className="tblwrap" style={{ marginTop: '10px' }}>
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>Статус</th>
                            <th style={{ width: '35%' }}>Инициатива</th>
                            <th style={{ width: '130px' }}>Тип</th>
                            <th style={{ width: '130px' }}>Источник</th>
                            <th>Комментарий / Описание</th>
                            <th style={{ width: '50px', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className={item.completed ? 'row-muted' : ''}>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <input
                                  type="checkbox"
                                  className="roadmap-checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleComplete(item.id)}
                                  title={item.completed ? "Отметить как невыполненное" : "Отметить как выполненное"}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="mp-in"
                                  value={item.initiative}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'initiative', e.target.value)}
                                  placeholder="Название инициативы..."
                                  style={{
                                    width: '100%',
                                    textDecoration: item.completed ? 'line-through' : 'none',
                                    color: item.completed ? 'var(--mut)' : '#fff',
                                    fontWeight: 700
                                  }}
                                />
                              </td>
                              <td>
                                <select
                                  className="roadmap-select-type"
                                  value={item.type || 'Paid'}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'type', e.target.value)}
                                  style={{ width: '100%', padding: '4px' }}
                                >
                                  <option value="Paid">Paid</option>
                                  <option value="Outbound">Outbound</option>
                                  <option value="Content">Content</option>
                                  <option value="Social">Social</option>
                                  <option value="Partnership">Partnership</option>
                                  <option value="Events">Events</option>
                                  <option value="Referral">Referral</option>
                                  <option value="Community">Community</option>
                                  <option value="Networking">Networking</option>
                                  <option value="Sales">Sales</option>
                                  <option value="CRM">CRM</option>
                                  <option value="Product">Product</option>
                                  <option value="-">-</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="mp-in"
                                  value={item.source || ''}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'source', e.target.value)}
                                  placeholder="v3 / backlog..."
                                  style={{ width: '100%' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="mp-in"
                                  value={item.comment}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'comment', e.target.value)}
                                  placeholder="Комментарий..."
                                  style={{ width: '100%', color: 'var(--mut)' }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="roadmap-item-delete"
                                  onClick={() => handleDeleteTask(item.id)}
                                  title="Удалить инициативу"
                                  style={{ padding: '4px 8px' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={6} style={{ padding: '0' }}>
                              <button 
                                className="roadmap-btn-add"
                                onClick={() => handleAddTask(month)}
                                style={{
                                  border: 'none',
                                  borderRadius: '0',
                                  width: '100%',
                                  minHeight: 'auto',
                                  padding: '10px',
                                  background: 'rgba(255, 255, 255, 0.01)'
                                }}
                              >
                                ➕ Добавить инициативу
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="roadmap-list">
                      {items.map((item) => (
                        <div key={item.id} className={`roadmap-item ${item.completed ? 'completed' : ''}`}>
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <div className="roadmap-item-header" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <input
                                  type="checkbox"
                                  className="roadmap-checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleComplete(item.id)}
                                  title={item.completed ? "Отметить как невыполненное" : "Отметить как выполненное"}
                                  style={{ marginTop: '3px' }}
                                />
                                <input
                                  type="text"
                                  className="roadmap-input-title"
                                  value={item.initiative}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'initiative', e.target.value)}
                                  placeholder="Название инициативы..."
                                />
                                <button
                                  className="roadmap-item-delete"
                                  onClick={() => handleDeleteTask(item.id)}
                                  title="Удалить инициативу"
                                >
                                  ✕
                                </button>
                              </div>
                              
                              <textarea
                                className="roadmap-textarea-comment"
                                value={item.comment}
                                onChange={(e) => handleUpdateTaskField(item.id, 'comment', e.target.value)}
                                placeholder="Описание или комментарий..."
                              />
                            </div>

                            <div className="roadmap-item-footer">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--mut)' }}>ТИП:</span>
                                <select
                                  className="roadmap-select-type"
                                  value={item.type || 'Paid'}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'type', e.target.value)}
                                >
                                  <option value="Paid">Paid</option>
                                  <option value="Outbound">Outbound</option>
                                  <option value="Content">Content</option>
                                  <option value="Social">Social</option>
                                  <option value="Partnership">Partnership</option>
                                  <option value="Events">Events</option>
                                  <option value="Referral">Referral</option>
                                  <option value="Community">Community</option>
                                  <option value="Networking">Networking</option>
                                  <option value="Sales">Sales</option>
                                  <option value="CRM">CRM</option>
                                  <option value="Product">Product</option>
                                  <option value="-">-</option>
                                </select>
                              </div>

                              <span className="roadmap-item-source">
                                Ист: 
                                <input
                                  type="text"
                                  className="roadmap-input-source"
                                  value={item.source || ''}
                                  onChange={(e) => handleUpdateTaskField(item.id, 'source', e.target.value)}
                                  placeholder="v3 / backlog..."
                                  style={{ marginLeft: '4px' }}
                                />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Initiative Card */}
                      <button 
                        className="roadmap-btn-add"
                        onClick={() => handleAddTask(month)}
                      >
                        ➕ Добавить инициативу
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--panel2)',
            border: '1px solid var(--line)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            margin: '20px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14.5px', color: 'var(--mut)', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--mut)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13.5px'
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13.5px'
                }}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

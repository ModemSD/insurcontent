-- ==============================================================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ ТЕЛЕФОНИИ QUO И AI-АНАЛИТИКИ ЗВОНКОВ
-- Выполните этот скрипт в Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Таблица менеджеров / сотрудников Quo
CREATE TABLE IF NOT EXISTS public.quo_managers (
    id TEXT PRIMARY KEY,                       -- User ID из Quo (например, 'usr_xyz')
    name TEXT NOT NULL,                        -- Полное имя
    email TEXT,                                -- Рабочая почта
    role TEXT,                                 -- Роль (admin, member)
    phone_numbers JSONB DEFAULT '[]'::jsonb,   -- Привязанные номера
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица звонков
CREATE TABLE IF NOT EXISTS public.quo_calls (
    id TEXT PRIMARY KEY,                       -- Call ID из Quo
    direction TEXT NOT NULL,                   -- 'inbound' или 'outbound'
    status TEXT NOT NULL,                      -- 'completed', 'missed', 'voicemail'
    duration INTEGER DEFAULT 0,                -- Длительность в секундах
    from_number TEXT NOT NULL,                 -- От кого
    to_number TEXT NOT NULL,                   -- Кому
    manager_id TEXT REFERENCES public.quo_managers(id) ON DELETE SET NULL,
    manager_name TEXT,
    recording_url TEXT,                        -- Ссылка на аудиозапись (если есть)
    has_recording BOOLEAN DEFAULT FALSE,
    call_created_at TIMESTAMPTZ,               -- Дата звонка в Quo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска звонков
CREATE INDEX IF NOT EXISTS idx_quo_calls_manager_id ON public.quo_calls(manager_id);
CREATE INDEX IF NOT EXISTS idx_quo_calls_created_at ON public.quo_calls(call_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quo_calls_status ON public.quo_calls(status);

-- 3. Таблица AI-аналитики и скоринга звонков через GPT
CREATE TABLE IF NOT EXISTS public.quo_call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT UNIQUE NOT NULL REFERENCES public.quo_calls(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,                    -- Общий балл от 0 до 100
    sentiment TEXT NOT NULL,                   -- 'positive', 'neutral', 'negative'
    summary TEXT,                              -- Краткое резюме звонка
    key_points JSONB DEFAULT '[]'::jsonb,      -- Ключевые тезисы
    agreements JSONB DEFAULT '[]'::jsonb,      -- Договоренности
    manager_strengths JSONB DEFAULT '[]'::jsonb, -- Сильные стороны
    manager_mistakes JSONB DEFAULT '[]'::jsonb,  -- Ошибки менеджера
    action_items JSONB DEFAULT '[]'::jsonb,    -- Следующие действия
    scorecard JSONB DEFAULT '{}'::jsonb,       -- Детальные оценки (приветствие, возражения и т.д.)
    transcript JSONB DEFAULT '[]'::jsonb,      -- Полная расшифровка по ролям
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для аналитики
CREATE INDEX IF NOT EXISTS idx_quo_call_analyses_score ON public.quo_call_analyses(score);

-- Включаем RLS (Row Level Security) и открываем доступ для анонимного/сервисного ключа
ALTER TABLE public.quo_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quo_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quo_call_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to quo_managers" ON public.quo_managers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to quo_calls" ON public.quo_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to quo_call_analyses" ON public.quo_call_analyses FOR ALL USING (true) WITH CHECK (true);

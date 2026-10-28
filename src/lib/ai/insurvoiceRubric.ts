import {
  CallScorecard,
  CheckpointResult,
  EvaluatedCheckpoint,
  EvaluatedSection,
  InsurvoiceCallType,
  InsurvoiceScoreBand,
  InsurvoiceSectionId,
} from '@/types/telephony';

export const INSURVOICE_RUBRIC_VERSION = 'v1.0';
export const CHECKPOINT_SHARE = 0.6;
export const QUALITY_RATING_SHARE = 0.4;

export const CALL_TYPE_WEIGHTS: Record<Exclude<InsurvoiceCallType, 'Auto'>, Record<InsurvoiceSectionId, number>> = {
  'Confirmation / Pre-Call': {
    opening: 25,
    discovery: 35,
    pain: 0,
    demo: 0,
    objections: 10,
    close: 20,
    presence: 10,
  },
  'Discovery': {
    opening: 15,
    discovery: 35,
    pain: 25,
    demo: 0,
    objections: 5,
    close: 15,
    presence: 5,
  },
  'Demo': {
    opening: 10,
    discovery: 15,
    pain: 20,
    demo: 25,
    objections: 10,
    close: 15,
    presence: 5,
  },
  'Discovery + Demo': {
    opening: 10,
    discovery: 25,
    pain: 20,
    demo: 15,
    objections: 10,
    close: 15,
    presence: 5,
  },
  'Follow-up / Close': {
    opening: 5,
    discovery: 10,
    pain: 15,
    demo: 10,
    objections: 25,
    close: 30,
    presence: 5,
  },
};

export interface RubricSectionDefinition {
  id: InsurvoiceSectionId;
  title: string;
  shortTitle: string;
  titleEn: string;
  whyWeight: string;
  level5: string;
  level3: string;
  level1: string;
}

export const INSURVOICE_SECTIONS: RubricSectionDefinition[] = [
  {
    id: 'opening',
    title: '1. Открытие и контакт (Opening & Rapport)',
    shortTitle: 'Opening & Rapport',
    titleEn: 'Opening & Rapport',
    whyWeight: 'Задаёт рамку всего звонка, но слабое начало ещё можно вытянуть.',
    level5:
      'Подтверждает тайминг, озвучивает адженду и цель звонка. Спрашивает, что побудило обратиться и как клиент видит использование AI. Начинает с открытого вопроса «Расскажите о вашем агентстве» ("Tell me about your agency") и развивает историю клиента (как начали, размер, штат). Первые 5 минут больше говорит клиент.',
    level3:
      'Дружелюбно и профессионально, но пропускает адженду или задаёт закрытые/наводящие вопросы об агентстве («Вы занимаетесь P&C или L&H?»).',
    level1:
      'Сразу переходит к питчу или демо. Нет ни адженды, ни интереса к бизнесу агентства.',
  },
  {
    id: 'discovery',
    title: '2. Квалификация и разведка (Discovery)',
    shortTitle: 'Discovery',
    titleEn: 'Discovery',
    whyWeight: 'От этого зависит всё остальное: без глубокого Discovery невозможно оцифровать боль, адаптировать демо и закрыть сделку.',
    level5:
      'Полностью картирует агентство: структура портфеля (book mix P&C / L&H), кол-во клиентов и активных полисов, источники лидов (рефералы, соцсети, платный трафик), текущий процесс прозвона и кто им занимается, ИТ-стек (AMS/CRM: EZLynx, GHL), языковые потребности (например, испаноязычные клиенты). Выясняет, как давно смотрят AI и кого ещё оценивали. Определяет ЛПР и процесс согласования (например, 90-day pilot и защита перед руководством). Задаёт глубокие уточняющие вопросы, а не читает чек-лист.',
    level3:
      'Покрывает базу (размер, микс, источники лидов), но упускает конкурентов или процесс принятия решения. Уточняющие вопросы поверхностные.',
    level1:
      'Мало вопросов или их нет. Додумывает потребности за клиента и рассказывает общие фичи.',
  },
  {
    id: 'pain',
    title: '3. Боль и цена проблемы (Pain & Impact)',
    shortTitle: 'Pain & Impact',
    titleEn: 'Pain & Impact',
    whyWeight: 'Главная точка роста отдела продаж: именно оцифровка потерь делает цену продукта маленькой в глазах клиента.',
    level5:
      'Переводит каждую боль в твёрдые цифры: «10 нерабочих (after-hours) лидов в неделю, считаете 6 квот, закрываете 2 — и так каждую неделю? То есть ~500 лидов за год». Выясняет show rate, close rate, среднюю премию/комиссию и считает упущенную выгоду (opportunity cost). Оцифровывает и другие боли (стоимость найма, обучения и текучки людей в сезон). Клиент сам вслух проговаривает цену проблемы.',
    level3:
      'Выявляет боли и собирает часть цифр, но оставляет их в процентах, не суммирует на дистанции года или не переводит в доллары.',
    level1:
      'Боли просто упоминаются («Да, понимаю, это сложно») без единой цифры.',
  },
  {
    id: 'demo',
    title: '4. Презентация и Демо (Solution Fit / Demo)',
    shortTitle: 'Solution Fit / Demo',
    titleEn: 'Solution Fit / Demo',
    whyWeight: 'Демо работает только поверх сильного Discovery и оцифрованной боли.',
    level5:
      'Показывает только то, что решает названные клиентом боли, и ссылается на его слова («Вы упомянули after-hours лиды — вот как это работает...»). Использует реальные кейсы для ответа на вопрос «почему решение именно для страховщиков». Объясняет работу с данными простым языком («Загружаем CSV с именем, адресом и прошлыми полисами, чтобы AI мог представиться»). Про интеграции и API говорит только если спросили. Никогда не обещает будущие фичи или интеграции.',
    level3:
      'Нормальное, но шаблонное демо. Сам поднимает ненужные технические темы или упускает возможность привязать фичи к болям клиента.',
    level1:
      'Свалка фич (feature dump) или уход в запутанный технарь. Обещает интеграции или функции, которых сейчас нет.',
  },
  {
    id: 'objections',
    title: '5. Отработка возражений (Objection Handling)',
    shortTitle: 'Objection Handling',
    titleEn: 'Objection Handling',
    whyWeight: 'Важно, хотя большинство возражений снимается ещё на этапе Discovery и оцифровки боли.',
    level5:
      'Принимает возражение, задаёт уточняющий вопрос, чтобы вскрыть истинное сомнение, отвечает по сути (период внедрения на «нет времени пробовать», комплаенс на страх записи звонков, брендированный Caller ID на «не берут незнакомые номера»), а затем обязательно проверяет, снято ли возражение («Это отвечает на ваш вопрос? / Does that address it?»).',
    level3:
      'Отвечает на возражение, но не подтверждает у клиента, что сомнение снято, либо отвечает не на ту боль, которую имел в виду клиент.',
    level1:
      'Уходит в защиту, спорит, проскакивает мимо возражения или сразу роняет цену.',
  },
  {
    id: 'close',
    title: '6. Закрытие и следующий шаг (Close & Next Steps)',
    shortTitle: 'Close & Next Steps',
    titleEn: 'Close & Next Steps',
    whyWeight: 'Финальный результат, ради которого строился весь звонок.',
    level5:
      'Формулирует ROI на цифрах самого клиента («1–2 продажи полностью окупают это» — именно продажи, а не «комиссионные чеки»). Резюмирует ценность, снимает риск («Мы сами собираем агента, проводим онбординг и настраиваем номер»), затем прямо предлагает старт с конкретной датой («Можем запуститься в понедельник — вам подходит?») и ждёт ответа. Если клиент не готов сейчас — до конца звонка бронирует точную дату и время следующей встречи с ЛПР.',
    level3:
      'Назначает следующую встречу, но ни разу прямо не предлагает купить, либо следующий шаг размытый («Я пришлю материалы на почту»).',
    level1:
      'Звонок заканчивается без предложения сделки и без назначенного следующего шага в календаре.',
  },
  {
    id: 'presence',
    title: '7. Подача и ведение звонка (Presence)',
    shortTitle: 'Presence',
    titleEn: 'Presence',
    whyWeight: 'Влияет на весь разговор, но имеет вес 5%, чтобы не дублировать другие секции.',
    level5:
      'Профессиональная подача. Подстраивается под темп и тон клиента, сохраняя живой энтузиазм. Даёт клиенту договорить каждую фразу до конца (не перебивает). Держится уверенно на технических вопросах и удерживает фокус клиента чётким фреймингом. Не упоминает на звонках, что он «новенький в компании».',
    level3:
      'Профессионально, но монотонно/сухо, либо периодически перебивает клиента.',
    level1:
      'Часто перебивает, звучит неуверенно, сбивается на длинные монологи или теряет управление звонком.',
  },
];

export interface RubricCheckpointDefinition {
  id: string;
  sectionId: InsurvoiceSectionId;
  sectionTitle: string;
  titleEn: string;
  title: string;
}

export const INSURVOICE_CHECKPOINTS: RubricCheckpointDefinition[] = [
  // 1. Opening & Rapport
  {
    id: '1.1',
    sectionId: 'opening',
    sectionTitle: 'Opening & Rapport',
    titleEn: 'Set the agenda, time available and goal for the call',
    title: 'Озвучил адженду, доступное время и цель звонка',
  },
  {
    id: '1.2',
    sectionId: 'opening',
    sectionTitle: 'Opening & Rapport',
    titleEn: 'Asked what prompted the inquiry and how they picture using AI',
    title: 'Спросил, что побудило обратиться и как клиент представляет использование AI',
  },
  {
    id: '1.3',
    sectionId: 'opening',
    sectionTitle: 'Opening & Rapport',
    titleEn: 'Opened agency discovery with an open-ended question ("Tell me about your agency"), not a leading one',
    title: 'Начал знакомство с открытого вопроса («Tell me about your agency»), а не закрытого/наводящего',
  },

  // 2. Discovery
  {
    id: '2.1',
    sectionId: 'discovery',
    sectionTitle: 'Discovery',
    titleEn: 'Learned book mix and size (P&C / L&H split, # clients, staff)',
    title: 'Выяснил структуру портфеля и размер агентства (P&C / L&H сплит, кол-во клиентов, штат)',
  },
  {
    id: '2.2',
    sectionId: 'discovery',
    sectionTitle: 'Discovery',
    titleEn: 'Learned lead sources and current calling / follow-up process',
    title: 'Выяснил источники лидов и текущий процесс прозвона / follow-up',
  },
  {
    id: '2.3',
    sectionId: 'discovery',
    sectionTitle: 'Discovery',
    titleEn: 'Learned tech stack (AMS / CRM, e.g. EZLynx, GHL)',
    title: 'Выяснил текущий ИТ-стек (AMS / CRM, например EZLynx, GoHighLevel)',
  },
  {
    id: '2.4',
    sectionId: 'discovery',
    sectionTitle: 'Discovery',
    titleEn: "Asked how long they've considered AI and who else they've evaluated",
    title: 'Спросил, как давно рассматривают AI и какие ещё решения/конкурентов смотрели',
  },
  {
    id: '2.5',
    sectionId: 'discovery',
    sectionTitle: 'Discovery',
    titleEn: 'Identified decision maker(s) and buying / approval process',
    title: 'Определил ЛПР (Decision Maker) и процесс принятия решения / согласования',
  },

  // 3. Pain & Impact
  {
    id: '3.1',
    sectionId: 'pain',
    sectionTitle: 'Pain & Impact',
    titleEn: 'Got hard counts (leads, quotes, closes), not just percentages',
    title: 'Получил твёрдые цифры в штуках (лиды, квоты, продажи), а не просто проценты',
  },
  {
    id: '3.2',
    sectionId: 'pain',
    sectionTitle: 'Pain & Impact',
    titleEn: 'Got average premium or commission per sale',
    title: 'Выяснил среднюю страховую премию (premium) или комиссию со сделки',
  },
  {
    id: '3.3',
    sectionId: 'pain',
    sectionTitle: 'Pain & Impact',
    titleEn: 'Projected the loss over 12+ months (made the number big)',
    title: 'Экстраполировал потери на 12+ месяцев вперёд (сделал цифру упущенной выгоды масштабной)',
  },
  {
    id: '3.4',
    sectionId: 'pain',
    sectionTitle: 'Pain & Impact',
    titleEn: 'Prospect stated the cost of the problem in their own words',
    title: 'Клиент сам проговорил стоимость проблемы / болей своими словами',
  },

  // 4. Solution Fit / Demo
  {
    id: '4.1',
    sectionId: 'demo',
    sectionTitle: 'Solution Fit / Demo',
    titleEn: 'Demo tied directly to pains the prospect stated',
    title: 'Демо напрямую привязано к болям, которые ранее озвучил клиент',
  },
  {
    id: '4.2',
    sectionId: 'demo',
    sectionTitle: 'Solution Fit / Demo',
    titleEn: 'No unprompted technical topics (integrations, open API, back end)',
    title: 'Не поднимал технические темы без запроса клиента (интеграции, open API, бэкенд)',
  },
  {
    id: '4.3',
    sectionId: 'demo',
    sectionTitle: 'Solution Fit / Demo',
    titleEn: 'No promises of future features or integrations',
    title: 'Не обещал будущих функций или интеграций с CRM/AMS',
  },
  {
    id: '4.4',
    sectionId: 'demo',
    sectionTitle: 'Solution Fit / Demo',
    titleEn: 'Explained data and setup in plain language',
    title: 'Объяснил загрузку данных (CSV) и настройку простым языком без техно-жаргона',
  },

  // 5. Objection Handling
  {
    id: '5.1',
    sectionId: 'objections',
    sectionTitle: 'Objection Handling',
    titleEn: 'Acknowledged and clarified the objection (found the real concern)',
    title: 'Принял и прояснил возражение (докопался до истинного сомнения)',
  },
  {
    id: '5.2',
    sectionId: 'objections',
    sectionTitle: 'Objection Handling',
    titleEn: 'Answered with a relevant point (implementation period, compliance, caller ID label, etc.)',
    title: 'Ответил релевантным аргументом (период внедрения, комплаенс, брендированный Caller ID и т.д.)',
  },
  {
    id: '5.3',
    sectionId: 'objections',
    sectionTitle: 'Objection Handling',
    titleEn: 'Confirmed the objection was resolved',
    title: 'Явно подтвердил у клиента, что возражение снято («Does that address it?»)',
  },

  // 6. Close & Next Steps
  {
    id: '6.1',
    sectionId: 'close',
    sectionTitle: 'Close & Next Steps',
    titleEn: 'Framed ROI with the prospect\'s own numbers ("1-2 sales covers it")',
    title: 'Сформулировал ROI на цифрах клиента («1–2 продажи окупают решение»)',
  },
  {
    id: '6.2',
    sectionId: 'close',
    sectionTitle: 'Close & Next Steps',
    titleEn: 'Explicitly asked for the sale',
    title: 'Прямо предложил закрыть сделку / перейти к оплате и старту',
  },
  {
    id: '6.3',
    sectionId: 'close',
    sectionTitle: 'Close & Next Steps',
    titleEn: 'Proposed a specific start date',
    title: 'Предложил конкретную дату запуска (например: «Можем стартовать в понедельник»)',
  },
  {
    id: '6.4',
    sectionId: 'close',
    sectionTitle: 'Close & Next Steps',
    titleEn: 'Booked a dated next meeting before the call ended',
    title: 'Назначил точную дату и время следующей встречи до завершения звонка',
  },

  // 7. Presence
  {
    id: '7.1',
    sectionId: 'presence',
    sectionTitle: 'Presence',
    titleEn: 'Let the prospect finish their sentences (no talking over)',
    title: 'Давал клиенту договаривать фразы до конца (не перебивал)',
  },
  {
    id: '7.2',
    sectionId: 'presence',
    sectionTitle: 'Presence',
    titleEn: "Matched the prospect's pace and tone",
    title: 'Подстроился под темп и тон собеседника (без затянутых монологов)',
  },
  {
    id: '7.3',
    sectionId: 'presence',
    sectionTitle: 'Presence',
    titleEn: 'Showed energy, enthusiasm and confidence throughout',
    title: 'Демонстрировал энергию, энтузиазм и уверенность на протяжении всего звонка',
  },
];

export function getBandForScore(score0to100: number): InsurvoiceScoreBand {
  if (score0to100 >= 85) return 'Strong';
  if (score0to100 >= 70) return 'Solid';
  if (score0to100 >= 55) return 'Needs Coaching';
  return 'Priority Focus';
}

/**
 * Exact Excel formula implementation from 'Score a Call' & 'Call Log' sheets:
 * Section score = 60% * (Y / (Y + N)) + 40% * (qualityRating / 5)
 * Total score = weighted average of applicable sections, rescaled to 100.
 */
export function calculateInsurvoiceScorecard(params: {
  callType?: InsurvoiceCallType;
  rawCheckpoints?: Record<string, { result?: string; evidence?: string }>;
  rawSectionRatings?: Record<string, { qualityRating?: number; rationale?: string }>;
}): {
  totalScore: number;
  band: InsurvoiceScoreBand;
  scorecard: CallScorecard;
} {
  const callType: Exclude<InsurvoiceCallType, 'Auto'> =
    params.callType && params.callType !== 'Auto' && CALL_TYPE_WEIGHTS[params.callType]
      ? params.callType
      : 'Discovery + Demo';

  const weights = CALL_TYPE_WEIGHTS[callType];

  const evaluatedCheckpoints: EvaluatedCheckpoint[] = INSURVOICE_CHECKPOINTS.map((cp) => {
    const raw = params.rawCheckpoints?.[cp.id];
    const normalizedResult = (raw?.result || 'N').toString().trim().toUpperCase();
    let result: CheckpointResult = 'N';
    if (normalizedResult === 'Y' || normalizedResult === 'YES') result = 'Y';
    else if (normalizedResult === 'N/A' || normalizedResult === 'NA') result = 'N/A';
    else result = 'N';

    const evidence = (raw?.evidence || '').trim();
    // Rule from Instructions row 37: "Every score needs a quote or timestamp. No evidence = score it N."
    if (result === 'Y' && (!evidence || evidence.length < 3)) {
      result = 'N';
    }

    return {
      id: cp.id,
      sectionId: cp.sectionId,
      sectionTitle: cp.sectionTitle,
      title: cp.title,
      titleEn: cp.titleEn,
      result,
      evidence: evidence || (result === 'N/A' ? 'Не применимо к данному звонку' : 'Не зафиксировано в стенограмме'),
    };
  });

  let weightedPointsSum = 0;
  let countedWeightSum = 0;

  const evaluatedSections: EvaluatedSection[] = INSURVOICE_SECTIONS.map((sec) => {
    const weight = weights[sec.id] ?? 0;
    const secCheckpoints = evaluatedCheckpoints.filter((c) => c.sectionId === sec.id);
    const checkpointsHit = secCheckpoints.filter((c) => c.result === 'Y').length;
    const checkpointsMissed = secCheckpoints.filter((c) => c.result === 'N').length;
    const checkpointsApplicable = checkpointsHit + checkpointsMissed;

    const rawRating = params.rawSectionRatings?.[sec.id]?.qualityRating;
    let sectionScore0to1: number | null = null;
    if (weight === 0 || checkpointsApplicable === 0) {
      sectionScore0to1 = null;
    } else {
      const validRating =
        typeof rawRating === 'number' && rawRating >= 1 && rawRating <= 5
          ? Math.round(rawRating)
          : Math.max(1, Math.min(5, Math.round((checkpointsHit / checkpointsApplicable) * 4 + 1)));

      sectionScore0to1 =
        CHECKPOINT_SHARE * (checkpointsHit / checkpointsApplicable) +
        QUALITY_RATING_SHARE * (validRating / 5);
    }

    const qualityRating =
      sectionScore0to1 === null
        ? 0
        : typeof rawRating === 'number' && rawRating >= 1 && rawRating <= 5
        ? Math.round(rawRating)
        : Math.max(1, Math.min(5, Math.round((checkpointsHit / checkpointsApplicable) * 4 + 1)));

    const sectionScore = sectionScore0to1 !== null ? Math.round(sectionScore0to1 * 100) : null;

    if (sectionScore0to1 !== null && weight > 0) {
      weightedPointsSum += sectionScore0to1 * weight;
      countedWeightSum += weight;
    }

    return {
      id: sec.id,
      title: sec.title,
      shortTitle: sec.shortTitle,
      weight,
      qualityRating,
      checkpointsHit,
      checkpointsApplicable,
      sectionScore,
      rationale: params.rawSectionRatings?.[sec.id]?.rationale,
    };
  });

  const totalScore =
    countedWeightSum > 0 ? Math.round((weightedPointsSum / countedWeightSum) * 100) : 0;

  const band = getBandForScore(totalScore);

  const getSec10 = (id: InsurvoiceSectionId, fallback = 5) => {
    const s = evaluatedSections.find((sec) => sec.id === id);
    if (!s || s.sectionScore === null) return fallback;
    return Math.round(s.sectionScore / 10);
  };

  // Backwards-compatible 0-10 fields + full Insurvoice v1.0 rubric data
  const scorecard: CallScorecard = {
    greeting: getSec10('opening', 6),
    needsDiscovery: Math.round(((getSec10('discovery', 6) + getSec10('pain', 5)) / 2)),
    objectionHandling: getSec10('objections', 6),
    closingAndNextStep: getSec10('close', 6),
    politeness: getSec10('presence', 7),
    rubricVersion: INSURVOICE_RUBRIC_VERSION,
    callType,
    band,
    sections: evaluatedSections,
    checkpoints: evaluatedCheckpoints,
  };

  return {
    totalScore,
    band,
    scorecard,
  };
}


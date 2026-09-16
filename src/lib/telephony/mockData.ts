import { QuoCall, QuoUser, CallAnalysisResult } from '@/types/telephony';

export const MOCK_MANAGERS: QuoUser[] = [
  { id: 'usr_1', firstName: 'Александр', lastName: 'Смирнов', name: 'Александр Смирнов', email: 'alex@company.com', role: 'Менеджер по продажам' },
  { id: 'usr_2', firstName: 'Екатерина', lastName: 'Волкова', name: 'Екатерина Волкова', email: 'ekaterina@company.com', role: 'Старший менеджер' },
  { id: 'usr_3', firstName: 'Дмитрий', lastName: 'Новиков', name: 'Дмитрий Новиков', email: 'dmitry@company.com', role: 'Менеджер по продажам' },
  { id: 'usr_4', firstName: 'Анна', lastName: 'Кузнецова', name: 'Анна Кузнецова', email: 'anna@company.com', role: 'Квалификатор лидов' },
];

export const MOCK_CALLS: QuoCall[] = [
  {
    id: 'call_101',
    direction: 'inbound',
    status: 'completed',
    duration: 274, // ~4.5 min
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    from: '+1 (415) 890-1234',
    to: '+1 (800) 555-0199',
    userId: 'usr_1',
    userName: 'Александр Смирнов',
    hasRecording: true,
  },
  {
    id: 'call_102',
    direction: 'outbound',
    status: 'completed',
    duration: 385,
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    from: '+1 (800) 555-0199',
    to: '+1 (312) 441-7890',
    userId: 'usr_2',
    userName: 'Екатерина Волкова',
    hasRecording: true,
  },
  {
    id: 'call_103',
    direction: 'inbound',
    status: 'missed',
    duration: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    from: '+1 (206) 555-8822',
    to: '+1 (800) 555-0199',
    userId: 'usr_3',
    userName: 'Дмитрий Новиков',
    hasRecording: false,
  },
  {
    id: 'call_104',
    direction: 'outbound',
    status: 'completed',
    duration: 190,
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    from: '+1 (800) 555-0199',
    to: '+1 (917) 332-9011',
    userId: 'usr_1',
    userName: 'Александр Смирнов',
    hasRecording: true,
  },
  {
    id: 'call_105',
    direction: 'inbound',
    status: 'completed',
    duration: 410,
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    from: '+1 (650) 412-8819',
    to: '+1 (800) 555-0199',
    userId: 'usr_4',
    userName: 'Анна Кузнецова',
    hasRecording: true,
  },
];

export const MOCK_ANALYSES: Record<string, CallAnalysisResult> = {
  call_101: {
    callId: 'call_101',
    score: 88,
    sentiment: 'positive',
    summary: 'Клиент обратился с запросом на расчет страховки коммерческой недвижимости. Менеджер выявил площадь объекта, риски и предложил расширенный пакет с франшизой 5%.',
    keyPoints: [
      'Объект: складской комплекс 2,500 кв.м.',
      'Интересует защита от пожара, затопления и ответственность перед третьими лицами',
      'Бюджет клиента: до $3,500 в год',
    ],
    agreements: [
      'Менеджер готовит 2 варианта коммерческого предложения до 17:00 сегодня',
      'Запланирован звонок для презентации сметы завтра в 11:30',
    ],
    managerStrengths: [
      'Идеальное приветствие с указанием должности и компании',
      'Грамотно задал вопросы по параметрам безопасности объекта',
      'Не настаивал агрессивно, проявил заботу о бюджете клиента',
    ],
    managerMistakes: [
      'Не уточнил, кто еще принимает решение по сделке кроме собеседника',
    ],
    actionItems: [
      'Составить калькуляцию и выслать на почту клиента',
      'Внести объект в CRM со статусом «КП подготовлено»',
    ],
    scorecard: {
      greeting: 10,
      needsDiscovery: 9,
      objectionHandling: 8,
      closingAndNextStep: 9,
      politeness: 10,
    },
    transcript: [
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Добрый день! Компания InsurQuote, меня зовут Александр. Чем могу помочь вам сегодня?' },
      { speaker: 'customer', text: 'Здравствуйте, Александр. Мы недавно приобрели склад в районе Остина, нужно оформить страховку перед запуском аренды.' },
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Отлично, поздравляю с приобретением! С удовольствием помогу подобрать оптимальный полис. Подскажите общую площадь и есть ли уже система пожаротушения?' },
      { speaker: 'customer', text: 'Да, около 2500 метров, спринклерная система установлена. Хотим закрыть риски пожара, стихийных бедствий и ответственности.' },
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Понял вас. Мы можем предложить пакетное решение со скидкой 15% за наличие спринклеров. Я подготовлю детальный расчет с двумя опциями франшизы и пришлю вам до конца дня. Удобно будет обсудить завтра в 11:30?' },
      { speaker: 'customer', text: 'Да, Александр, 11:30 мне подходит. Спасибо, жду на почту!' },
    ],
  },
  call_102: {
    callId: 'call_102',
    score: 94,
    sentiment: 'positive',
    summary: 'Повторный звонок постоянному клиенту по продлению корпоративного полиса. Екатерина блестяще отработала возражение по индексации тарифа и сохранила клиента.',
    keyPoints: [
      'Продление договора на следующий год',
      'Возражение клиента по поводу повышения ставки на 8%',
      'Предложена скидка за безаварийность в прошлом периоде',
    ],
    agreements: [
      'Договор пролонгирован на 12 месяцев на льготных условиях',
      'Счет выставлен и ожидает оплаты до пятницы',
    ],
    managerStrengths: [
      'Высочайшая компетентность и аргументация ценности',
      'Четкие цифры и выгоды без лишней "воды"',
      'Моментальное закрытие на оплату счета',
    ],
    managerMistakes: [],
    actionItems: [
      'Сформировать доп. соглашение и выставить инвойс',
    ],
    scorecard: {
      greeting: 10,
      needsDiscovery: 9,
      objectionHandling: 10,
      closingAndNextStep: 10,
      politeness: 10,
    },
    transcript: [
      { speaker: 'agent', speakerName: 'Екатерина Волкова', text: 'Михаил, добрый день! Екатерина из InsurQuote, как ваши дела?' },
      { speaker: 'customer', text: 'Здравствуйте, Екатерина. Видел письмо по пролонгации, но почему цена выросла?' },
      { speaker: 'agent', speakerName: 'Екатерина Волкова', text: 'Понимаю ваш вопрос. Рыночная инфляция составила 12%, однако с учетом вашей безупречной истории мы согласовали для вас специальный коэффициент, сэкономив вам более $1,200 по сравнению с новыми клиентами.' },
      { speaker: 'customer', text: 'А, вот как. Хорошо, тогда это разумно. Присылайте обновленный инвойс.' },
      { speaker: 'agent', speakerName: 'Екатерина Волкова', text: 'Уже отправляю! Благодарю за доверие, хорошего дня!' },
    ],
  },
  call_104: {
    callId: 'call_104',
    score: 65,
    sentiment: 'neutral',
    summary: 'Холодный звонок по заявке с сайта. Менеджер сбился со скрипта, перебил клиента и не смог внятно аргументировать стоимость, не назначив точный дедлайн.',
    keyPoints: [
      'Клиент оставил заявку на расчет автопарка',
      'Клиент торопился и задавал конкретные вопросы по стоимости',
    ],
    agreements: [
      '«Спишемся как-нибудь на неделе» — четкая договоренность отсутствует',
    ],
    managerStrengths: [
      'Быстро вышел на связь после заявки с сайта',
    ],
    managerMistakes: [
      'Перебил клиента на 35-й секунде',
      'Не озвучил вилку цен, начал навязывать длинный опросник',
      'Слабая фиксация следующего шага',
    ],
    actionItems: [
      'Провести тренинг по отработке возражения "Назовите просто цену"',
      'Повторно связаться с лидом с четким оффером',
    ],
    scorecard: {
      greeting: 7,
      needsDiscovery: 5,
      objectionHandling: 6,
      closingAndNextStep: 4,
      politeness: 6,
    },
    transcript: [
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Алло, это Александр, вы оставляли заявку.' },
      { speaker: 'customer', text: 'Да, подскажите, сколько стоит застраховать 5 пикапов Ford?' },
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Подождите, мне сначала нужно заполнить анкету на 20 пунктов, без этого я вам ничего не скажу.' },
      { speaker: 'customer', text: 'Я сейчас за рулем, мне нужен примерный ориентир, а не анкета...' },
      { speaker: 'agent', speakerName: 'Александр Смирнов', text: 'Ну ладно, я вам скину что-нибудь на почту, потом посмотрите.' },
    ],
  },
};

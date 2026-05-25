'use client';

export interface PlatformConfig {
  text: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  videoUrl: string;
  status: 'draft' | 'publishing' | 'published' | 'failed';
  publishedAt: string | null;
  error: string | null;
  textHistory: string[];
  activeTextIndex: number;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } | null;
}

export interface Post {
  id: string;
  title: string;
  originalSignal: string;
  source: string;
  viralScore: number;
  createdAt: string;
  platforms: {
    linkedin: PlatformConfig;
    telegram: PlatformConfig;
    twitter: PlatformConfig;
  };
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'ИИ-автоматизация урегулирования убытков в страховании',
    originalSignal: 'Claims turnaround lag by 15 days, customer attrition high, looking for AI status updates.',
    source: 'Reddit',
    viralScore: 89,
    createdAt: new Date().toISOString(),
    platforms: {
      linkedin: {
        text: 'Как ИИ решает проблему задержек в обработке страховых претензий? 🤖⚙️\n\nКаждый страховой агент знает: клиенты не любят ждать. Задержка в выплатах даже на 10 дней повышает риск ухода клиента на 25%. \n\nВ нашем последнем кейсе внедрение ИИ-ассистента помогло:\n🔹 Сократить время обработки заявки с 15 дней до 24 часов\n🔹 Автоматизировать разбор документов на 92%\n🔹 Снизить отток клиентов на 40%\n\nБудущее страхования уже наступило. А как вы боретесь с операционной рутиной? Делитесь в комментариях! 👇',
        mediaType: 'image',
        imageUrl: '/images/claims_linkedin.png',
        videoUrl: '/images/claims_video_linkedin.png',
        status: 'draft',
        publishedAt: null,
        error: null,
        textHistory: [
          'Как ИИ решает проблему задержек в обработке страховых претензий? 🤖⚙️\n\nКаждый страховой агент знает: клиенты не любят ждать. Задержка в выплатах даже на 10 дней повышает риск ухода клиента на 25%. \n\nВ нашем последнем кейсе внедрение ИИ-ассистента помогло:\n🔹 Сократить время обработки заявки с 15 дней до 24 часов\n🔹 Автоматизировать разбор документов на 92%\n🔹 Снизить отток клиентов на 40%\n\nБудущее страхования уже наступило. А как вы боретесь с операционной рутиной? Делитесь в комментариях! 👇',
          'Автоматизация урегулирования убытков: от рутины к эффективности 🚀\n\nКлиенты уходят из-за долгих согласований? Вы не одиноки. Среднее время обработки претензий на рынке составляет 14-21 день.\n\nИИ-модели сегодня способны:\n1. Анализировать сканы документов за 3 секунды.\n2. Выявлять признаки мошенничества.\n3. Отправлять статус клиенту автоматически.\n\nРезультат: счастливые клиенты и разгруженный бэк-офис.',
          'Кейс: Как искусственный интеллект повысил удержание клиентов на 40% 📈\n\nКогда сроки рассмотрения претензий у крупного брокера выросли до 3 недель, начался кризис. Негативные отзывы росли как снежный ком.\n\nМы внедрили интеллектуальный конвейер документов. Теперь рутинные задачи решает ИИ, а сложные случаи — эксперт. Клиенты получают выплаты быстрее, а брокеры зарабатывают больше.'
        ],
        activeTextIndex: 0,
        metrics: null
      },
      telegram: {
        text: '🔥 Как ИИ спасает страховые агентства от оттока клиентов?\n\nДолгое согласование выплат — главная боль клиентов. 3 недели ожидания = потеря лояльности и куча 1-звездных отзывов.\n\nЧто делать? Внедрять автообработку:\n⚡️ ИИ считывает претензии за секунды\n⚡️ Автоматически обновляет статус в CRM\n⚡️ Экономит до 15 часов рутины в неделю\n\nПодробности о том, как запустить ИИ-конвейер в своем агентстве — в нашем канале! Подписывайтесь 🚀',
        mediaType: 'image',
        imageUrl: '/images/claims_telegram.png',
        videoUrl: '/images/claims_video_telegram.png',
        status: 'published',
        publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
        error: null,
        textHistory: [
          '🔥 Как ИИ спасает страховые агентства от оттока клиентов?\n\nДолгое согласование выплат — главная боль клиентов. 3 недели ожидания = потеря лояльности и куча 1-звездных отзывов.\n\nЧто делать? Внедрять автообработку:\n⚡️ ИИ считывает претензии за секунды\n⚡️ Автоматически обновляет статус в CRM\n⚡️ Экономит до 15 часов рутины в неделю\n\nПодробности о том, как запустить ИИ-конвейер в своем агентстве — в нашем канале! Подписывайтесь 🚀',
          '🤖 ИИ в страховании: хайп или реальная экономия?\n\nПока конкуренты перебивают данные вручную, передовые агентства используют ИИ-агентов. \n\nЦифры говорят сами за себя:\n👉 98% точности при первичном анализе полисов\n👉 1 час на аудит 50 сложных лимитов ответственности вместо 10 часов ручной работы.\n\nХотите автоматизировать процессы? Читайте наш гайд выше! 👇',
          'Устали от копипасты в CRM? 🤯\n\nКаждый агент тратит до 2 часов в день на перенос данных из писем. Это глупо.\n\nСовременные LLM умеют:\n📍 Читать входящие письма\n📍 Делать саммари обращений\n📍 Готовить шаблоны ответов\n\nОсвободите время для реальных продаж с помощью ИИ.'
        ],
        activeTextIndex: 0,
        metrics: {
          views: 1850,
          likes: 240,
          comments: 34,
          shares: 56
        }
      },
      twitter: {
        text: 'Задержки страховых выплат убивают ваш бизнес? 📉 Клиенты не будут ждать 3 недели. ИИ-ассистенты сокращают обработку претензий до 24 часов и сохраняют до 40% лояльных клиентов. Будущее страхования уже здесь! 🤖 #insurtech #insurance #AI #automation',
        mediaType: 'image',
        imageUrl: '/images/claims_twitter.png',
        videoUrl: '/images/claims_video_twitter.png',
        status: 'failed',
        publishedAt: null,
        error: 'API Connection Timeout (504): Twitter Gateway timed out.',
        textHistory: [
          'Задержки страховых выплат убивают ваш бизнес? 📉 Клиенты не будут ждать 3 недели. ИИ-ассистенты сокращают обработку претензий до 24 часов и сохраняют до 40% лояльных клиентов. Будущее страхования уже здесь! 🤖 #insurtech #insurance #AI #automation',
          'Ручной разбор документов в страховании — это прошлый век. ИИ анализирует сканы полисов за 3 секунды с точностью 98%. Вы все еще заполняете таблицы руками? 🤯 #SaaS #Underwriting #AI',
          'Как поднять лояльность клиентов на 35%? Отправляйте персонализированные предложения на базе ИИ при продлении полисов, а не скучные уведомления. Работает безотказно! 📊 #marketing #insurtech #AI'
        ],
        activeTextIndex: 0,
        metrics: null
      }
    }
  },
  {
    id: 'post-2',
    title: 'Автоматизация коммерческого андеррайтинга',
    originalSignal: 'Deploying commercial underwriting agents, human audit time reduced to 1 hr for 50 complex liability policies.',
    source: 'LinkedIn',
    viralScore: 94,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    platforms: {
      linkedin: {
        text: 'Вчера мы провели эксперимент. Запустили ИИ-агента, обученного на наших правилах андеррайтинга, для пре-скрининга 50 коммерческих заявок на страхование ответственности. 📊⚙️\n\nРезультаты поразительны:\n⏱ Время аудита человеком: всего 1 час.\n🎯 Точность: 98%.\n\nБудущее уже наступило. Брокеры, которые игнорируют ИИ, проиграют в скорости урегулирования и потеряют лучших клиентов. А вы готовы доверить андеррайтинг машинам?',
        mediaType: 'image',
        imageUrl: '/images/underwriting_linkedin.png',
        videoUrl: '/images/underwriting_video_linkedin.png',
        status: 'published',
        publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        error: null,
        textHistory: [
          'Вчера мы провели эксперимент. Запустили ИИ-агента, обученного на наших правилах андеррайтинга, для пре-скрининга 50 коммерческих заявок на страхование ответственности. 📊⚙️\n\nРезультаты поразительны:\n⏱ Время аудита человеком: всего 1 час.\n🎯 Точность: 98%.\n\nБудущее уже наступило. Брокеры, которые игнорируют ИИ, проиграют в скорости урегулирования и потеряют лучших клиентов. А вы готовы доверить андеррайтинг машинам?'
        ],
        activeTextIndex: 0,
        metrics: {
          views: 4520,
          likes: 580,
          comments: 89,
          shares: 112
        }
      },
      telegram: {
        text: '🤖 Запустили ИИ-андеррайтера: 50 полисов за 1 час!\n\nПровели жесткий тест в коммерческом страховании. Загрузили 50 сложных лимитов ответственности в ИИ-агента, обученного по внутренним регламентам.\n\nРезультаты:\n✅ Точность совпадения с экспертным решением — 98%\n✅ Время проверки человеком — 1 час вместо 10\n\nИншуртех меняет правила игры. Кто не успеет перестроиться — вылетит с рынка.',
        mediaType: 'image',
        imageUrl: '/images/underwriting_telegram.png',
        videoUrl: '/images/underwriting_video_telegram.png',
        status: 'draft',
        publishedAt: null,
        error: null,
        textHistory: [
          '🤖 Запустили ИИ-андеррайтера: 50 полисов за 1 час!\n\nПровели жесткий тест в коммерческом страховании. Загрузили 50 сложных лимитов ответственности в ИИ-агента, обученного по внутренним регламентам.\n\nРезультаты:\n✅ Точность совпадения с экспертным решением — 98%\n✅ Время проверки человеком — 1 час вместо 10\n\nИншуртех меняет правила игры. Кто не успеет перестроиться — вылетит с рынка.'
        ],
        activeTextIndex: 0,
        metrics: null
      },
      twitter: {
        text: 'ИИ-андеррайтер обработал 50 комплексных заявок на страхование бизнеса за 1 час с точностью 98%. Экономия времени андеррайтера — 90%. Скорость урегулирования теперь решает все. 🔥🤖 #insurtech #underwriting #AI',
        mediaType: 'image',
        imageUrl: '/images/underwriting_twitter.png',
        videoUrl: '/images/underwriting_video_twitter.png',
        status: 'published',
        publishedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        error: null,
        textHistory: [
          'ИИ-андеррайтер обработал 50 комплексных заявок на страхование бизнеса за 1 час с точностью 98%. Экономия времени андеррайтера — 90%. Скорость урегулирования теперь решает все. 🔥🤖 #insurtech #underwriting #AI'
        ],
        activeTextIndex: 0,
        metrics: {
          views: 1250,
          likes: 98,
          comments: 12,
          shares: 24
        }
      }
    }
  }
];

const STORAGE_KEY = 'insurvoice_posting_store';

export function getPosts(): Post[] {
  if (typeof window === 'undefined') return INITIAL_POSTS;
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  }
  
  try {
    return JSON.parse(saved);
  } catch (e) {
    return INITIAL_POSTS;
  }
}

export function savePosts(posts: Post[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }
}

export function updatePostPlatform(
  postId: string,
  platform: 'linkedin' | 'telegram' | 'twitter',
  updater: (cfg: PlatformConfig) => Partial<PlatformConfig>
): Post[] {
  const posts = getPosts();
  const updated = posts.map((post) => {
    if (post.id === postId) {
      const currentConfig = post.platforms[platform];
      const updatedConfig = {
        ...currentConfig,
        ...updater(currentConfig),
      };
      return {
        ...post,
        platforms: {
          ...post.platforms,
          [platform]: updatedConfig,
        },
      };
    }
    return post;
  });
  savePosts(updated);
  return updated;
}

// src/Pages/Landing/Context/LanguageContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── ПЕРЕВОДЫ ───────────────────────────────────────────────────────────────
export const TRANSLATIONS = {
  ru: {
    // Header
    nav: {
      features:  "Возможности",
      pricing:   "Тарифы",
      partners:  "Партнёрам",
    },
    navDesc: {
      features:  "Все модули платформы",
      pricing:   "Выберите свой план",
      partners:  "Станьте партнёром",
    },
    auth: {
      login:    "Войти",
      register: "Начать",
      registerFull: "Начать бесплатно",
      loginFull:    "Войти в аккаунт",
    },
    ecosystem: "Экосистема FinLab",
    footer: "FinLab OS · Business Operating System",

    // ─── HERO ──────────────────────────────────────────────────────────────
    hero: {
      badge: "Единая операционная система для бизнеса",
      subtitle: "FinLab — единое цифровое пространство для всей компании. Финансы, HR, задачи, склад и коммуникации в одной платформе. Актуальные данные, прозрачные процессы и полный контроль — без Excel и разрозненных инструментов.",
      cta: "Начать бесплатно",
      demo: "Смотреть демо",
      dashboardTitle: "Единый дашборд",
      aiInsight: "AI-инсайт",
      aiMessage: "Обнаружено 3 задачи без исполнителей. В отделе продаж низкая активность. Рекомендуем проверить складские остатки.",
      rotators: {
        finance: { 
          tag: "Финансы", 
          title: "Управляй cashflow, прибылью и бюджетами", 
          highlight: "в реальном времени" 
        },
        hr: { 
          tag: "HR", 
          title: "Сотрудники, отделы, зарплаты и таймшиты", 
          highlight: "в одной системе" 
        },
        tasks_module: { 
          tag: "Задачи", 
          title: "Управляй проектами и задачами команды", 
          highlight: "эффективно" 
        },
        warehouse: { 
          tag: "Склад", 
          title: "Товары, закупки, продажи и остатки", 
          highlight: "всегда под контролем" 
        },
        communication: { 
          tag: "Коммуникация", 
          title: "Чаты, уведомления и обсуждения", 
          highlight: "в едином пространстве" 
        }
      },
      stats: {
        allModules: { value: "Все модули", label: "в 1 системе" },
        reports: { value: "50+", label: "отчётов" },
        freeDays: { value: "14 дней", label: "бесплатно" },
        support: { value: "24/7", label: "поддержка" }
      }
    },

    // ─── METRICS ────────────────────────────────────────────────────────────
    metrics: {
      cashflow: { label: "ДДС", sub: "Чистый поток" },
      profit: { label: "P&L", sub: "Прибыль / мес" },
      balance: { label: "Баланс", sub: "Чистые активы" },
      tasks: { label: "Задачи", sub: "В работе" }
    },

    // ─── FEATURES ──────────────────────────────────────────────────────────
    features: {
      badge: "Вся экосистема в одной платформе",
      title: "Всё для управления бизнесом",
      titleHighlight: "в едином пространстве",
      subtitle: "FinLab объединяет финансы, HR, задачи, склад и коммуникации в одну платформу. Никаких разрозненных систем и Excel-таблиц.",
      ctaTitle: "Готовы перейти на новый уровень?",
      ctaSubtitle: "Настраиваем систему под ваш бизнес за 1 рабочий день",
      ctaButton: "Начать бесплатно",
      list: {
        finance: {
          tag: "Финансы",
          title: "Управление cashflow, P&L и балансом",
          desc: "Автоматический учёт доходов и расходов, отчёты по МСФО, прогнозирование и бюджет в реальном времени.",
          metric: "50+ отчётов"
        },
        hr: {
          tag: "HR",
          title: "Сотрудники, отделы и зарплаты",
          desc: "Полный цикл управления персоналом: от найма до увольнения. Табели, отпуска, больничные и расчёт зарплаты.",
          metric: "Вся команда"
        },
        tasks: {
          tag: "Задачи",
          title: "Проекты и поручения",
          desc: "Управление задачами, дедлайнами и проектами. Назначение исполнителей, контроль сроков и статусов.",
          metric: "24/7 контроль"
        },
        warehouse: {
          tag: "Склад",
          title: "Учёт товаров и остатков",
          desc: "Полный складской учёт: приход, расход, инвентаризация, резервирование и аналитика по товарам.",
          metric: "В реальном времени"
        },
        communication: {
          tag: "Коммуникация",
          title: "Чаты и уведомления",
          desc: "Встроенные чаты для обсуждения задач, уведомления о событиях и обмен файлами в едином пространстве.",
          metric: "Без спама"
        },
        dashboard: {
          tag: "Дашборды",
          title: "Единый центр управления",
          desc: "Все ключевые метрики в одном месте: финансы, HR, задачи, склад — в удобных дашбордах и виджетах.",
          metric: "Всё в одном окне"
        }
      }
    },

    // ─── CTA ────────────────────────────────────────────────────────────────
    cta: {
      badge: "AI Finance Platform · 2100",
      titlePart1: "Квантовый скачок",
      titlePart2: "в управлении",
      titlePart3: "финансами",
      description: "Управляйте финансами будущего — в реальном времени, с ИИ-прогнозами, голографической аналитикой и квантовой безопасностью.",
      startButton: "Начать эру",
      demoButton: "Смотреть демо",
      items: {
        noCard: "Без карты",
        aiAnalytics: "AI-аналитика",
        oneDaySetup: "Настройка за 1 день",
        support247: "Поддержка 24/7"
      }
    },

    // ─── LOGOS ──────────────────────────────────────────────────────────────
    logos: {
      badge: "Нам доверяют",
      title: "Компании, которые уже растут с Finlab",
      subtitle: "От стартапов до холдингов с 1000+ сотрудниками",
      logos: {
        edtech: "EdTech, 300+ сотрудников",
        online_education: "Онлайн-образование",
        marketplace_analytics: "Аналитика маркетплейсов",
        medicine: "Медицина и клиники",
        ecommerce: "E-commerce, Узбекистан",
        transport: "Транспорт и логистика"
      },
      stats: {
        companies: { label: "компаний доверяют" },
        retention: { label: "остаются после триала" },
        setup: { label: "среднее время настройки" },
        rating: { label: "средняя оценка клиентов" }
      },
      testimonials: {
        alexey: {
          text: "Finlab заменил нам разрозненные системы. Теперь всё в одном месте — финансы, HR, задачи и склад в реальном времени.",
          name: "Алексей К.",
          role: "CEO, IT-компания, 85 чел."
        },
        madina: {
          text: "Единая платформа изменила всё. Кассовые разрывы ушли, сотрудники в единой системе, задачи не теряются.",
          name: "Мадина Р.",
          role: "CFO, Торговая сеть"
        },
        timur: {
          text: "Внедрили Finlab за день. Команда сразу начала работать — без обучения, без Excel, всё в едином пространстве.",
          name: "Тимур С.",
          role: "Основатель, SaaS-стартап"
        }
      }
    },

    // ─── REGISTER BLOCK ─────────────────────────────────────────────────────
    register: {
      badge: "FinLab OS — Экосистема",
      title: "Управляйте",
      titleHighlight: "бизнес-вселенной",
      description: "FinLab объединяет финансы, HR, задачи, склад и коммуникации в единую AI-платформу. Без разрозненных систем. Единый источник достоверных данных для принятия стратегических решений.",
      ecosystem: {
        finance: "Финансы",
        hr: "HR",
        tasks: "Задачи",
        warehouse: "Склад",
        chat: "Чаты"
      },
      features: {
        ai: { 
          text: "AI-рекомендации по оптимизации бизнес-процессов", 
          desc: "Интеллектуальный анализ данных и прогнозирование" 
        },
        banking: { 
          text: "Консолидация банковских данных в едином контуре", 
          desc: "Единый финансовый хаб с автоматической выверкой" 
        },
        report: { 
          text: "Автоматическая генерация управленческой отчётности", 
          desc: "ДДС, P&L, баланс и другие отчёты в один клик" 
        }
      },
      form: {
        title: "Начать работу",
        subtitle: "7 дней бесплатного доступа ко всем модулям FinLab",
        email: "Email",
        password: "Пароль",
        button: "Начать в экосистеме",
        loading: "Создание аккаунта...",
        security: "Квантовая защита: активна",
        haveAccount: "Уже есть аккаунт?",
        login: "Войти"
      },
      errors: {
        emptyFields: "Пожалуйста, заполните все поля"
      }
    },

    // ─── FOOTER ─────────────────────────────────────────────────────────────
    footer: {
      brand: {
        subtitle: "Business Operating System",
        description: "Единая операционная система для управления финансами, персоналом, задачами, складом и коммуникациями."
      },
      titles: {
        products: "Продукты",
        features: "Возможности",
        company: "Компания"
      },
      items: {
        products: {
          finance: "Финансы и учёт",
          hr: "Управление персоналом",
          tasks: "Задачи и проекты",
          warehouse: "Склад и логистика",
          communication: "Коммуникации и чаты"
        },
        features: {
          ai_analytics: "AI-аналитика",
          automation: "Автоматизация",
          integrations: "Интеграции",
          api_docs: "API документация",
          mobile_app: "Мобильное приложение"
        },
        company: {
          about: "О платформе",
          security: "Безопасность",
          partners: "Партнёрам",
          career: "Карьера",
          support: "Поддержка"
        }
      },
      cta: {
        badge: "Начните сейчас",
        title: "Управляйте бизнесом",
        titleHighlight: "в единой экосистеме",
        description: "FinLab объединяет финансы, HR, задачи, склад и коммуникации в одной платформе. Без разрозненных систем.",
        button: "Начать бесплатно"
      },
      bottom: {
        copyright: "© 2026 FinLab. All rights reserved.",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        email: "support@finlab.ai"
      }
    },

    // Pricing
    pricing: {
      title:    "Простые тарифы",
      subtitle: "Без скрытых платежей",
      free:     "Бесплатно",
      pro:      "Про",
      enterprise:"Энтерпрайз",
      perMonth: "/ мес",
      startFree:"Начать бесплатно",
      contact:  "Связаться",
    },

    // Partners
    partners: {
      title:    "Партнёрская программа",
      subtitle: "Зарабатывайте вместе с нами",
      join:     "Стать партнёром",
    },

    // Common
    common: {
      learnMore: "Узнать больше",
      getStarted:"Начать",
      back:      "Назад",
      next:      "Далее",
      close:     "Закрыть",
    },
  },

  en: {
    nav: {
      features:  "Features",
      pricing:   "Pricing",
      partners:  "Partners",
    },
    navDesc: {
      features:  "All platform modules",
      pricing:   "Choose your plan",
      partners:  "Become a partner",
    },
    auth: {
      login:    "Login",
      register: "Get started",
      registerFull: "Start for free",
      loginFull:    "Sign in",
    },
    ecosystem: "FinLab Ecosystem",
    footer: "FinLab OS · Business Operating System",

    // ─── HERO ──────────────────────────────────────────────────────────────
    hero: {
      badge: "Unified operating system for business",
      subtitle: "FinLab is a unified digital space for your entire company. Finance, HR, tasks, warehouse, and communications in one platform. Real-time data, transparent processes, and full control — without Excel and scattered tools.",
      cta: "Start Free",
      demo: "Watch Demo",
      dashboardTitle: "Unified Dashboard",
      aiInsight: "AI Insight",
      aiMessage: "3 tasks without assignees detected. Low activity in the sales department. We recommend checking warehouse stock.",
      rotators: {
        finance: { 
          tag: "Finance", 
          title: "Manage cashflow, profit and budgets", 
          highlight: "in real time" 
        },
        hr: { 
          tag: "HR", 
          title: "Employees, departments, payrolls and timesheets", 
          highlight: "in one system" 
        },
        tasks_module: { 
          tag: "Tasks", 
          title: "Manage projects and team tasks", 
          highlight: "efficiently" 
        },
        warehouse: { 
          tag: "Warehouse", 
          title: "Goods, purchases, sales and stock", 
          highlight: "always under control" 
        },
        communication: { 
          tag: "Communication", 
          title: "Chats, notifications and discussions", 
          highlight: "in one space" 
        }
      },
      stats: {
        allModules: { value: "All modules", label: "in 1 system" },
        reports: { value: "50+", label: "reports" },
        freeDays: { value: "14 days", label: "free" },
        support: { value: "24/7", label: "support" }
      }
    },

    // ─── METRICS ────────────────────────────────────────────────────────────
    metrics: {
      cashflow: { label: "DCF", sub: "Net flow" },
      profit: { label: "P&L", sub: "Profit / month" },
      balance: { label: "Balance", sub: "Net assets" },
      tasks: { label: "Tasks", sub: "In progress" }
    },

    // ─── FEATURES ──────────────────────────────────────────────────────────
    features: {
      badge: "Full ecosystem in one platform",
      title: "Everything for business management",
      titleHighlight: "in a single space",
      subtitle: "FinLab combines finance, HR, tasks, warehouse and communications into one platform. No scattered systems and Excel spreadsheets.",
      ctaTitle: "Ready to level up?",
      ctaSubtitle: "We set up the system for your business in 1 working day",
      ctaButton: "Start free",
      list: {
        finance: {
          tag: "Finance",
          title: "Cashflow, P&L and balance management",
          desc: "Automatic income and expense tracking, IFRS reports, forecasting and budgeting in real time.",
          metric: "50+ reports"
        },
        hr: {
          tag: "HR",
          title: "Employees, departments and payroll",
          desc: "Full HR lifecycle management: from hiring to termination. Timesheets, vacations, sick leave and payroll.",
          metric: "Entire team"
        },
        tasks: {
          tag: "Tasks",
          title: "Projects and assignments",
          desc: "Task, deadline and project management. Assigning executors, tracking deadlines and statuses.",
          metric: "24/7 control"
        },
        warehouse: {
          tag: "Warehouse",
          title: "Inventory and stock management",
          desc: "Full warehouse management: incoming, outgoing, inventory, reservation and product analytics.",
          metric: "Real-time"
        },
        communication: {
          tag: "Communication",
          title: "Chats and notifications",
          desc: "Built-in chats for task discussions, event notifications and file sharing in a unified space.",
          metric: "No spam"
        },
        dashboard: {
          tag: "Dashboards",
          title: "Unified control center",
          desc: "All key metrics in one place: finance, HR, tasks, warehouse — in convenient dashboards and widgets.",
          metric: "All in one window"
        }
      }
    },

    // ─── CTA ────────────────────────────────────────────────────────────────
    cta: {
      badge: "AI Finance Platform · 2100",
      titlePart1: "Quantum Leap",
      titlePart2: "in Financial",
      titlePart3: "Management",
      description: "Manage the future of finance — in real-time, with AI predictions, holographic analytics and quantum security.",
      startButton: "Start the Era",
      demoButton: "Watch Demo",
      items: {
        noCard: "No card required",
        aiAnalytics: "AI analytics",
        oneDaySetup: "Setup in 1 day",
        support247: "24/7 support"
      }
    },

    // ─── LOGOS ──────────────────────────────────────────────────────────────
    logos: {
      badge: "Trusted by",
      title: "Companies already growing with Finlab",
      subtitle: "From startups to holdings with 1000+ employees",
      logos: {
        edtech: "EdTech, 300+ employees",
        online_education: "Online education",
        marketplace_analytics: "Marketplace analytics",
        medicine: "Medicine & Clinics",
        ecommerce: "E-commerce, Uzbekistan",
        transport: "Transport & Logistics"
      },
      stats: {
        companies: { label: "companies trust us" },
        retention: { label: "stay after trial" },
        setup: { label: "average setup time" },
        rating: { label: "average client rating" }
      },
      testimonials: {
        alexey: {
          text: "Finlab replaced our scattered systems. Now everything is in one place — finance, HR, tasks and warehouse in real time.",
          name: "Alexey K.",
          role: "CEO, IT company, 85 employees"
        },
        madina: {
          text: "The unified platform changed everything. Cash gaps disappeared, employees are in one system, tasks don't get lost.",
          name: "Madina R.",
          role: "CFO, Retail chain"
        },
        timur: {
          text: "We implemented Finlab in one day. The team immediately started working — no training, no Excel, everything in one space.",
          name: "Timur S.",
          role: "Founder, SaaS startup"
        }
      }
    },

    // ─── REGISTER BLOCK ─────────────────────────────────────────────────────
    register: {
      badge: "FinLab OS — Ecosystem",
      title: "Manage your",
      titleHighlight: "business universe",
      description: "FinLab combines finance, HR, tasks, warehouse and communications into a single AI-platform. No scattered systems. A single source of truth for strategic decision-making.",
      ecosystem: {
        finance: "Finance",
        hr: "HR",
        tasks: "Tasks",
        warehouse: "Warehouse",
        chat: "Chats"
      },
      features: {
        ai: { 
          text: "AI-powered business process optimization", 
          desc: "Intelligent data analysis and forecasting" 
        },
        banking: { 
          text: "Consolidated banking data in one place", 
          desc: "Unified financial hub with automatic reconciliation" 
        },
        report: { 
          text: "Automated management reporting", 
          desc: "Cash flow, P&L, balance sheet and other reports in one click" 
        }
      },
      form: {
        title: "Get Started",
        subtitle: "7 days free access to all FinLab modules",
        email: "Email",
        password: "Password",
        button: "Start in ecosystem",
        loading: "Creating account...",
        security: "Quantum security: active",
        haveAccount: "Already have an account?",
        login: "Sign in"
      },
      errors: {
        emptyFields: "Please fill in all fields"
      }
    },

    // ─── FOOTER ─────────────────────────────────────────────────────────────
    footer: {
      brand: {
        subtitle: "Business Operating System",
        description: "Unified operating system for managing finance, HR, tasks, warehouse and communications."
      },
      titles: {
        products: "Products",
        features: "Features",
        company: "Company"
      },
      items: {
        products: {
          finance: "Finance & Accounting",
          hr: "HR Management",
          tasks: "Tasks & Projects",
          warehouse: "Warehouse & Logistics",
          communication: "Communications & Chats"
        },
        features: {
          ai_analytics: "AI Analytics",
          automation: "Automation",
          integrations: "Integrations",
          api_docs: "API Documentation",
          mobile_app: "Mobile App"
        },
        company: {
          about: "About Platform",
          security: "Security",
          partners: "Partners",
          career: "Career",
          support: "Support"
        }
      },
      cta: {
        badge: "Start now",
        title: "Manage your business",
        titleHighlight: "in a unified ecosystem",
        description: "FinLab combines finance, HR, tasks, warehouse and communications in one platform. No scattered systems.",
        button: "Start for free"
      },
      bottom: {
        copyright: "© 2026 FinLab. All rights reserved.",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        email: "support@finlab.ai"
      }
    },

    pricing: {
      title:    "Simple pricing",
      subtitle: "No hidden fees",
      free:     "Free",
      pro:      "Pro",
      enterprise:"Enterprise",
      perMonth: "/ mo",
      startFree:"Start free",
      contact:  "Contact us",
    },

    partners: {
      title:    "Partner Program",
      subtitle: "Earn with us",
      join:     "Become a partner",
    },

    common: {
      learnMore: "Learn more",
      getStarted:"Get started",
      back:      "Back",
      next:      "Next",
      close:     "Close",
    },
  },

  uz: {
    nav: {
      features:  "Imkoniyatlar",
      pricing:   "Narxlar",
      partners:  "Hamkorlar",
    },
    navDesc: {
      features:  "Barcha platforma modullari",
      pricing:   "O'z rejangizni tanlang",
      partners:  "Hamkor bo'ling",
    },
    auth: {
      login:    "Kirish",
      register: "Boshlash",
      registerFull: "Bepul boshlash",
      loginFull:    "Hisobga kirish",
    },
    ecosystem: "FinLab Ekotizimi",
    footer: "FinLab OS · Biznes Operatsion Tizimi",

    // ─── HERO ──────────────────────────────────────────────────────────────
    hero: {
      badge: "Biznes uchun yagona operatsion tizim",
      subtitle: "FinLab — butun kompaniya uchun yagona raqamli makon. Moliya, HR, vazifalar, ombor va kommunikatsiyalar bitta platformada. Dolzarb ma'lumotlar, shaffof jarayonlar va to'liq nazorat — Excel va tarqoq vositalarsiz.",
      cta: "Bepul boshlash",
      demo: "Demoni ko'rish",
      dashboardTitle: "Yagona boshqaruv paneli",
      aiInsight: "AI-tahlil",
      aiMessage: "Ijrochisiz 3 ta vazifa aniqlandi. Sotuv bo'limida faollik past. Ombor qoldiqlarini tekshirish tavsiya etiladi.",
      rotators: {
        finance: { 
          tag: "Moliya", 
          title: "Pul oqimi, foyda va byudjetlarni boshqaring", 
          highlight: "real vaqtda" 
        },
        hr: { 
          tag: "HR", 
          title: "Xodimlar, bo'limlar, ish haqi va vaqt jadvallari", 
          highlight: "bitta tizimda" 
        },
        tasks_module: { 
          tag: "Vazifalar", 
          title: "Loyihalar va jamoaning vazifalarini boshqaring", 
          highlight: "samarali" 
        },
        warehouse: { 
          tag: "Ombor", 
          title: "Tovarlar, xaridlar, sotuvlar va qoldiqlar", 
          highlight: "doim nazorat ostida" 
        },
        communication: { 
          tag: "Kommunikatsiya", 
          title: "Chatlar, xabarlar va muhokamalar", 
          highlight: "yagona makonda" 
        }
      },
      stats: {
        allModules: { value: "Barcha modullar", label: "1 tizimda" },
        reports: { value: "50+", label: "hisobot" },
        freeDays: { value: "14 kun", label: "bepul" },
        support: { value: "24/7", label: "qo'llab-quvvatlash" }
      }
    },

    // ─── METRICS ────────────────────────────────────────────────────────────
    metrics: {
      cashflow: { label: "DD", sub: "Sof oqim" },
      profit: { label: "Foyda", sub: "Foyda / oy" },
      balance: { label: "Balans", sub: "Sof aktivlar" },
      tasks: { label: "Vazifalar", sub: "Jarayonda" }
    },

    // ─── FEATURES ──────────────────────────────────────────────────────────
    features: {
      badge: "To'liq ekotizim bitta platformada",
      title: "Biznesni boshqarish uchun hamma narsa",
      titleHighlight: "yagona makonda",
      subtitle: "FinLab moliya, HR, vazifalar, ombor va kommunikatsiyalarni bitta platformaga birlashtiradi. Tarqoq tizimlar va Excel jadvallarisiz.",
      ctaTitle: "Yangi bosqichga tayyormisiz?",
      ctaSubtitle: "Tizimni biznesingizga 1 ish kunida sozlaymiz",
      ctaButton: "Bepul boshlash",
      list: {
        finance: {
          tag: "Moliya",
          title: "Pul oqimi, P&L va balansni boshqarish",
          desc: "Daromad va xarajatlarni avtomatik hisobga olish, UFRS bo'yicha hisobotlar, real vaqtda prognozlash va byudjetlashtirish.",
          metric: "50+ hisobot"
        },
        hr: {
          tag: "HR",
          title: "Xodimlar, bo'limlar va ish haqi",
          desc: "Xodimlarni boshqarishning to'liq tsikli: ishga qabul qilishdan ishdan bo'shatishgacha. Vaqt jadvallari, ta'tillar, kasallik varaqalari va ish haqini hisoblash.",
          metric: "Butun jamoa"
        },
        tasks: {
          tag: "Vazifalar",
          title: "Loyihalar va topshiriqlar",
          desc: "Vazifalar, muddatlar va loyihalarni boshqarish. Ijrochilarni tayinlash, muddat va holatlar ustidan nazorat.",
          metric: "24/7 nazorat"
        },
        warehouse: {
          tag: "Ombor",
          title: "Tovarlar va qoldiqlarni hisobga olish",
          desc: "To'liq ombor hisobi: kirim, chiqim, inventarizatsiya, zahiralash va tovarlar bo'yicha tahlil.",
          metric: "Real vaqtda"
        },
        communication: {
          tag: "Kommunikatsiya",
          title: "Chatlar va xabarlar",
          desc: "Vazifalarni muhokama qilish uchun o'rnatilgan chatlar, voqealar haqida xabarlar va yagona makonda fayl almashish.",
          metric: "Spamsiz"
        },
        dashboard: {
          tag: "Boshqaruv panellari",
          title: "Yagona boshqaruv markazi",
          desc: "Barcha asosiy ko'rsatkichlar bir joyda: moliya, HR, vazifalar, ombor — qulay panellar va vidjetlarda.",
          metric: "Hammasi bitta oynada"
        }
      }
    },

    // ─── CTA ────────────────────────────────────────────────────────────────
    cta: {
      badge: "AI Moliya Platformasi · 2100",
      titlePart1: "Kvant sakrashi",
      titlePart2: "moliya",
      titlePart3: "boshqaruvida",
      description: "Kelajak moliyasini real vaqtda, AI-prognozlar, golografik tahlil va kvant xavfsizlik bilan boshqaring.",
      startButton: "Erani boshlang",
      demoButton: "Demoni ko'rish",
      items: {
        noCard: "Kartasiz",
        aiAnalytics: "AI-tahlil",
        oneDaySetup: "1 kunda sozlash",
        support247: "24/7 qo'llab-quvvatlash"
      }
    },

    // ─── LOGOS ──────────────────────────────────────────────────────────────
    logos: {
      badge: "Bizga ishonadilar",
      title: "FinLab bilan o'sayotgan kompaniyalar",
      subtitle: "Startaplardan 1000+ xodimli xoldinglargacha",
      logos: {
        edtech: "EdTech, 300+ xodim",
        online_education: "Onlayn ta'lim",
        marketplace_analytics: "Marketpleys tahlili",
        medicine: "Tibbiyot va klinikalar",
        ecommerce: "E-commerce, O'zbekiston",
        transport: "Transport va logistika"
      },
      stats: {
        companies: { label: "kompaniya ishonadi" },
        retention: { label: "sinovdan keyin qoladi" },
        setup: { label: "o'rtacha sozlash vaqti" },
        rating: { label: "o'rtacha mijoz reytingi" }
      },
      testimonials: {
        alexey: {
          text: "FinLab tarqoq tizimlarimizni almashtirdi. Endi hamma narsa bir joyda — moliya, HR, vazifalar va ombor real vaqtda.",
          name: "Alexey K.",
          role: "CEO, IT-kompaniya, 85 xodim"
        },
        madina: {
          text: "Yagona platforma hamma narsani o'zgartirdi. Naqd pul uzilishlari yo'qoldi, xodimlar bitta tizimda, vazifalar yo'qolmaydi.",
          name: "Madina R.",
          role: "CFO, Savdo tarmog'i"
        },
        timur: {
          text: "FinLabni bir kunda o'rnatdik. Jamoa darhol ish boshladi — o'qitishsiz, Excelsiz, hamma narsa bitta makonda.",
          name: "Timur S.",
          role: "Asoschi, SaaS-startap"
        }
      }
    },

    // ─── REGISTER BLOCK ─────────────────────────────────────────────────────
    register: {
      badge: "FinLab OS — Ekotizim",
      title: "Boshqaring",
      titleHighlight: "biznes koinotini",
      description: "FinLab moliya, HR, vazifalar, ombor va kommunikatsiyalarni yagona AI-platformaga birlashtiradi. Tarqoq tizimlarsiz. Strategik qarorlar qabul qilish uchun yagona ishonchli ma'lumotlar manbai.",
      ecosystem: {
        finance: "Moliya",
        hr: "HR",
        tasks: "Vazifalar",
        warehouse: "Ombor",
        chat: "Chatlar"
      },
      features: {
        ai: { 
          text: "AI asosida biznes-jarayonlarni optimallashtirish", 
          desc: "Intellektual ma'lumotlar tahlili va prognozlash" 
        },
        banking: { 
          text: "Bank ma'lumotlarini yagona konturda birlashtirish", 
          desc: "Avtomatik solishtirish bilan yagona moliyaviy markaz" 
        },
        report: { 
          text: "Boshqaruv hisobotini avtomatik generatsiya qilish", 
          desc: "Pul oqimi, P&L, balans va boshqa hisobotlar bir bosishda" 
        }
      },
      form: {
        title: "Ishni boshlash",
        subtitle: "FinLab ning barcha modullariga 7 kun bepul kirish",
        email: "Email",
        password: "Parol",
        button: "Ekotizimda boshlash",
        loading: "Hisob yaratilmoqda...",
        security: "Kvant xavfsizlik: faol",
        haveAccount: "Hisobingiz bormi?",
        login: "Kirish"
      },
      errors: {
        emptyFields: "Iltimos, barcha maydonlarni to'ldiring"
      }
    },

    // ─── FOOTER ─────────────────────────────────────────────────────────────
    footer: {
      brand: {
        subtitle: "Business Operating System",
        description: "Moliya, HR, vazifalar, ombor va kommunikatsiyalarni boshqarish uchun yagona operatsion tizim."
      },
      titles: {
        products: "Mahsulotlar",
        features: "Imkoniyatlar",
        company: "Kompaniya"
      },
      items: {
        products: {
          finance: "Moliya va hisob",
          hr: "Xodimlarni boshqarish",
          tasks: "Vazifalar va loyihalar",
          warehouse: "Ombor va logistika",
          communication: "Kommunikatsiya va chatlar"
        },
        features: {
          ai_analytics: "AI-tahlil",
          automation: "Avtomatlashtirish",
          integrations: "Integratsiyalar",
          api_docs: "API hujjatlari",
          mobile_app: "Mobil ilova"
        },
        company: {
          about: "Platforma haqida",
          security: "Xavfsizlik",
          partners: "Hamkorlar",
          career: "Karyera",
          support: "Qo'llab-quvvatlash"
        }
      },
      cta: {
        badge: "Hozir boshlang",
        title: "Biznesingizni boshqaring",
        titleHighlight: "yagona ekotizimda",
        description: "FinLab moliya, HR, vazifalar, ombor va kommunikatsiyalarni bitta platformada birlashtiradi. Tarqoq tizimlarsiz.",
        button: "Bepul boshlash"
      },
      bottom: {
        copyright: "© 2026 FinLab. Barcha huquqlar himoyalangan.",
        privacy: "Maxfiylik siyosati",
        terms: "Foydalanish shartlari",
        email: "support@finlab.ai"
      }
    },

    pricing: {
      title:    "Sodda tariflar",
      subtitle: "Yashirin to'lovsiz",
      free:     "Bepul",
      pro:      "Pro",
      enterprise:"Enterprise",
      perMonth: "/ oy",
      startFree:"Bepul boshlash",
      contact:  "Bog'lanish",
    },

    partners: {
      title:    "Hamkorlik dasturi",
      subtitle: "Biz bilan daromad oling",
      join:     "Hamkor bo'lish",
    },

    common: {
      learnMore: "Ko'proq bilish",
      getStarted:"Boshlash",
      back:      "Orqaga",
      next:      "Keyingisi",
      close:     "Yopish",
    },
  },
};

export const LANGUAGES = [
  { code: "ru", label: "Русский", short: "RU", flag: "🇷🇺" },
  { code: "en", label: "English",  short: "EN", flag: "🇬🇧" },
  { code: "uz", label: "O'zbek",   short: "UZ", flag: "🇺🇿" },
];

// ─── КОНТЕКСТ ───────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("finlab_lang") || "ru";
    } catch {
      return "ru";
    }
  });

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem("finlab_lang", code); } catch {}
  }, []);

  // Удобный геттер: t("hero.title") или t("auth.login")
  const t = useCallback((key) => {
    const keys = key.split(".");
    let val = TRANSLATIONS[lang];
    for (const k of keys) {
      if (val == null) return key;
      val = val[k];
    }
    return val ?? key;
  }, [lang]);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currentLang, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

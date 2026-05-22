/**
 * HelpPage.jsx
 *
 * Полная внутренняя страница документации и помощи.
 * Роут: /app/help
 *
 * Секции:
 *   - Поиск по статьям
 *   - Быстрый старт (Getting Started)
 *   - Статьи по модулям
 *   - Горячие клавиши
 *   - История версий
 *   - Форма обратной связи
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Данные ───────────────────────────────────────────────────────────────────

const CHANGELOG = [
  {
    version: "2.3.0",
    date: "22 мая 2026",
    badge: "latest",
    changes: [
      { type: "new",  text: "Command Palette (Cmd+K) — поиск по всем разделам" },
      { type: "new",  text: "Цветовая идентификация отделов в навигации" },
      { type: "new",  text: "Центр уведомлений с автотриггерами по складу и импорту" },
      { type: "new",  text: "Страница справки и документации" },
      { type: "fix",  text: "Склад: страница теперь заполняет весь экран" },
      { type: "fix",  text: "Настройки: кнопка «Сбросить» теперь работает корректно" },
      { type: "imp",  text: "Дропдаун групп навигации — добавлен заголовок группы" },
    ],
  },
  {
    version: "2.2.0",
    date: "10 мая 2026",
    badge: null,
    changes: [
      { type: "new",  text: "Склад: вкладки Остатки, Движение, Инвентаризация, Аналитика" },
      { type: "new",  text: "Ручные проводки склада с пакетной записью в Firestore" },
      { type: "new",  text: "Инвентаризация: сверка остатков пачкой" },
      { type: "fix",  text: "Операции: дочерние split-строки убраны из основного списка" },
      { type: "imp",  text: "Аналитика склада: оборачиваемость, топ по движению" },
    ],
  },
  {
    version: "2.1.0",
    date: "28 апреля 2026",
    badge: null,
    changes: [
      { type: "new",  text: "Автоправила — назначение статей по контрагенту/описанию" },
      { type: "new",  text: "Разбивка операций (split) с accordion-раскрытием" },
      { type: "imp",  text: "DateRangePicker: быстрые пресеты (неделя, квартал, год)" },
      { type: "fix",  text: "Исправлена нормализация дат из CSV (mm/dd/yyyy)" },
    ],
  },
  {
    version: "2.0.0",
    date: "15 апреля 2026",
    badge: null,
    changes: [
      { type: "new",  text: "Полностью переработанный интерфейс на Tailwind CSS" },
      { type: "new",  text: "Модуль сотрудников: инвайты, права доступа, блокировка" },
      { type: "new",  text: "Страница настроек: профиль, компания, безопасность, биллинг" },
      { type: "imp",  text: "Производительность: кэш данных пользователя, стримминг Firestore" },
    ],
  },
];

const ARTICLES = [
  {
    module: "Начало работы",
    icon: "🚀",
    color: "#3B6D11",
    bg: "#EAF3DE",
    items: [
      {
        title: "Как начать работу с Finlab",
        content: `
Добро пожаловать в Finlab — систему управления финансами и складом.

**Шаг 1 — Создайте счета**
Перейдите в Справочники → Мои счета и добавьте расчётные счета, кассы или электронные кошельки.

**Шаг 2 — Настройте статьи**
Справочники → Мои статьи. Создайте статьи расходов и доходов (аренда, зарплата, продажи и т.д.).

**Шаг 3 — Импортируйте выписку**
Система → Импорт. Загрузите CSV-выписку из банка. Finlab автоматически распознает операции.

**Шаг 4 — Настройте автоправила**
Система → Операции → Автоправила. Задайте правила автокатегоризации по контрагенту или описанию.

**Шаг 5 — Добавьте товары и склад**
Склад → Товары & Услуги. Добавьте номенклатуру и настройте минимальные остатки.
        `,
      },
      {
        title: "Горячие клавиши",
        content: `
| Клавиша | Действие |
|---------|----------|
| **Cmd+K** / **Ctrl+K** | Открыть Command Palette |
| **N** | Новая операция (на странице операций) |
| **N** | Новая проводка (на странице склада) |
| **Escape** | Закрыть модал / палитру |

Горячие клавиши работают когда фокус не в поле ввода.
        `,
      },
    ],
  },
  {
    module: "Операции",
    icon: "⇄",
    color: "#185FA5",
    bg: "#E6F1FB",
    items: [
      {
        title: "Как добавить операцию вручную",
        content: `
Нажмите **+ Добавить** в правом верхнем углу страницы Операций или клавишу **N**.

**Типы операций:**
- **Поступление** — деньги пришли на счёт
- **Списание** — деньги ушли со счёта
- **Перевод** — перемещение между вашими счетами

Заполните: тип, дата, сумма, контрагент, счёт, статья, проект.

**Разбивка (Split):**
Наведите на строку операции → нажмите ⊕. Укажите суммы и статьи для каждой части. Сумма частей должна совпадать с итогом.
        `,
      },
      {
        title: "Импорт банковских выписок",
        content: `
Перейдите в **Система → Импорт**.

**Поддерживаемые форматы:** CSV

**Требования к файлу:**
- Колонки: дата, сумма, контрагент, описание
- Формат даты: DD.MM.YYYY или MM/DD/YYYY или YYYY-MM-DD
- Кодировка: UTF-8 (рекомендуется)

**После загрузки:**
1. Сопоставьте колонки файла с полями системы
2. Выберите счёт для операций
3. Нажмите «Импортировать»

Finlab уведомит вас об успешном импорте через центр уведомлений.
        `,
      },
      {
        title: "Автоправила категоризации",
        content: `
Автоправила позволяют системе автоматически назначать статью и проект при добавлении операции.

**Как создать правило:**
1. Операции → вкладка «Автоправила»
2. Нажмите «+ Добавить правило»
3. Выберите критерий: по контрагенту или по описанию
4. Введите текст для поиска (например «Яндекс» или «аренда»)
5. Выберите статью и/или проект

Правила применяются автоматически при вводе контрагента или описания в форме операции.
        `,
      },
    ],
  },
  {
    module: "Склад",
    icon: "📦",
    color: "#854F0B",
    bg: "#FAEEDA",
    items: [
      {
        title: "Как вести учёт остатков",
        content: `
**Добавление товара:**
Склад → Товары & Услуги → + Добавить товар. Укажите: название, артикул, ед. измерения, себестоимость, минимальный остаток.

**Движение товаров:**
Склад → вкладка «Движение». Здесь отображаются все приходы и расходы из:
- Закупок (статус «доставлено» или «оплачено»)
- Продаж (статус «отгружено» или «оплачено»)
- Ручных проводок

**Ручная проводка:**
Нажмите «+ Проводка» или клавишу N. Выберите тип: Приход / Расход / Корректировка.

**Инвентаризация:**
Склад → кнопка «Инвентаризация» (или вкладка «Инвентаризация»). Введите фактические остатки — система создаст корректировки для расхождений.
        `,
      },
      {
        title: "Уведомления о низких остатках",
        content: `
Finlab автоматически отправляет уведомления когда:
- Остаток товара ≤ минимального порога (настраивается в карточке товара)
- Товар полностью закончился (0 шт)
- Ежедневная сводка: стоимость склада, количество проблемных позиций

Уведомления отображаются в колокольчике (🔔) в правом верхнем углу навбара.
        `,
      },
    ],
  },
  {
    module: "Команда и доступ",
    icon: "👥",
    color: "#3C3489",
    bg: "#EEEDFE",
    items: [
      {
        title: "Как пригласить сотрудника",
        content: `
**Настройки → Команда → Пригласить сотрудника**

1. Введите email сотрудника
2. Нажмите «Пригласить»
3. Система создаст уникальную ссылку и скопирует её в буфер обмена
4. Отправьте ссылку сотруднику любым удобным способом

Ссылка действительна **7 дней**.

**Права доступа:**
После регистрации сотрудника нажмите ▼ рядом с его именем в списке команды. Включите нужные разделы через переключатели и нажмите «Сохранить права».

**Блокировка:**
Кнопка 🔒 рядом с сотрудником — временно запрещает вход без удаления данных.
        `,
      },
    ],
  },
];

// ─── Компоненты ───────────────────────────────────────────────────────────────

const BADGE_COLORS = {
  new: { bg: "#EAF3DE", color: "#3B6D11", label: "Новое" },
  fix: { bg: "#FCEBEB", color: "#A32D2D", label: "Исправление" },
  imp: { bg: "#E6F1FB", color: "#185FA5", label: "Улучшение" },
};

function ChangeBadge({ type }) {
  const c = BADGE_COLORS[type] || BADGE_COLORS.imp;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: c.bg, color: c.color, fontWeight: 600, flexShrink: 0 }}>
      {c.label}
    </span>
  );
}

function ArticleModal({ article, onClose }) {
  if (!article) return null;
  // Простой рендер markdown-like контента
  const lines = article.content.trim().split("\n");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>{article.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
            if (line.startsWith("**") && line.endsWith("**")) return (
              <div key={i} style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginTop: 12, marginBottom: 4 }}>{line.replace(/\*\*/g, "")}</div>
            );
            if (line.startsWith("- ")) return (
              <div key={i} style={{ fontSize: 13, color: "#334155", paddingLeft: 16, marginBottom: 3, position: "relative" }}>
                <span style={{ position: "absolute", left: 4 }}>•</span>
                {line.slice(2).replace(/\*\*([^*]+)\*\*/g, "$1")}
              </div>
            );
            if (line.startsWith("**") && line.includes("**") && !line.endsWith("**")) {
              return <div key={i} style={{ fontSize: 13, color: "#334155", marginBottom: 3 }}>{line.replace(/\*\*([^*]+)\*\*/g, "$1")}</div>;
            }
            if (line.startsWith("|")) return null; // skip table lines
            if (/^\d+\./.test(line)) return (
              <div key={i} style={{ fontSize: 13, color: "#334155", paddingLeft: 16, marginBottom: 3 }}>{line}</div>
            );
            return <div key={i} style={{ fontSize: 13, color: "#334155", marginBottom: 4, lineHeight: 1.65 }}>{line.replace(/\*\*([^*]+)\*\*/g, "$1")}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function FeedbackForm() {
  const [type, setType]       = useState("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        type,
        message: message.trim(),
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      setSent(true);
      setMessage("");
    } catch (e) {
      console.error("Feedback error:", e);
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div style={{ background: "#EAF3DE", border: "1px solid #3B6D1133", borderRadius: 12, padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#3B6D11" }}>Спасибо за обратную связь!</div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Мы изучим ваше сообщение и ответим при необходимости.</div>
      <button onClick={() => setSent(false)} style={{ marginTop: 12, fontSize: 12, color: "#64748B", background: "none", border: "1px solid #CBD5E1", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
        Отправить ещё
      </button>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Обратная связь</div>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Сообщите об ошибке или предложите улучшение</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["bug","🐛 Ошибка"],["idea","💡 Идея"],["question","❓ Вопрос"],["other","💬 Другое"]].map(([val, label]) => (
          <button key={val} onClick={() => setType(val)} type="button"
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 20, border: "1px solid", cursor: "pointer", fontWeight: type === val ? 500 : 400, background: type === val ? "#EFF6FF" : "transparent", borderColor: type === val ? "#2563EB" : "#CBD5E1", color: type === val ? "#2563EB" : "#64748B" }}>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={type === "bug" ? "Опишите ошибку: что делали, что произошло, что ожидали..." : type === "idea" ? "Опишите вашу идею..." : "Введите ваш вопрос..."}
        rows={4}
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #CBD5E1", borderRadius: 9, fontSize: 13, color: "#0F172A", background: "#F8FAFC", resize: "vertical", outline: "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
        onFocus={e => { e.target.style.borderColor = "#2563EB"; e.target.style.background = "#fff"; }}
        onBlur={e => { e.target.style.borderColor = "#CBD5E1"; e.target.style.background = "#F8FAFC"; }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>Ответим на {auth.currentUser?.email}</span>
        <button type="button" onClick={handleSend} disabled={!message.trim() || sending}
          style={{ padding: "8px 20px", background: (!message.trim() || sending) ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: (!message.trim() || sending) ? "not-allowed" : "pointer" }}>
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [article, setArticle] = useState(null);
  const [section, setSection] = useState("articles"); // articles | changelog | feedback | shortcuts

  const allArticles = useMemo(() =>
    ARTICLES.flatMap(m => m.items.map(a => ({ ...a, module: m.module, icon: m.icon, bg: m.bg, color: m.color }))),
    []
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }, [search, allArticles]);

  const SHORTCUTS = [
    { keys: ["Cmd", "K"],     desc: "Открыть Command Palette" },
    { keys: ["N"],            desc: "Новая операция / проводка" },
    { keys: ["Esc"],          desc: "Закрыть модал / палитру" },
    { keys: ["Enter"],        desc: "Подтвердить действие в модале" },
    { keys: ["Tab"],          desc: "Переключение между полями" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 860, fontFamily: "'DM Sans', -apple-system, sans-serif", color: "#0F172A" }}>
      {article && <ArticleModal article={article} onClose={() => setArticle(null)} />}

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => navigate(-1)} type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 13, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
            ← Назад
          </button>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>Справка и документация</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Всё что нужно знать о работе в Finlab</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 16 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по статьям…"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 12px 12px 42px", border: "1px solid #CBD5E1", borderRadius: 12, fontSize: 14, background: "#fff", color: "#0F172A", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
          onFocus={e => { e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = "#CBD5E1"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Search results */}
      {search.trim() && (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: "1.5rem", overflow: "hidden" }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Ничего не найдено по запросу «{search}»</div>
          ) : searchResults.map((a, i) => (
            <div key={i}
              onClick={() => { setArticle(a); setSearch(""); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < searchResults.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{a.module}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#94A3B8", fontSize: 12 }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
        {[["articles","📖 Статьи"],["shortcuts","⌨️ Горячие клавиши"],["changelog","🔄 Обновления"],["feedback","💬 Обратная связь"]].map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)} type="button"
            style={{ flex: 1, padding: "7px 12px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: section === key ? 500 : 400, cursor: "pointer", background: section === key ? "#fff" : "transparent", color: section === key ? "#0F172A" : "#64748B", boxShadow: section === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ARTICLES */}
      {section === "articles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {ARTICLES.map(mod => (
            <div key={mod.module}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{mod.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>{mod.module}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {mod.items.map((item, i) => (
                  <div key={i}
                    onClick={() => setArticle({ ...item, module: mod.module, icon: mod.icon })}
                    style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s", borderLeft: `3px solid ${mod.color}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = mod.bg; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{item.content.trim().slice(0, 60).replace(/\*/g, "")}…</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHORTCUTS */}
      {section === "shortcuts" && (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", fontSize: 13, fontWeight: 500 }}>Горячие клавиши Finlab</div>
          {SHORTCUTS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: i < SHORTCUTS.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <span style={{ fontSize: 13, color: "#334155" }}>{s.desc}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.map(k => (
                  <kbd key={k} style={{ padding: "3px 8px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderBottom: "2px solid #CBD5E1", borderRadius: 6, fontSize: 12, fontFamily: "monospace", color: "#334155" }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHANGELOG */}
      {section === "changelog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {CHANGELOG.map((v, vi) => (
            <div key={v.version} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "monospace" }}>v{v.version}</span>
                {v.badge === "latest" && (
                  <span style={{ fontSize: 10, padding: "2px 8px", background: "#EAF3DE", color: "#3B6D11", borderRadius: 20, fontWeight: 600 }}>Последняя</span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#94A3B8" }}>{v.date}</span>
              </div>
              <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                {v.changes.map((c, ci) => (
                  <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <ChangeBadge type={c.type} />
                    <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FEEDBACK */}
      {section === "feedback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <FeedbackForm />
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 24 }}>📧</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Прямой контакт</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>support@finlab.app · Отвечаем в течение 24 часов</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

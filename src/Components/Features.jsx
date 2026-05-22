import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "#6366f1",
    glow: "rgba(99,102,241,0.15)",
    tag: "Интеграции",
    title: "Прямое подключение к банкам",
    desc: "Автоматически подтягиваем выписки из 50+ банков СНГ. Никакого ручного ввода — транзакции разносятся сами.",
    metric: "50+ банков",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "#4ade80",
    glow: "rgba(74,222,128,0.15)",
    tag: "Автоматизация",
    title: "Авторазнос операций с AI",
    desc: "Искусственный интеллект распознаёт контрагентов, статьи и проекты. Точность 96% с первого дня без обучения.",
    metric: "96% точность",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12h8M8 8h5M8 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "#fb923c",
    glow: "rgba(251,146,60,0.15)",
    tag: "Отчётность",
    title: "50+ финансовых отчётов",
    desc: "ДДС, P&L, Баланс, факт/план, ABC-анализ, анализ рентабельности по проектам. Всё по стандартам МСФО.",
    metric: "За 30 секунд",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "#facc15",
    glow: "rgba(250,204,21,0.15)",
    tag: "Планирование",
    title: "Бюджетирование и прогнозы",
    desc: "Платёжный календарь, бюджет ДДС и P&L. AI предсказывает кассовые разрывы за 30 дней до их наступления.",
    metric: "−80% разрывов",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "#f472b6",
    glow: "rgba(244,114,182,0.15)",
    tag: "AI-аналитика",
    title: "Финансовый AI-аналитик",
    desc: "Задавай вопросы голосом или текстом: «Почему упала прибыль в марте?» — и получай ответ с диаграммами за секунды.",
    metric: "GPT-4 внутри",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.15)",
    tag: "Мультиканальность",
    title: "Работа в любом устройстве",
    desc: "Полноценный дашборд на телефоне, планшете и ноутбуке. PWA с офлайн-режимом и push-уведомлениями о рисках.",
    metric: "iOS · Android · Web",
  },
];

function FeatureCard({ f, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "28px 24px",
        cursor: "default",
        overflow: "hidden",
      }}
    >
      {/* Glow on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          position: "absolute", inset: 0, borderRadius: 20,
          background: `radial-gradient(ellipse at 20% 20%, ${f.glow} 0%, transparent 65%)`,
          pointerEvents: "none"
        }}
      />
      {/* Top border accent */}
      <div style={{
        position: "absolute", top: 0, left: 24, right: 24, height: 1,
        background: `linear-gradient(90deg, transparent, ${f.color}60, transparent)`
      }} />

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${f.color}18`, border: `1px solid ${f.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: f.color, marginBottom: 16
      }}>
        {f.icon}
      </div>

      {/* Tag */}
      <span style={{
        fontSize: 11, fontWeight: 600, color: f.color,
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "block", marginBottom: 8
      }}>{f.tag}</span>

      {/* Title */}
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: "#fff",
        marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.25
      }}>{f.title}</h3>

      {/* Description */}
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, marginBottom: 20 }}>
        {f.desc}
      </p>

      {/* Metric badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: `${f.color}12`, border: `1px solid ${f.color}25`,
        borderRadius: 100, padding: "5px 12px"
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: f.color, display: "block" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: f.color }}>{f.metric}</span>
      </div>
    </motion.div>
  );
}

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <div style={{
      background: "#080b14",
      padding: "100px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 800, height: 800,
        background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 65%)",
        pointerEvents: "none"
      }} />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div ref={ref} style={{ textAlign: "center", marginBottom: 64 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 100, padding: "6px 16px", marginBottom: 20
            }}
          >
            <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>Возможности платформы</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 800, color: "#fff",
              letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.1
            }}
          >
            Всё что нужно для финансового контроля
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", maxWidth: 480, margin: "0 auto" }}
          >
            Finlab объединяет десятки инструментов в одну платформу, которой нет аналогов на рынке СНГ
          </motion.p>
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}>
          {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} index={i} />)}
        </div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            marginTop: 56,
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 20,
            padding: "32px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Готов увидеть всё в деле?
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Настраиваем систему под ваш бизнес за 1 рабочий день
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 0 20px rgba(99,102,241,0.25)"
            }}
          >
            Получить демо →
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

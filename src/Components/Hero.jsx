import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const METRICS = [
  { label: "ДДС", value: "+$12 430", sub: "Чистый поток", color: "#4ade80", accent: "#22c55e" },
  { label: "P&L", value: "+$24 200", sub: "Прибыль / мес", color: "#818cf8", accent: "#6366f1" },
  { label: "Баланс", value: "$84 320", sub: "Чистые активы", color: "#fb923c", accent: "#f97316" },
  { label: "Выручка", value: "$142 800", sub: "Текущий квартал", color: "#facc15", accent: "#eab308" },
];

const ROTATORS = [
  { tag: "Движение денег", h: "Видь куда уходит каждый рубль", hl: "в реальном времени", color: "#818cf8" },
  { tag: "Автоматизация", h: "Забудь про Excel и ручной ввод", hl: "навсегда", color: "#4ade80" },
  { tag: "P&L", h: "Прибыль и убытки обновляются", hl: "без бухгалтера", color: "#fb923c" },
  { tag: "AI-аналитика", h: "Искусственный интеллект находит", hl: "скрытые потери", color: "#facc15" },
];

function MiniSparkline({ color }) {
  const pts = [12, 18, 14, 24, 20, 30, 26, 36];
  const max = Math.max(...pts), min = Math.min(...pts);
  const norm = pts.map(p => 1 - (p - min) / (max - min));
  const w = 80, h = 32;
  const d = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${y * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d + ` L ${w} ${h} L 0 ${h} Z`} fill={`url(#sg${color.replace("#","")})`} />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ m, index }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 600 + index * 150); }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "14px 16px",
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 16,
        background: `radial-gradient(ellipse at 70% 20%, ${m.accent}18 0%, transparent 65%)`,
        pointerEvents: "none"
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: m.color,
          background: `${m.accent}20`, borderRadius: 20, padding: "2px 8px"
        }}>↑ LIVE</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: m.color, letterSpacing: "-0.03em", marginBottom: 2 }}>
        {m.value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>{m.sub}</div>
      <MiniSparkline color={m.color} />
    </motion.div>
  );
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    const num = parseInt(value.replace(/\D/g, ""));
    let start = 0;
    const step = num / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setDisplay(value); clearInterval(timer); }
      else setDisplay("+" + Math.floor(start).toLocaleString("ru"));
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

export default function Hero() {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 600], [0, -80]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("in");

  useEffect(() => {
    const id = setInterval(() => {
      setPhase("out");
      setTimeout(() => { setIdx(i => (i + 1) % ROTATORS.length); setPhase("in"); }, 350);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const cur = ROTATORS[idx];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b14",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Animated mesh bg */}
      <motion.div style={{ position: "absolute", inset: 0, y: yBg, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-10%", left: "30%", width: 700, height: 700,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)",
          filter: "blur(40px)"
        }} />
        <div style={{
          position: "absolute", bottom: "5%", right: "-5%", width: 500, height: 500,
          background: "radial-gradient(ellipse, rgba(74,222,128,0.12) 0%, transparent 65%)",
          filter: "blur(60px)"
        }} />
        <div style={{
          position: "absolute", top: "20%", left: "-10%", width: 400, height: 400,
          background: "radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 65%)",
          filter: "blur(50px)"
        }} />
        {/* Grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </motion.div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "row", flexWrap: "wrap",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "100px 48px 60px", gap: 60, maxWidth: 1280, margin: "0 auto", width: "100%"
      }}>

        {/* LEFT */}
        <div style={{ flex: "1 1 480px", maxWidth: 560 }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 100, padding: "6px 14px", marginBottom: 24, backdropFilter: "blur(10px)"
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "block" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Финансы в реальном времени</span>
          </motion.div>

          {/* Rotator tag */}
          <AnimatePresence mode="wait">
            <motion.span
              key={`tag-${idx}`}
              initial={{ opacity: 0 }} animate={{ opacity: phase === "in" ? 1 : 0 }} exit={{ opacity: 0 }}
              style={{
                display: "inline-block", fontSize: 12, fontWeight: 600,
                color: cur.color, background: `${cur.color}18`,
                borderRadius: 6, padding: "3px 10px", marginBottom: 12, letterSpacing: "0.04em"
              }}
            >
              {cur.tag}
            </motion.span>
          </AnimatePresence>

          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={`h-${idx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: phase === "in" ? 1 : 0, y: phase === "in" ? 0 : -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: "clamp(32px, 4vw, 54px)", fontWeight: 800, lineHeight: 1.08,
                color: "#fff", marginBottom: 8, letterSpacing: "-0.03em"
              }}
            >
              {cur.h}{" "}
              <span style={{ color: cur.color }}>{cur.hl}</span>
            </motion.h1>
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.5 }}
            style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}
          >
            Единственная платформа управленческого учёта, которая автоматизирует ДДС, P&L и Баланс — без бухгалтера, без задержек, без Excel.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 40 }}
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                  color: "#fff", border: "none", borderRadius: 14,
                  padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 0 20px rgba(99,102,241,0.3)"
                }}
              >
                Попробовать бесплатно
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </Link>
            <Link to="/demo">
              <motion.button
                whileHover={{ background: "rgba(255,255,255,0.08)" }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
                  padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="currentColor" />
                </svg>
                Смотреть демо
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ display: "flex", gap: 32, flexWrap: "wrap" }}
          >
            {[["500+", "компаний"], ["50+", "отчётов"], ["14 дней", "бесплатно"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{v}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — cards */}
        <div style={{ flex: "1 1 360px", maxWidth: 440 }}>
          {/* Main dashboard card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(20px)",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Финансовый дашборд</span>
              <span style={{
                fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.12)",
                borderRadius: 100, padding: "4px 12px", fontWeight: 600
              }}>● LIVE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {METRICS.map((m, i) => <MetricCard key={m.label} m={m} index={i} />)}
            </div>
          </motion.div>

          {/* AI insight card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 16,
              padding: "14px 18px",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(99,102,241,0.2)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a7 7 0 100 14A7 7 0 009 2zm0 3v4l3 1.5" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600, marginBottom: 4 }}>AI-инсайт</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                Ваши расходы на маркетинг выросли на 34%, но конверсия упала. Рекомендуем пересмотреть каналы.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

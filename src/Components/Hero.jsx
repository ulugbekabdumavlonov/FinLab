// src/Pages/Landing/sections/Hero.jsx
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  TrendingUp, Users, CheckSquare, MessageSquare, Package, 
  LayoutDashboard, Sparkles, Zap, Rocket
} from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

const METRICS = [
  { key: "cashflow", value: "+$12,430", color: "#4ade80", accent: "#22c55e" },
  { key: "profit", value: "+$24,200", color: "#818cf8", accent: "#6366f1" },
  { key: "balance", value: "$84,320", color: "#fb923c", accent: "#f97316" },
  { key: "tasks", value: "24", color: "#facc15", accent: "#eab308" },
];

const ROTATORS = [
  { 
    key: "finance",
    color: "#818cf8",
    icon: <TrendingUp size={20} />
  },
  { 
    key: "hr",
    color: "#4ade80",
    icon: <Users size={20} />
  },
  { 
    key: "tasks_module",
    color: "#fb923c",
    icon: <CheckSquare size={20} />
  },
  { 
    key: "warehouse",
    color: "#facc15",
    icon: <Package size={20} />
  },
  { 
    key: "communication",
    color: "#f472b6",
    icon: <MessageSquare size={20} />
  },
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

function MetricCard({ m, index, theme, t }) {
  const isDark = theme === 'dark';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
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
        <span style={{ 
          fontSize: 11, 
          color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", 
          textTransform: "uppercase", 
          letterSpacing: "0.08em" 
        }}>{t(`metrics.${m.key}.label`)}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: m.color,
          background: `${m.accent}20`, borderRadius: 20, padding: "2px 8px"
        }}>↑ LIVE</span>
      </div>
      <div style={{ 
        fontSize: 22, 
        fontWeight: 700, 
        color: m.color, 
        letterSpacing: "-0.03em", 
        marginBottom: 2 
      }}>
        {m.value}
      </div>
      <div style={{ 
        fontSize: 11, 
        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", 
        marginBottom: 10 
      }}>{t(`metrics.${m.key}.sub`)}</div>
      <MiniSparkline color={m.color} />
    </motion.div>
  );
}

export default function Hero() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 600], [0, -80]);
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stars, setStars] = useState([]);

  // ─── ГЕНЕРАЦИЯ ЗВЁЗД ───
  useEffect(() => {
    const generatedStars = [];
    for (let i = 0; i < 200; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
      });
    }
    setStars(generatedStars);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % ROTATORS.length);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }, 400);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const cur = ROTATORS[idx];
  const curTag = t(`hero.rotators.${cur.key}.tag`);
  const curTitle = t(`hero.rotators.${cur.key}.title`);
  const curHighlight = t(`hero.rotators.${cur.key}.highlight`);

  return (
    <div style={{
      minHeight: "100vh",
      background: isDark ? "#06080f" : "#f0f2f5",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "background 0.3s ease",
    }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes floatRotate {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .pulse-glow {
          animation: pulseGlow 4s ease-in-out infinite;
        }
        .float-rotate {
          animation: floatRotate 8s ease-in-out infinite;
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 99px; }
      `}</style>

      {/* ─── ФОН СО ЗВЁЗДАМИ ─── */}
      {isDark && (
        <motion.div style={{ position: "absolute", inset: 0, y: yBg, pointerEvents: "none" }}>
          {/* Звёзды */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="twinkle"
              style={{
                position: "absolute",
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                borderRadius: "50%",
                background: "#fff",
                opacity: star.opacity,
                boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.1)`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}

          {/* Градиентные свечения */}
          <div style={{
            position: "absolute", top: "-15%", left: "20%", width: 800, height: 800,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%)",
            filter: "blur(60px)"
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", right: "20%", width: 600, height: 600,
            background: "radial-gradient(ellipse, rgba(74,222,128,0.08) 0%, transparent 65%)",
            filter: "blur(80px)"
          }} />
          <div style={{
            position: "absolute", top: "40%", left: "-10%", width: 500, height: 500,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 65%)",
            filter: "blur(70px)"
          }} />

          {/* Тонкая сетка */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px, 60px 60px",
            opacity: 0.3,
          }} />
        </motion.div>
      )}

      {/* ─── ОРБИТАЛЬНЫЕ КОЛЬЦА ─── */}
      {isDark && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 600,
              height: 600,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.03)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                top: -3,
                left: "50%",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#6366f1",
                boxShadow: "0 0 25px rgba(99,102,241,0.6)",
              }}
            />
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 400,
              height: 400,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "1px solid rgba(139,92,246,0.02)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                bottom: -3,
                left: "50%",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#8b5cf6",
                boxShadow: "0 0 15px rgba(139,92,246,0.4)",
              }}
            />
          </motion.div>
        </>
      )}

      {/* ─── КОНТЕНТ ─── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "row", flexWrap: "wrap",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "100px 48px 60px", gap: 60, maxWidth: 1280, margin: "0 auto", width: "100%"
      }}>

        {/* LEFT - расширенный */}
        <div style={{ flex: "1 1 540px", maxWidth: 640 }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 100,
              padding: "6px 14px",
              marginBottom: 24,
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 15px rgba(74,222,128,0.3)",
                display: "block",
              }}
            />
            <span style={{ 
              fontSize: 12, 
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", 
              fontWeight: 500 
            }}>
              {t("hero.badge")}
            </span>
          </motion.div>

          {/* Rotator tag */}
          <div style={{ marginBottom: 20, height: 32 }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={`tag-${idx}`}
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { 
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 10, 
                  scale: 0.9,
                  transition: { 
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: cur.color,
                  background: `${cur.color}12`,
                  borderRadius: 8,
                  padding: "6px 16px",
                  border: `1px solid ${cur.color}20`,
                  backdropFilter: "blur(10px)",
                }}
              >
                {cur.icon}
                {curTag}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Headline - супер плавная */}
          <div style={{ position: "relative", minHeight: 120 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${idx}`}
                initial={{ 
                  opacity: 0, 
                  y: 20,
                  scale: 0.98,
                  filter: "blur(4px)"
                }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { 
                    duration: 0.7,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                    opacity: { duration: 0.5, delay: 0.1 }
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -20,
                  scale: 0.98,
                  filter: "blur(4px)",
                  transition: { 
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <h1 style={{
                  fontSize: "clamp(28px, 3.8vw, 44px)", 
                  fontWeight: 800, 
                  lineHeight: 1.15,
                  color: isDark ? "#fff" : "#111827",
                  letterSpacing: "-0.03em",
                  textShadow: isDark ? "0 0 40px rgba(99,102,241,0.05)" : "none",
                  margin: 0,
                }}>
                  {curTitle}
                  <br />
                  <span style={{ 
                    color: cur.color,
                    textShadow: isDark ? `0 0 30px ${cur.color}20, 0 0 60px ${cur.color}10` : "none",
                  }}>
                    {curHighlight}
                  </span>
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Текст */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ 
              fontSize: 15, 
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", 
              lineHeight: 1.7, 
              marginTop: 50,
              marginBottom: 36, 
              maxWidth: 540,
            }}
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 40 }}
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(99,102,241,0.4)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "#fff", border: "none", borderRadius: 14,
                  padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 0 30px rgba(99,102,241,0.2)",
                  position: "relative", overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute", inset: 0, width: 80,
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent)",
                    transform: "skewX(-25deg)",
                  }}
                />
                <span style={{ position: "relative", zIndex: 2 }}>{t("hero.cta")}</span>
                <Rocket size={16} style={{ position: "relative", zIndex: 2 }} />
              </motion.button>
            </Link>
            <Link to="/demo">
              <motion.button
                whileHover={{ 
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", 
                  scale: 1.02 
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 14,
                  padding: "14px 24px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  backdropFilter: "blur(12px)",
                  transition: "all 0.3s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="currentColor" />
                </svg>
                {t("hero.demo")}
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{ display: "flex", gap: 40, flexWrap: "wrap" }}
          >
            {[
              { key: "allModules" },
              { key: "reports" },
              { key: "freeDays" },
              { key: "support" }
            ].map((item) => (
              <motion.div
                key={item.key}
                whileHover={{ y: -2 }}
                style={{ transition: "all 0.3s" }}
              >
                <div style={{ 
                  fontSize: 20, 
                  fontWeight: 600, 
                  color: isDark ? "#fff" : "#111827", 
                  letterSpacing: "-0.02em" 
                }}>
                  {t(`hero.stats.${item.key}.value`)}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" 
                }}>{t(`hero.stats.${item.key}.label`)}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: "1 1 340px", maxWidth: 420 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(20px)",
              marginBottom: 12,
              position: "relative",
              overflow: "hidden",
              boxShadow: isDark 
                ? "0 0 40px rgba(99,102,241,0.03)" 
                : "0 0 40px rgba(0,0,0,0.03)",
            }}
          >
            {isDark && (
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.3), transparent)",
                  filter: "blur(2px)",
                }}
              />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "relative", zIndex: 2 }}>
              <span style={{ 
                fontSize: 13, 
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", 
                fontWeight: 600, 
                letterSpacing: "0.06em", 
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <LayoutDashboard size={16} />
                {t("hero.dashboardTitle")}
              </span>
              <span style={{
                fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.10)",
                borderRadius: 100, padding: "4px 12px", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
                border: "1px solid rgba(74,222,128,0.08)",
              }}>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 15px #4ade80", display: "block" }} />
                LIVE
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, position: "relative", zIndex: 2 }}>
              {METRICS.map((m, i) => <MetricCard key={m.key} m={m} index={i} theme={theme} t={t} />)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            style={{
              background: isDark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.04)",
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}`,
              borderRadius: 16,
              padding: "14px 18px",
              display: "flex", gap: 12, alignItems: "flex-start",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isDark && (
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  position: "absolute", top: -20, right: -20,
                  width: 80, height: 80, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
            )}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'}`,
            }}>
              <Zap size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ 
                fontSize: 12, 
                color: "#818cf8", 
                fontWeight: 600, 
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 10px #818cf8", display: "block" }} />
                {t("hero.aiInsight")}
              </div>
              <div style={{ 
                fontSize: 13, 
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", 
                lineHeight: 1.5 
              }}>
                {t("hero.aiMessage")}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

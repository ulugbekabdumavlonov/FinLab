// src/Pages/Landing/sections/Features.jsx
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  TrendingUp, Users, CheckSquare, Package, MessageSquare,
  LayoutDashboard, Wallet, ShoppingBag, Calendar, Clock,
  BarChart3, Building2, Briefcase, Target, Rocket,
  Zap, Sparkles, Crown, Shield, Globe, Server
} from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

const FEATURES_KEYS = [
  { key: "finance", icon: <TrendingUp size={24} />, color: "#818cf8", glow: "rgba(99,102,241,0.12)" },
  { key: "hr", icon: <Users size={24} />, color: "#4ade80", glow: "rgba(74,222,128,0.12)" },
  { key: "tasks", icon: <CheckSquare size={24} />, color: "#fb923c", glow: "rgba(251,146,60,0.12)" },
  { key: "warehouse", icon: <Package size={24} />, color: "#facc15", glow: "rgba(250,204,21,0.12)" },
  { key: "communication", icon: <MessageSquare size={24} />, color: "#f472b6", glow: "rgba(244,114,182,0.12)" },
  { key: "dashboard", icon: <LayoutDashboard size={24} />, color: "#38bdf8", glow: "rgba(56,189,248,0.12)" },
];

function FeatureCard({ fKey, index, theme, t }) {
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [isHovered, setIsHovered] = useState(false);

  // Получаем данные из переводов
  const f = {
    ...FEATURES_KEYS.find(item => item.key === fKey),
    tag: t(`features.list.${fKey}.tag`),
    title: t(`features.list.${fKey}.title`),
    desc: t(`features.list.${fKey}.desc`),
    metric: t(`features.list.${fKey}.metric`),
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        background: isDark 
          ? "rgba(255,255,255,0.02)" 
          : "rgba(255,255,255,0.7)",
        border: isHovered 
          ? `1px solid ${f.color}30` 
          : `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 20,
        padding: "28px 24px",
        cursor: "default",
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isHovered 
          ? (isDark 
              ? `0 8px 40px rgba(0,0,0,0.2), 0 0 60px ${f.color}05` 
              : `0 8px 40px rgba(0,0,0,0.05), 0 0 60px ${f.color}05`)
          : (isDark ? "none" : "0 2px 10px rgba(0,0,0,0.03)"),
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background: `radial-gradient(ellipse at 30% 20%, ${f.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {isDark && (
        <motion.div
          animate={{
            x: isHovered ? ["-100%", "100%"] : "0%",
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0, ease: "linear" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      <motion.div
        animate={{
          rotate: isHovered ? 360 : 0,
        }}
        transition={{ duration: 3, repeat: isHovered ? Infinity : 0, ease: "linear" }}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: f.color,
          boxShadow: `0 0 15px ${f.color}`,
          opacity: isHovered ? 0.6 : 0.15,
          transition: "opacity 0.4s",
        }}
      />

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `${f.color}12`,
          border: isHovered ? `1px solid ${f.color}40` : `1px solid ${f.color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: f.color,
          marginBottom: 16,
          transition: "all 0.4s",
          boxShadow: isHovered ? `0 0 30px ${f.color}15` : "none",
        }}
      >
        <motion.div
          animate={{
            scale: isHovered ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0 }}
        >
          {f.icon}
        </motion.div>
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: f.color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          marginBottom: 8,
        }}
      >
        {f.tag}
      </span>

      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: isDark ? "#fff" : "#111827",
          marginBottom: 10,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {f.title}
      </h3>

      <p
        style={{
          fontSize: 14,
          color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)",
          lineHeight: 1.65,
          marginBottom: 20,
        }}
      >
        {f.desc}
      </p>

      <motion.div
        animate={{
          scale: isHovered ? [1, 1.02, 1] : 1,
        }}
        transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${f.color}10`,
          border: `1px solid ${f.color}20`,
          borderRadius: 100,
          padding: "5px 12px",
          transition: "all 0.3s",
        }}
      >
        <motion.span
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: f.color,
            display: "block",
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: f.color,
          }}
        >
          {f.metric}
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Features() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [stars, setStars] = useState([]);

  // ─── ГЕНЕРАЦИЯ ЗВЁЗД ───
  useEffect(() => {
    const generatedStars = [];
    for (let i = 0; i < 150; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
      });
    }
    setStars(generatedStars);
  }, []);

  return (
    <div
      style={{
        background: isDark ? "#06080f" : "#f0f2f5",
        padding: "100px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}
    >
      {/* ─── ЗВЁЗДНЫЙ ФОН ─── */}
      {isDark && (
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}>
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
                boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.08)`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 800,
              height: 800,
              background: "radial-gradient(ellipse, rgba(99,102,241,0.04) 0%, transparent 65%)",
              filter: "blur(80px)",
            }}
          />

          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px, 60px 60px",
            opacity: 0.5,
          }} />
        </div>
      )}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {/* ─── ЗАГОЛОВОК ─── */}
        <div ref={ref} style={{ textAlign: "center", marginBottom: 64 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)'}`,
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 20,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#818cf8",
                display: "block",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "#818cf8",
                fontWeight: 600,
              }}
            >
              {t("features.badge")}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontSize: "clamp(30px, 3.5vw, 48px)",
              fontWeight: 800,
              color: isDark ? "#fff" : "#111827",
              letterSpacing: "-0.03em",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            {t("features.title")}
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #a78bfa, #6366f1)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradientMove 4s ease infinite",
              }}
            >
              {t("features.titleHighlight")}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 17,
              color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            {t("features.subtitle")}
          </motion.p>
        </div>

        {/* ─── СЕТКА КАРТОЧЕК ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {FEATURES_KEYS.map((f, i) => (
            <FeatureCard key={f.key} fKey={f.key} index={i} theme={theme} t={t} />
          ))}
        </div>

        {/* ─── CTA БЛОК ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            marginTop: 56,
            background: isDark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)",
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)'}`,
            borderRadius: 20,
            padding: "32px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isDark && (
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.08, 0.15, 0.08],
              }}
              transition={{ duration: 6, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.05), transparent 70%)",
                filter: "blur(40px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: isDark ? "#fff" : "#111827",
                marginBottom: 6,
              }}
            >
              {t("features.ctaTitle")}
            </div>
            <div
              style={{
                fontSize: 14,
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
              }}
            >
              {t("features.ctaSubtitle")}
            </div>
          </div>

          <Link to="/register">
            <motion.button
              whileHover={{
                scale: 1.02,
                boxShadow: "0 0 30px rgba(99,102,241,0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              style={{
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(99,102,241,0.15)",
                zIndex: 2,
              }}
            >
              <motion.div
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 60,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
                  transform: "skewX(-25deg)",
                }}
              />
              <span style={{ position: "relative", zIndex: 2 }}>
                {t("features.ctaButton")} →
              </span>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

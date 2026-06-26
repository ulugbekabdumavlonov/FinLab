// src/Pages/Landing/sections/Logos.jsx
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

const LOGOS_KEYS = [
  { key: "carrot", name: "Carrot", descKey: "edtech" },
  { key: "skillbox", name: "Skillbox", descKey: "online_education" },
  { key: "mpstats", name: "mpstats", descKey: "marketplace_analytics" },
  { key: "rehapa", name: "Rehapa", descKey: "medicine" },
  { key: "uzum", name: "Uzum", descKey: "ecommerce" },
  { key: "mytaxi", name: "MyTaxi", descKey: "transport" },
];

const STATS_KEYS = [
  { key: "companies", value: 500, suffix: "+", color: "#6366f1" },
  { key: "retention", value: 98, suffix: "%", color: "#4ade80" },
  { key: "setup", value: 12, suffix: "ч", color: "#fb923c" },
  { key: "rating", value: 4.9, suffix: "★", color: "#facc15", decimal: true },
];

const TESTIMONIALS_KEYS = [
  { key: "alexey", avatar: "АК", color: "#6366f1" },
  { key: "madina", avatar: "МР", color: "#4ade80" },
  { key: "timur", avatar: "ТС", color: "#fb923c" },
];

function CountUp({ value, suffix, decimal, color }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 50;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const progress = i / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;
      setDisplay(decimal ? current.toFixed(1) : Math.floor(current).toString());
      if (i >= steps) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [inView, value, decimal]);

  return (
    <span ref={ref} style={{ color }}>
      {display}{suffix}
    </span>
  );
}

export default function Logos() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [stars, setStars] = useState([]);

  // Получаем переведённые данные
  const LOGOS = LOGOS_KEYS.map(item => ({
    ...item,
    desc: t(`logos.logos.${item.descKey}`)
  }));

  const STATS = STATS_KEYS.map(item => ({
    ...item,
    label: t(`logos.stats.${item.key}.label`)
  }));

  const TESTIMONIALS = TESTIMONIALS_KEYS.map(item => ({
    ...item,
    text: t(`logos.testimonials.${item.key}.text`),
    name: t(`logos.testimonials.${item.key}.name`),
    role: t(`logos.testimonials.${item.key}.role`),
  }));

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
    <div style={{
      background: isDark ? "#06080f" : "#f0f2f5",
      padding: "80px 24px",
      overflow: "hidden",
      position: "relative",
      transition: "background 0.3s ease",
    }}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>

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

          <div style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 400,
            height: 400,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.04) 0%, transparent 70%)",
            filter: "blur(60px)",
          }} />
          <div style={{
            position: "absolute",
            bottom: "20%",
            right: "30%",
            width: 400,
            height: 400,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.03) 0%, transparent 70%)",
            filter: "blur(60px)",
          }} />

          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px, 60px 60px",
            opacity: 0.3,
          }} />
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* ─── ЗАГОЛОВОК ─── */}
        <div ref={ref} style={{ textAlign: "center", marginBottom: 56 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)'}`,
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 16,
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
            <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>
              {t("logos.badge")}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: "clamp(26px, 3vw, 40px)",
              fontWeight: 800,
              color: isDark ? "#fff" : "#111827",
              letterSpacing: "-0.03em",
              marginBottom: 8,
            }}
          >
            {t("logos.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 16,
              color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
            }}
          >
            {t("logos.subtitle")}
          </motion.p>
        </div>

        {/* ─── ЛОГОТИПЫ С БЕСКОНЕЧНЫМ СКРОЛЛОМ ─── */}
        <div style={{ 
          position: "relative", 
          marginBottom: 64, 
          overflow: "hidden",
          padding: "4px 0",
        }}>
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: `linear-gradient(90deg, ${isDark ? '#06080f' : '#f0f2f5'}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: `linear-gradient(-90deg, ${isDark ? '#06080f' : '#f0f2f5'}, transparent)`,
            zIndex: 2,
            pointerEvents: "none",
          }} />

          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              duration: 25, 
              repeat: Infinity, 
              ease: "linear",
              repeatType: "loop",
            }}
            style={{ display: "flex", gap: 16, width: "max-content" }}
          >
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <motion.div
                key={i}
                whileHover={{
                  y: -6,
                  borderColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
                  boxShadow: isDark 
                    ? "0 8px 40px rgba(0,0,0,0.2), 0 0 60px rgba(99,102,241,0.05)"
                    : "0 8px 40px rgba(0,0,0,0.05), 0 0 60px rgba(99,102,241,0.03)",
                }}
                style={{
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 14,
                  padding: "16px 28px",
                  flexShrink: 0,
                  minWidth: 160,
                  transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isDark && (
                  <motion.div
                    animate={{
                      opacity: [0.04, 0.08, 0.04],
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${["#6366f1", "#4ade80", "#fb923c"][i % 3]}10, transparent 70%)`,
                      filter: "blur(20px)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <div style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.7)",
                  marginBottom: 4,
                  letterSpacing: "-0.02em",
                  position: "relative",
                  zIndex: 2,
                }}>
                  {logo.name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)",
                  position: "relative",
                  zIndex: 2,
                }}>
                  {logo.desc}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ─── СТАТИСТИКА ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 64,
        }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                delay: i * 0.15, 
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{
                y: -4,
                borderColor: `${s.color}30`,
                boxShadow: `0 8px 30px ${s.color}08`,
              }}
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 16,
                padding: "24px 20px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {isDark && (
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.04, 0.08, 0.04],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${s.color}08, transparent 70%)`,
                    filter: "blur(30px)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <div style={{
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: 6,
                position: "relative",
                zIndex: 2,
              }}>
                <CountUp value={s.value} suffix={s.suffix} color={s.color} decimal={s.decimal} />
              </div>
              <div style={{
                fontSize: 13,
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)",
                position: "relative",
                zIndex: 2,
              }}>
                {s.label}
              </div>
              {isDark && (
                <motion.div
                  animate={{
                    width: [0, "100%", 0],
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${s.color}30, transparent)`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* ─── ОТЗЫВЫ ─── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ 
                delay: i * 0.15, 
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{
                y: -4,
                borderColor: `${t.color}30`,
                boxShadow: `0 8px 30px ${t.color}08`,
              }}
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 20,
                padding: "24px",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {isDark && (
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.02, 0.05, 0.02],
                  }}
                  transition={{ duration: 5, repeat: Infinity, delay: i * 0.5 }}
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${t.color}08, transparent 70%)`,
                    filter: "blur(40px)",
                    pointerEvents: "none",
                  }}
                />
              )}

              <div style={{ display: "flex", gap: 3, marginBottom: 14, position: "relative", zIndex: 2 }}>
                {[...Array(5)].map((_, j) => (
                  <motion.svg
                    key={j}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: 0.3 + j * 0.08,
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="#facc15"
                  >
                    <path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.1 3.4 12l.7-4L1.2 5.2l4-.6L7 1z" />
                  </motion.svg>
                ))}
              </div>

              <p style={{
                fontSize: 14,
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                lineHeight: 1.7,
                marginBottom: 20,
                fontStyle: "italic",
                position: "relative",
                zIndex: 2,
              }}>
                «{t.text}»
              </p>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                position: "relative",
                zIndex: 2,
              }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `${t.color}20`,
                    border: `1px solid ${t.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: t.color,
                    flexShrink: 0,
                    transition: "transform 0.2s",
                  }}
                >
                  {t.avatar}
                </motion.div>
                <div>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: isDark ? "#fff" : "#111827" 
                  }}>{t.name}</div>
                  <div style={{ 
                    fontSize: 12, 
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" 
                  }}>{t.role}</div>
                </div>
              </div>

              {isDark && (
                <motion.div
                  animate={{
                    x: ["-100%", "100%"],
                    opacity: [0, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "linear",
                  }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${t.color}20, transparent)`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

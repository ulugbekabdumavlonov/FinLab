// src/Pages/Landing/sections/Footer.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  TrendingUp, Users, CheckSquare, Package, MessageSquare,
  LayoutDashboard, Settings, HelpCircle, Mail,
  Shield, Zap, Sparkles, Globe, Server, Database,
  Cloud, Lock, Key, Rocket, Target, Award
} from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

const FOOTER_LINKS_KEYS = {
  products: [
    { key: "finance", icon: <TrendingUp size={14} /> },
    { key: "hr", icon: <Users size={14} /> },
    { key: "tasks", icon: <CheckSquare size={14} /> },
    { key: "warehouse", icon: <Package size={14} /> },
    { key: "communication", icon: <MessageSquare size={14} /> },
  ],
  features: [
    { key: "ai_analytics", icon: <Sparkles size={14} /> },
    { key: "automation", icon: <Zap size={14} /> },
    { key: "integrations", icon: <Globe size={14} /> },
    { key: "api_docs", icon: <Server size={14} /> },
    { key: "mobile_app", icon: <Rocket size={14} /> },
  ],
  company: [
    { key: "about", icon: <LayoutDashboard size={14} /> },
    { key: "security", icon: <Shield size={14} /> },
    { key: "partners", icon: <Target size={14} /> },
    { key: "career", icon: <Award size={14} /> },
    { key: "support", icon: <HelpCircle size={14} /> },
  ],
};

const COLORS = ["#6366f1", "#4ade80", "#fb923c"];

export default function Footer() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  // Получаем переведённые заголовки и пункты
  const FOOTER_TITLES = {
    products: t("footer.titles.products"),
    features: t("footer.titles.features"),
    company: t("footer.titles.company"),
  };

  const getFooterItems = (key) => {
    return FOOTER_LINKS_KEYS[key].map(item => ({
      ...item,
      label: t(`footer.items.${key}.${item.key}`)
    }));
  };

  const bottomItems = [
    { key: "privacy", label: t("footer.bottom.privacy") },
    { key: "terms", label: t("footer.bottom.terms") },
    { key: "email", label: t("footer.bottom.email") },
  ];

  return (
    <footer
      style={{
        position: "relative",
        overflow: "hidden",
        background: isDark ? "#06080f" : "#e8eaf0",
        borderTop: "none",
        transition: "background 0.3s ease",
      }}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>

      {/* ─── ФОН ─── */}
      {isDark && (
        <>
          <div
            style={{
              position: "absolute",
              top: -200,
              left: "50%",
              transform: "translateX(-50%)",
              width: 700,
              height: 700,
              background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
              filter: "blur(140px)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: -100,
              right: -100,
              width: 400,
              height: 400,
              background: "radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)",
              filter: "blur(100px)",
              pointerEvents: "none",
            }}
          />

          {/* ─── ЗВЁЗДЫ ─── */}
          {Array.from({ length: 40 }).map((_, i) => {
            const size = Math.random() * 1.5 + 0.5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 3 + 2;
            const delay = Math.random() * 5;
            return (
              <motion.div
                key={i}
                className="twinkle"
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: "#fff",
                  opacity: 0.3,
                  boxShadow: `0 0 ${size * 2}px rgba(255,255,255,0.05)`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* ─── ШУМ ─── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.02,
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.3) 0.7px, transparent 0.7px)",
              backgroundSize: "14px 14px",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 24px 40px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* ─── TOP CTA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            marginBottom: 56,
            background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 24,
            padding: "32px 36px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            backdropFilter: "blur(20px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isDark && (
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.05, 0.1, 0.05],
              }}
              transition={{ duration: 6, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.04), transparent 70%)",
                filter: "blur(50px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 2, maxWidth: 560 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#4ade80",
                  display: "block",
                  boxShadow: "0 0 10px rgba(74,222,128,0.2)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)",
                  fontWeight: 600,
                }}
              >
                {t("footer.cta.badge")}
              </span>
            </div>

            <h2
              style={{
                fontSize: "clamp(24px,3.5vw,40px)",
                lineHeight: 1.05,
                fontWeight: 800,
                color: isDark ? "#fff" : "#111827",
                letterSpacing: "-0.04em",
                marginBottom: 12,
              }}
            >
              {t("footer.cta.title")}
              <br />
              <span style={{
                background: "linear-gradient(135deg, #818cf8, #a78bfa)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}>
                {t("footer.cta.titleHighlight")}
              </span>
            </h2>

            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                maxWidth: 480,
              }}
            >
              {t("footer.cta.description")}
            </p>
          </div>

          <Link to="/register">
            <motion.button
              whileHover={{
                scale: 1.02,
                y: -2,
                boxShadow: "0 15px 40px rgba(99,102,241,0.3)",
              }}
              whileTap={{ scale: 0.98 }}
              style={{
                position: "relative",
                overflow: "hidden",
                border: "none",
                cursor: "pointer",
                padding: "14px 24px",
                borderRadius: 14,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: "0 8px 30px rgba(99,102,241,0.2)",
                whiteSpace: "nowrap",
                zIndex: 2,
              }}
            >
              <motion.div
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 50,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
                  transform: "skewX(-25deg)",
                }}
              />
              <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
                {t("footer.cta.button")}
                <Rocket size={16} />
              </span>
            </motion.button>
          </Link>
        </motion.div>

        {/* ─── ОСНОВНАЯ СЕТКА ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 20,
              padding: 20,
              backdropFilter: "blur(20px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isDark && (
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.03, 0.06, 0.03],
                }}
                transition={{ duration: 6, repeat: Infinity }}
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(99,102,241,0.04), transparent 70%)",
                  filter: "blur(30px)",
                  pointerEvents: "none",
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#fff",
                  fontSize: 14,
                  boxShadow: "0 8px 24px rgba(99,102,241,0.2)",
                  position: "relative",
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 10,
                    background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <span style={{ position: "relative", zIndex: 2 }}>F</span>
              </div>

              <div>
                <div
                  style={{
                    color: isDark ? "#fff" : "#111827",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "-0.02em",
                  }}
                >
                  FinLab
                  <span
                    style={{
                      fontSize: 8,
                      marginLeft: 4,
                      padding: "1px 6px",
                      borderRadius: 8,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      color: "#818cf8",
                      fontWeight: 600,
                    }}
                  >
                    OS
                  </span>
                </div>

                <div
                  style={{
                    color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
                    fontSize: 10,
                  }}
                >
                  {t("footer.brand.subtitle")}
                </div>
              </div>
            </div>

            <p
              style={{
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                fontSize: 13,
                lineHeight: 1.7,
                position: "relative",
                zIndex: 2,
              }}
            >
              {t("footer.brand.description")}
            </p>
          </motion.div>

          {/* Footer columns */}
          {Object.entries(FOOTER_LINKS_KEYS).map(([key, items], index) => {
            const color = COLORS[index % COLORS.length];
            const title = FOOTER_TITLES[key];
            const translatedItems = items.map(item => ({
              ...item,
              label: t(`footer.items.${key}.${item.key}`)
            }));

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                style={{
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 20,
                  padding: 20,
                  backdropFilter: "blur(20px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isDark && (
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.02, 0.04, 0.02],
                    }}
                    transition={{ duration: 6, repeat: Infinity, delay: index * 0.5 }}
                    style={{
                      position: "absolute",
                      bottom: -30,
                      right: -30,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${color}08, transparent 70%)`,
                      filter: "blur(30px)",
                      pointerEvents: "none",
                    }}
                  />
                )}

                <h3
                  style={{
                    color: isDark ? "#fff" : "#111827",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 14,
                    letterSpacing: "-0.01em",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {title}
                  {isDark && (
                    <motion.span
                      animate={{
                        width: [0, 16, 0],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      style={{
                        display: "inline-block",
                        marginLeft: 6,
                        height: 1.5,
                        background: `linear-gradient(90deg, ${color}, transparent)`,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </h3>

                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {translatedItems.map((item, i) => (
                    <motion.li
                      key={item.key}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                      whileHover={{ x: 4 }}
                      style={{
                        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
                      }}
                    >
                      <span style={{ color: color, opacity: 0.5 }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* ─── BOTTOM BAR ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          style={{
            paddingTop: 20,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            position: "relative",
          }}
        >
          {isDark && (
            <motion.div
              animate={{
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                position: "absolute",
                top: -1,
                left: "20%",
                right: "20%",
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)",
                filter: "blur(2px)",
                pointerEvents: "none",
              }}
            />
          )}

          <div
            style={{
              color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#4ade80",
                display: "block",
                boxShadow: "0 0 8px rgba(74,222,128,0.15)",
              }}
            />
            {t("footer.bottom.copyright")}
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {bottomItems.map((item, i) => (
              <motion.div
                key={item.key}
                whileHover={{ y: -1 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                style={{
                  color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
                }}
              >
                {item.label}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

// src/Pages/Landing/sections/Header.jsx
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Menu, X, ChevronRight, Sparkles, Rocket, Users,
  TrendingUp, Package, MessageSquare, CheckSquare,
  ArrowRight, Sun, Moon, ChevronDown,
} from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

// ─── КОНСТАНТЫ ──────────────────────────────────────────────────────────────
const NAV_KEYS = [
  { key: "features", path: "/features", icon: <Sparkles size={16} /> },
  { key: "pricing",  path: "/pricing",  icon: <Rocket size={16} />   },
  { key: "partners", path: "/partners", icon: <Users size={16} />    },
];

const ECO_ICONS = [
  { icon: <TrendingUp size={14} />,   key: "finance"   },
  { icon: <Users size={14} />,        key: "hr"        },
  { icon: <CheckSquare size={14} />,  key: "tasks"     },
  { icon: <Package size={14} />,      key: "warehouse" },
  { icon: <MessageSquare size={14} />,key: "chat"      },
];

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
};

// ─── LANGUAGE DROPDOWN ──────────────────────────────────────────────────────
function LanguageDropdown({ theme }) {
  const { lang, setLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { 
      if (ref.current && !ref.current.contains(e.target)) setOpen(false); 
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isDark = theme === "dark";
  const currentLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(v => !v)}
        style={{
          height: 40,
          padding: "0 12px",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
          color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.03em",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{currentLang.flag}</span>
        <span>{currentLang.short}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          style={{ display: "flex", alignItems: "center", opacity: 0.5 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 180,
              borderRadius: 16,
              overflow: "hidden",
              background: isDark ? "rgba(6,8,15,0.97)" : "rgba(255,255,255,0.98)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
              boxShadow: isDark
                ? "0 16px 48px rgba(0,0,0,0.6)"
                : "0 16px 48px rgba(0,0,0,0.12)",
              zIndex: 9999, // ⬅️ Исправлено: повышен z-index
              backdropFilter: "blur(24px)",
            }}
          >
            <div style={{
              padding: "10px 14px 8px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
            }}>
              Язык / Language
            </div>

            <div style={{ padding: "6px" }}>
              {languages.map(l => {
                const isActive = l.code === lang;
                return (
                  <motion.button
                    key={l.code}
                    whileHover={{ x: 2 }}
                    onClick={() => { setLang(l.code); setOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: "none",
                      background: isActive
                        ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
                        : "transparent",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = isDark
                        ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{l.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                        color: isActive
                          ? "#818cf8"
                          : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"),
                      }}>
                        {l.label}
                      </div>
                    </div>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#818cf8",
                          boxShadow: "0 0 8px rgba(129,140,248,0.6)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN HEADER ────────────────────────────────────────────────────────────
export default function Header() {
  const { pathname } = useLocation();
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme }  = useTheme();
  const { t }                   = useLanguage();

  const isDark = theme === "dark";

  const glowVariants = useMemo(() => ({
    animate: { scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] },
    transition: { duration: 6, repeat: Infinity },
  }), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const NAV = NAV_KEYS.map(item => ({
    ...item,
    name:        t(`nav.${item.key}`),
    description: t(`navDesc.${item.key}`),
  }));

  const ECO_SYSTEM = ECO_ICONS.map(item => ({
    ...item,
    label: t(`features.${item.key}`),
  }));

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed", top: 0, width: "100%", zIndex: 100,
          padding: scrolled ? "12px 20px" : "16px 20px",
          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "12px 20px",
          borderRadius: 24, display: "flex", alignItems: "center",
          justifyContent: "space-between",
          background: scrolled
            ? (isDark ? "rgba(6,8,15,0.92)" : "rgba(255,255,255,0.92)")
            : (isDark ? "rgba(6,8,15,0.65)" : "rgba(255,255,255,0.65)"),
          border: `1px solid ${scrolled
            ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")
            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}`,
          backdropFilter: "blur(24px)",
          boxShadow: scrolled
            ? (isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)")
            : (isDark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.04)"),
          position: "relative",
          overflow: "visible", // ⬅️ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: было hidden, стало visible
        }}>

          {/* ─── СВЕЧЕНИЯ ─── */}
          <motion.div animate={glowVariants.animate} transition={glowVariants.transition}
            style={{
              position: "absolute", top: -120, right: -120, width: 320, height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)",
              filter: "blur(80px)", pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.12, 0.05] }}
            transition={{ duration: 8, repeat: Infinity }}
            style={{
              position: "absolute", bottom: -100, left: -100, width: 280, height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)",
              filter: "blur(60px)", pointerEvents: "none",
            }}
          />
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.3),rgba(139,92,246,0.3),transparent)",
              filter: "blur(1px)", pointerEvents: "none",
            }}
          />

          {/* ─── LOGO ─── */}
          <Link to="/">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 900, fontSize: 18,
                boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
                position: "relative", flexShrink: 0,
              }}>
                <motion.span
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: 14,
                    background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <span style={{ position: "relative", zIndex: 2 }}>F</span>
              </div>
              <div>
                <div style={{
                  color: isDark ? "#fff" : "#111827", fontWeight: 800, fontSize: 20,
                  letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 8,
                }}>
                  FinLab
                  <span style={{
                    fontSize: 9, padding: "2px 10px", borderRadius: 20,
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.25)",
                    color: "#818cf8", fontWeight: 700, letterSpacing: "0.05em",
                  }}>OS</span>
                </div>
                <div style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                  fontSize: 10, fontWeight: 500, letterSpacing: "0.02em",
                }}>
                  Business Operating System
                </div>
              </div>
            </motion.div>
          </Link>

          {/* ─── DESKTOP NAV ─── */}
          <nav className="hidden lg:flex" style={{ alignItems: "center", gap: 4 }}>
            {NAV.map(item => {
              const active = pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} style={{
                    position: "relative", padding: "10px 20px", borderRadius: 14,
                    color: active ? (isDark ? "#fff" : "#111827") : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
                    fontSize: 14, fontWeight: 600, overflow: "hidden", transition: "all 0.3s",
                    background: active ? "rgba(99,102,241,0.1)" : "transparent",
                    border: active ? "1px solid rgba(99,102,241,0.15)" : "1px solid transparent",
                  }}>
                    {active && (
                      <motion.div layoutId="active-nav"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        style={{
                          position: "absolute", inset: 0, borderRadius: 14,
                          background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))",
                        }}
                      />
                    )}
                    <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ opacity: active ? 0.8 : 0.4, transition: "opacity 0.3s" }}>{item.icon}</span>
                      {item.name}
                      {active && (
                        <motion.span layoutId="active-dot"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          style={{
                            display: "inline-block", width: 4, height: 4, borderRadius: "50%",
                            background: "#6366f1", boxShadow: "0 0 12px rgba(99,102,241,0.5)",
                          }}
                        />
                      )}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* ─── ACTIONS ─── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Переключатель языка */}
            <LanguageDropdown theme={theme} />

            {/* Переключатель темы */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: isDark ? -10 : 10 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              style={{
                ...glass,
                width: 40, height: 40, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "#fff" : "#111827",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                cursor: "pointer", transition: "all 0.3s",
                position: "relative", overflow: "hidden",
              }}
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0.8 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
              >
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
              </motion.div>
              <motion.div
                key={theme}
                initial={{ scale: 0, opacity: 0.3 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: "absolute", inset: 0, borderRadius: 12,
                  background: isDark
                    ? "radial-gradient(circle, rgba(99,102,241,0.3), transparent)"
                    : "radial-gradient(circle, rgba(255,200,50,0.3), transparent)",
                }}
              />
            </motion.button>

            <div className="hidden lg:flex" style={{ alignItems: "center", gap: 10 }}>
              <Link to="/login">
                <motion.button
                  whileHover={{ y: -1, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    ...glass,
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                    padding: "10px 20px", borderRadius: 14, fontWeight: 600, fontSize: 14,
                    cursor: "pointer", transition: "all 0.3s",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  }}
                >
                  {t("auth.login")}
                </motion.button>
              </Link>

              <Link to="/register">
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    position: "relative", overflow: "hidden", border: "none",
                    padding: "11px 24px", borderRadius: 16,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.3)", transition: "all 0.3s",
                  }}
                >
                  <motion.div
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute", top: 0, bottom: 0, width: 60,
                      background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
                      transform: "skewX(-20deg)",
                    }}
                  />
                  <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                    {t("auth.register")}
                    <ArrowRight size={16} />
                  </span>
                </motion.button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpen(!open)}
              className="lg:hidden"
              style={{
                ...glass, width: 44, height: 44, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "#fff" : "#111827",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
              }}
            >
              <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.3 }}>
                {open ? <X size={20} /> : <Menu size={20} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ─── MOBILE MENU ─── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 90,
                background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)",
                backdropFilter: "blur(16px)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed", top: 88, left: 16, right: 16, zIndex: 100,
                padding: 24, borderRadius: 28,
                background: isDark ? "rgba(6,8,15,0.98)" : "rgba(255,255,255,0.98)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                backdropFilter: "blur(32px)",
                boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6)" : "0 24px 80px rgba(0,0,0,0.15)",
                overflow: "hidden", maxHeight: "calc(100vh - 120px)", overflowY: "auto",
              }}
            >
              {/* ... остальное без изменений ... */}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── MOBILE LANG PICKER ─────────────────────────────────────────────────────
function MobileLangPicker({ isDark }) {
  const { lang, setLang, languages } = useLanguage();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {languages.map(l => {
        const isActive = l.code === lang;
        return (
          <button key={l.code} onClick={() => setLang(l.code)} style={{
            flex: 1, padding: "8px 6px", borderRadius: 12, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            background: isActive
              ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
              : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
            border: isActive
              ? "1px solid rgba(99,102,241,0.3)"
              : `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 20 }}>{l.flag}</span>
            <span style={{
              fontSize: 11, fontWeight: isActive ? 700 : 500,
              color: isActive ? "#818cf8" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"),
            }}>
              {l.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

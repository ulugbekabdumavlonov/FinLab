// src/Pages/Landing/sections/RegisterBlock.jsx
import { useState, useEffect, useMemo } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../assets/firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Wallet,
  Eye,
  EyeOff,
  Zap,
  Orbit,
  Moon,
  Star,
  CloudMoon,
  Rocket,
  TrendingUp,
  Users,
  CheckSquare,
  Package,
  MessageSquare
} from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import { useLanguage } from "../Context/LanguageContext";

const FEATURES_KEYS = [
  { key: "ai", icon: <Sparkles size={18} />, color: "#818cf8" },
  { key: "banking", icon: <Wallet size={18} />, color: "#4ade80" },
  { key: "report", icon: <BarChart3 size={18} />, color: "#fb923c" },
];

const ECO_SYSTEM_KEYS = [
  { key: "finance", icon: <TrendingUp size={14} /> },
  { key: "hr", icon: <Users size={14} /> },
  { key: "tasks", icon: <CheckSquare size={14} /> },
  { key: "warehouse", icon: <Package size={14} /> },
  { key: "chat", icon: <MessageSquare size={14} /> },
];

export default function RegisterBlock() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [moonPhase, setMoonPhase] = useState(0);

  // Получаем переведённые данные
  const FEATURES = FEATURES_KEYS.map(item => ({
    ...item,
    text: t(`register.features.${item.key}.text`),
    description: t(`register.features.${item.key}.desc`)
  }));

  const ECO_SYSTEM = ECO_SYSTEM_KEYS.map(item => ({
    ...item,
    label: t(`register.ecosystem.${item.key}`)
  }));

  // ─── МЕМОИЗИРОВАННЫЕ ЗВЁЗДЫ ───
  const stars = useMemo(() => 
    Array.from({ length: isDark ? 200 : 0 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
      color: Math.random() > 0.7 ? '#818cf8' : '#ffffff'
    })),
    [isDark]
  );

  // ─── АНИМАЦИЯ ЛУНЫ ───
  useEffect(() => {
    if (!isDark) return;
    const interval = setInterval(() => {
      setMoonPhase(prev => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isDark]);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      return alert(t("register.errors.emptyFields"));
    }
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/onboarding");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: isDark ? "#06080f" : "#f0f2f5",
        padding: "120px 20px 80px",
        transition: "background 0.3s ease",
      }}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes moonGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(255,255,255,0.05), 0 0 80px rgba(255,255,255,0.02); }
          50% { box-shadow: 0 0 60px rgba(255,255,255,0.08), 0 0 120px rgba(255,255,255,0.03); }
        }
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes orbitRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes counterOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .float {
          animation: float 6s ease-in-out infinite;
        }
        .moon-glow {
          animation: moonGlow 4s ease-in-out infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg, #818cf8, #a78bfa, #818cf8);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientMove 4s ease infinite;
        }
      `}</style>

      {/* ─── КОСМИЧЕСКИЙ ФОН ─── */}
      {isDark && (
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}>
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
                background: star.color,
                opacity: star.opacity,
                boxShadow: `0 0 ${star.size * 3}px ${star.color}20`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}

          {/* Луна */}
          <motion.div
            className="float moon-glow"
            style={{
              position: "absolute",
              top: "5%",
              right: "5%",
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `radial-gradient(circle at ${30 + Math.sin(moonPhase * Math.PI / 180) * 20}% ${30 + Math.cos(moonPhase * Math.PI / 180) * 20}%, #f0f0f0, #c0c0c0)`,
              boxShadow: "0 0 60px rgba(255,255,255,0.05), 0 0 120px rgba(255,255,255,0.02), inset 0 -20px 40px rgba(0,0,0,0.1)",
              pointerEvents: "none",
            }}
          >
            {/* Кратеры */}
            {[
              { top: "20%", left: "15%", size: 15 },
              { top: "45%", right: "20%", size: 10 },
              { bottom: "25%", left: "30%", size: 8 },
              { top: "60%", left: "10%", size: 6 },
              { top: "30%", right: "35%", size: 5 }
            ].map((crater, i) => (
              <div key={i} style={{
                position: "absolute",
                ...crater,
                borderRadius: "50%",
                background: `rgba(0,0,0,${0.02 + i * 0.008})`,
              }} />
            ))}
          </motion.div>

          {/* Орбитальные кольца */}
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
                boxShadow: "0 0 20px rgba(99,102,241,0.3)",
              }}
            />
          </motion.div>

          {/* Свечения */}
          <div style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
            filter: "blur(140px)",
          }} />
          <div style={{
            position: "absolute",
            bottom: -250,
            right: -200,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)",
            filter: "blur(140px)",
          }} />

          {/* Сетка */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            opacity: 0.5,
          }} />
        </div>
      )}

      {/* ─── ПЕРЕХОД ─── */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        background: `linear-gradient(to top, ${isDark ? '#06080f' : '#f0f2f5'} 0%, transparent 100%)`,
        zIndex: 3,
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        position: "relative",
        zIndex: 2,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
        gap: 48,
        alignItems: "center",
      }}>
        {/* ─── ЛЕВАЯ ЧАСТЬ ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Бейдж */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              marginBottom: 28,
              backdropFilter: "blur(12px)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#4ade80",
                display: "block",
                boxShadow: "0 0 10px rgba(74,222,128,0.3)",
              }}
            />
            <CloudMoon size={14} />
            {t("register.badge")}
          </motion.div>

          {/* Заголовок */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontSize: "clamp(42px,6vw,74px)",
              lineHeight: 0.95,
              fontWeight: 900,
              letterSpacing: "-.07em",
              color: isDark ? "#fff" : "#111827",
              marginBottom: 24,
              maxWidth: 700,
              textShadow: isDark ? "0 0 40px rgba(99,102,241,0.05)" : "none",
            }}
          >
            {t("register.title")}
            <br />
            <span className="gradient-text">
              {t("register.titleHighlight")}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              maxWidth: 560,
              fontSize: 17,
              lineHeight: 1.8,
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              marginBottom: 28,
            }}
          >
            {t("register.description")}
          </motion.p>

          {/* ─── ЭКОСИСТЕМА ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {ECO_SYSTEM.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                whileHover={{ y: -2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                  color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                  fontSize: 12,
                  fontWeight: 500,
                  backdropFilter: "blur(8px)",
                  transition: "all 0.3s",
                }}
              >
                <span style={{ color: "#818cf8", opacity: 0.6 }}>
                  {item.icon}
                </span>
                {item.label}
              </motion.div>
            ))}
          </motion.div>

          {/* Фичи */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ x: 6, borderColor: `${item.color}30` }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderRadius: 22,
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
                  backdropFilter: "blur(12px)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.3s",
                }}
              >
                {isDark && (
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.03, 0.06, 0.03],
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${item.color}10, transparent 70%)`,
                      filter: "blur(20px)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    boxShadow: "0 10px 25px rgba(99,102,241,0.25)",
                    position: "relative",
                    zIndex: 2,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div
                    style={{
                      color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {item.text}
                  </div>
                  <div
                    style={{
                      color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ─── ПРАВАЯ ЧАСТЬ ─── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ position: "relative" }}
        >
          {isDark && (
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 6, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: -30,
                borderRadius: 40,
                background: "rgba(99,102,241,0.08)",
                filter: "blur(60px)",
                pointerEvents: "none",
              }}
            />
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              position: "relative",
              zIndex: 2,
              overflow: "hidden",
              borderRadius: 36,
              padding: 40,
              background: isDark 
                ? "linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))"
                : "linear-gradient(135deg,rgba(255,255,255,0.9),rgba(245,247,250,0.9))",
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              backdropFilter: "blur(24px)",
              boxShadow: isDark 
                ? "0 20px 60px rgba(0,0,0,0.3)"
                : "0 20px 60px rgba(0,0,0,0.05)",
            }}
          >
            {isDark && (
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
                }}
              />
            )}

            <div style={{ marginBottom: 32 }}>
              <h3
                style={{
                  color: isDark ? "#fff" : "#111827",
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-.05em",
                  marginBottom: 10,
                }}
              >
                {t("register.form.title")}
              </h3>
              <p
                style={{
                  color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                  fontSize: 15,
                  lineHeight: 1.7,
                }}
              >
                {t("register.form.subtitle")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Email */}
              <div style={{ position: "relative" }}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <input
                    placeholder={t("register.form.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "18px 20px",
                      borderRadius: 18,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                      color: isDark ? "#fff" : "#111827",
                      outline: "none",
                      fontSize: 15,
                      boxSizing: "border-box",
                      transition: "all 0.3s",
                      backdropFilter: "blur(10px)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.2)";
                      e.target.style.boxShadow = "0 0 30px rgba(99,102,241,0.03)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </motion.div>
              </div>

              {/* Пароль */}
              <div style={{ position: "relative" }}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <input
                    type={show ? "text" : "password"}
                    placeholder={t("register.form.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "18px 52px 18px 20px",
                      borderRadius: 18,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                      color: isDark ? "#fff" : "#111827",
                      outline: "none",
                      fontSize: 15,
                      boxSizing: "border-box",
                      transition: "all 0.3s",
                      backdropFilter: "blur(10px)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.2)";
                      e.target.style.boxShadow = "0 0 30px rgba(99,102,241,0.03)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </motion.div>

                <button
                  onClick={() => setShow(!show)}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 18,
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Кнопка регистрации */}
              <motion.button
                whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                disabled={loading}
                onClick={handleRegister}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 6,
                  padding: "18px 22px",
                  borderRadius: 20,
                  background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: loading ? "none" : "0 10px 30px rgba(99,102,241,0.2)",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: 18,
                      height: 18,
                      border: "2px solid rgba(255,255,255,0.1)",
                      borderTop: "2px solid #fff",
                      borderRadius: "50%",
                    }}
                  />
                )}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loading ? "loading" : "ready"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "relative",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {loading ? t("register.form.loading") : (
                      <>
                        <Rocket size={18} />
                        {t("register.form.button")}
                      </>
                    )}
                    {!loading && <ArrowRight size={18} />}
                  </motion.span>
                </AnimatePresence>

                {!loading && (
                  <motion.div
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: 60,
                      background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)",
                      transform: "skewX(-20deg)",
                    }}
                  />
                )}
              </motion.button>

              {/* Security badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 8,
                  color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)",
                  fontSize: 13,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
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
                <ShieldCheck size={15} />
                {t("register.form.security")}
              </motion.div>

              {/* Уже есть аккаунт */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={{
                  textAlign: "center",
                  marginTop: 4,
                  color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)",
                  fontSize: 13,
                }}
              >
                {t("register.form.haveAccount")}{" "}
                <span
                  style={{
                    color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                    cursor: "pointer",
                    transition: "color 0.2s",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#818cf8"}
                  onMouseLeave={(e) => e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
                  onClick={() => navigate("/login")}
                >
                  {t("register.form.login")}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// src/Pages/LoginandRegister/Login.jsx
import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, EyeOff, ArrowRight, Sparkles, Shield, Zap, Fingerprint, 
  Cpu, Lock, Key, Scan, Mail, Globe, Users, CheckCircle,
  LogIn, ArrowUpRight, CornerDownLeft, ScanFace, Star
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useTheme } from "../Context/ThemeContext";

export default function Login() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(null);
  const [stars, setStars] = useState([]);

  // ─── ГЕНЕРАЦИЯ ЗВЁЗД ───
  useEffect(() => {
    if (!isDark) return;
    const generatedStars = [];
    for (let i = 0; i < 150; i++) {
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
  }, [isDark]);

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess(true);
      setTimeout(() => navigate("/app"), 1200);
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      setSuccess(true);
      setTimeout(() => navigate("/app"), 1200);
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <>
      <style>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes scanLine {
          0% { top: -5%; opacity: 1; }
          100% { top: 105%; opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes fadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        .auth-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .auth-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 50px;
          background: ${isDark ? 'linear-gradient(135deg, #06080f, #0a0d1a)' : 'linear-gradient(135deg, #f0f2f5, #e8eaf0)'};
          position: relative;
          overflow: hidden;
        }
        .auth-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 50px;
          background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)'};
          backdrop-filter: blur(20px);
          border-left: ${isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)'};
        }
        @media (max-width: 860px) {
          .auth-grid { grid-template-columns: 1fr; }
          .auth-left { display: none; }
          .auth-right { border-left: none; padding: 40px 24px; }
        }
        .auth-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1.5px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
          background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)'};
          color: ${isDark ? '#fff' : '#111827'};
          outline: none;
          font-size: 14px;
          font-family: 'Inter', -apple-system, sans-serif;
          box-sizing: border-box;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .auth-input:focus {
          border-color: #6366f1;
          background: ${isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.02)'};
          box-shadow: 0 0 0 4px rgba(99,102,241,0.06);
        }
        .auth-input::placeholder { 
          color: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}; 
        }
        .auth-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px ${isDark ? '#0a0d1a' : '#f0f2f5'} inset !important;
          -webkit-text-fill-color: ${isDark ? '#fff' : '#111827'} !important;
        }
        .scanning-line {
          animation: scanLine 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .glow-pulse {
          animation: glowPulse 3s ease-in-out infinite;
        }
        .fade-scale {
          animation: fadeScale 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 99px; }
      `}</style>

      <section
        style={{
          minHeight: "100vh",
          background: isDark ? "#06080f" : "#f0f2f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          position: "relative",
          fontFamily: "'Inter', -apple-system, sans-serif",
          transition: "background 0.3s ease",
        }}
      >
        {/* ─── ФОН СО ЗВЁЗДАМИ ─── */}
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
              position: "absolute",
              top: -300,
              right: -200,
              width: 600,
              height: 600,
              background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
              filter: "blur(100px)",
            }} />
            <div style={{
              position: "absolute",
              bottom: -200,
              left: -100,
              width: 400,
              height: 400,
              background: "radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)",
              filter: "blur(80px)",
            }} />
            
            {/* Тонкая сетка */}
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px, 80px 80px",
              opacity: 0.5,
            }} />

            {/* Сканирующая линия */}
            <div className="scanning-line" style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.15), rgba(139,92,246,0.15), transparent)",
              filter: "blur(2px)",
            }} />
          </div>
        )}

        {/* ─── ОСНОВНОЙ КОНТЕЙНЕР ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="auth-grid"
          style={{
            width: "100%",
            maxWidth: 1060,
            background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: isDark 
              ? "0 40px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)"
              : "0 40px 80px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* ─── LEFT ─── */}
          <div className="auth-left">
            {/* Верхний бейдж */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 14px 6px 10px",
                borderRadius: 999,
                background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)'}`,
                width: "fit-content",
                marginBottom: 32,
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4ade80",
                display: "block",
                boxShadow: "0 0 12px rgba(74,222,128,0.3)",
              }} />
              <span style={{ 
                fontSize: 11, 
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", 
                fontWeight: 500, 
                letterSpacing: "0.04em" 
              }}>
                СИСТЕМА АКТИВНА
              </span>
            </motion.div>

            {/* Заголовок */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h1 style={{
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.1,
                color: isDark ? "#fff" : "#111827",
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}>
                Вход в
                <span style={{
                  display: "block",
                  background: "linear-gradient(135deg, #818cf8, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}>
                  FinLab
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 14,
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
                lineHeight: 1.7,
                maxWidth: 380,
                marginBottom: 40,
              }}
            >
              Единая операционная система для управления финансами, персоналом, задачами, складом и коммуникациями.
            </motion.p>

            {/* Статистика */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                display: "flex",
                gap: 40,
                paddingTop: 28,
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              }}
            >
              {[
                { value: "500+", label: "компаний" },
                { value: "98%", label: "точность AI" },
                { value: "24/7", label: "поддержка" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: 600, 
                    color: isDark ? "#fff" : "#111827", 
                    letterSpacing: "-0.02em" 
                  }}>
                    {item.value}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)" 
                  }}>{item.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Индикатор защиты */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)",
                borderRadius: 8,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                width: "fit-content",
              }}
            >
              <Shield size={12} style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)" }} />
              <span style={{ 
                fontSize: 11, 
                color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" 
              }}>
                Квантовая защита: активна
              </span>
              <span style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#4ade80",
                display: "block",
                boxShadow: "0 0 8px rgba(74,222,128,0.3)",
              }} />
            </motion.div>
          </div>

          {/* ─── RIGHT ─── */}
          <div className="auth-right">
            <div style={{ width: "100%", maxWidth: 340 }}>
              {/* Заголовок формы */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ marginBottom: 28 }}
              >
                <h2 style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: isDark ? "#fff" : "#111827",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}>
                  Авторизация
                </h2>
                <p style={{
                  fontSize: 13,
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}>
                  Введите данные для доступа к системе
                </p>
              </motion.div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}>
                    <Mail size={12} style={{ color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }} />
                    <span style={{ 
                      fontSize: 11, 
                      color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)", 
                      fontWeight: 500 
                    }}>
                      Электронная почта
                    </span>
                  </div>
                  <input
                    className="auth-input"
                    placeholder="user@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    style={{
                      borderColor: focused === 'email' ? 'rgba(99,102,241,0.3)' : undefined,
                    }}
                  />
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Lock size={12} style={{ color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }} />
                      <span style={{ 
                        fontSize: 11, 
                        color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)", 
                        fontWeight: 500 
                      }}>
                        Пароль
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
                    >
                      Забыли?
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      className="auth-input"
                      type={show ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      style={{
                        paddingRight: 44,
                        borderColor: focused === 'password' ? 'rgba(99,102,241,0.3)' : undefined,
                      }}
                    />
                    <button
                      onClick={() => setShow(!show)}
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
                        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </motion.div>

                {/* Кнопка входа */}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogin}
                  disabled={loading || success}
                  style={{
                    marginTop: 6,
                    padding: "14px 24px",
                    borderRadius: 12,
                    border: "none",
                    cursor: (loading || success) ? "not-allowed" : "pointer",
                    background: (loading || success) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    width: "100%",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    opacity: (loading || success) ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(255,255,255,0.2)",
                          borderTop: "2px solid #fff",
                          borderRadius: "50%",
                        }}
                      />
                      <span>Выполняется вход...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={18} />
                      <span>Доступ открыт</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Войти в систему</span>
                    </>
                  )}
                </motion.button>

                {/* Разделитель */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    margin: "4px 0",
                  }}
                >
                  <div style={{ 
                    flex: 1, 
                    height: 1, 
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" 
                  }} />
                  <span style={{ 
                    fontSize: 11, 
                    color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" 
                  }}>или</span>
                  <div style={{ 
                    flex: 1, 
                    height: 1, 
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" 
                  }} />
                </motion.div>

                {/* Google */}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogle}
                  disabled={loading}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)",
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    fontWeight: 500,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    cursor: loading ? "not-allowed" : "pointer",
                    width: "100%",
                    transition: "all 0.2s",
                    opacity: loading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                      e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)";
                    e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                  }}
                >
                  <FcGoogle size={18} />
                  <span>Продолжить с Google</span>
                </motion.button>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 2,
                    fontSize: 13,
                    color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                  }}
                >
                  <span>Нет аккаунта?</span>
                  <span
                    onClick={() => navigate("/register")}
                    style={{
                      color: "#818cf8",
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#a78bfa"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#818cf8"}
                  >
                    Создать →
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── УСПЕШНЫЙ ВХОД ─── */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                background: isDark ? "rgba(6,8,15,0.92)" : "rgba(240,242,245,0.92)",
                backdropFilter: "blur(30px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #4ade80, #22c55e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 60px rgba(74,222,128,0.2)",
                }}
              >
                <CheckCircle size={32} color="#fff" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                style={{ textAlign: "center" }}
              >
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: isDark ? "#fff" : "#111827",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}>
                  Добро пожаловать
                </h2>
                <p style={{
                  fontSize: 14,
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}>
                  Перенаправление в систему...
                </p>
              </motion.div>

              <motion.div
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 1.2, ease: "linear" }}
                style={{
                  width: 200,
                  height: 2,
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  borderRadius: 2,
                  marginTop: 8,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

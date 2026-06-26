import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Zap, Orbit, Globe } from "lucide-react";
import { useTheme } from "../Context/ThemeContext";

const ITEMS = [
  { label: "Без карты", icon: <Zap size={14} /> },
  { label: "AI-аналитика", icon: <Sparkles size={14} /> },
  { label: "Настройка за 1 день", icon: <Orbit size={14} /> },
  { label: "Поддержка 24/7", icon: <Globe size={14} /> },
];

export default function CTA() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: isDark ? "#05070e" : "#e8eaf0",
        padding: "120px 20px 80px",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.3s ease",
      }}
    >
      {/* ГЛОБАЛЬНЫЙ ФОН — КВАНТОВОЕ ПОЛЕ */}
      {isDark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse at 20% 30%, rgba(99,102,241,.15), transparent 60%),
              radial-gradient(ellipse at 80% 70%, rgba(139,92,246,.10), transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(59,130,246,.05), transparent 70%)
            `,
          }}
        />
      )}

      {/* ЧАСТИЦЫ — 1000+ ТОЧЕК */}
      {isDark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 80 }).map((_, i) => {
            const size = Math.random() * 3 + 1;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 20 + 15;
            const delay = Math.random() * 10;
            const opacity = Math.random() * 0.5 + 0.1;
            return (
              <motion.div
                key={i}
                animate={{
                  x: [0, Math.random() * 60 - 30, 0],
                  y: [0, Math.random() * 60 - 30, 0],
                  opacity: [opacity, opacity * 2, opacity],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  delay,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background:
                    i % 3 === 0
                      ? "rgba(99,102,241,.8)"
                      : i % 3 === 1
                      ? "rgba(139,92,246,.6)"
                      : "rgba(59,130,246,.7)",
                  boxShadow: `0 0 ${size * 4}px rgba(99,102,241,.3)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ГОЛОГРАФИЧЕСКАЯ СЕТКА */}
      {isDark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(99,102,241,.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,.03) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
      )}

      {/* ОРБИТАЛЬНЫЕ КОЛЬЦА */}
      {isDark && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 700,
              height: 700,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "1px solid rgba(99,102,241,.05)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                top: -2,
                left: "50%",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#6366f1",
                boxShadow: "0 0 20px rgba(99,102,241,.8)",
              }}
            />
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 500,
              height: 500,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "1px solid rgba(139,92,246,.04)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                bottom: -2,
                left: "50%",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#8b5cf6",
                boxShadow: "0 0 15px rgba(139,92,246,.6)",
              }}
            />
          </motion.div>
        </>
      )}

      {/* ОСНОВНАЯ КАРТОЧКА */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
          borderRadius: 50,
          overflow: "hidden",
          padding: "100px 40px 80px",
          background: isDark 
            ? `linear-gradient(135deg, rgba(15,23,42,.92), rgba(30,41,59,.88))`
            : `linear-gradient(135deg, rgba(255,255,255,.95), rgba(245,247,250,.95))`,
          border: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'}`,
          backdropFilter: "blur(40px)",
          boxShadow: isDark 
            ? `0 40px 100px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)`
            : `0 40px 100px rgba(0,0,0,.05), inset 0 1px 0 rgba(255,255,255,.5)`,
          transition: "all 0.3s ease",
        }}
      >
        {/* ВНУТРЕННЕЕ СВЕЧЕНИЕ */}
        {isDark && (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{ duration: 6, repeat: Infinity }}
            style={{
              position: "absolute",
              top: -200,
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 600,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,.2), transparent 70%)",
              filter: "blur(80px)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* ГОЛОГРАФИЧЕСКАЯ ЛИНИЯ */}
        {isDark && (
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,.6), rgba(139,92,246,.6), transparent)",
              filter: "blur(2px)",
            }}
          />
        )}

        {/* КОНТЕНТ */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* БЭЙДЖ — С ПУЛЬСИРУЮЩИМ ЭФФЕКТОМ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              marginBottom: 30,
              padding: "8px 20px 8px 16px",
              borderRadius: 999,
              background: isDark ? "rgba(99,102,241,.12)" : "rgba(99,102,241,.08)",
              border: `1px solid ${isDark ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.1)'}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.span
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 20px rgba(74,222,128,.8)",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: isDark ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.6)",
              }}
            >
              AI Finance Platform · 2100
            </span>
          </motion.div>

          {/* ЗАГОЛОВОК — С ГОЛОГРАФИЧЕСКИМ ЭФФЕКТОМ */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontSize: "clamp(44px,7vw,88px)",
              lineHeight: 0.92,
              fontWeight: 900,
              letterSpacing: "-.06em",
              color: isDark ? "#fff" : "#111827",
              maxWidth: 900,
              marginBottom: 28,
              textShadow: isDark ? "0 0 80px rgba(99,102,241,.15)" : "none",
            }}
          >
            <span
              style={{
                background: isDark 
                  ? "linear-gradient(135deg, #fff 30%, rgba(99,102,241,.6) 100%)"
                  : "linear-gradient(135deg, #111827 30%, rgba(99,102,241,.6) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Квантовый скачок
            </span>
            <br />
            в управлении
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
              финансами
            </span>
          </motion.h2>

          <style>{`
            @keyframes gradientMove {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>

          {/* ОПИСАНИЕ */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              maxWidth: 700,
              fontSize: 18,
              lineHeight: 1.8,
              color: isDark ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.5)",
              marginBottom: 48,
              letterSpacing: ".01em",
            }}
          >
            Управляйте финансами будущего — в реальном времени, с ИИ-прогнозами,
            голографической аналитикой и квантовой безопасностью.
          </motion.p>

          {/* КНОПКИ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 18,
              marginBottom: 48,
            }}
          >
            {/* ГЛАВНАЯ КНОПКА — С ЭФФЕКТОМ КВАНТОВОГО ТОННЕЛЯ */}
            <motion.button
              whileHover={{
                scale: 1.05,
                y: -4,
                boxShadow: "0 30px 60px rgba(99,102,241,.5)",
              }}
              whileTap={{ scale: 0.96 }}
              style={{
                position: "relative",
                overflow: "hidden",
                border: "none",
                cursor: "pointer",
                padding: "20px 36px",
                borderRadius: 26,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 20px 50px rgba(99,102,241,.35)",
              }}
            >
              {/* СВЕЧЕНИЕ */}
              <motion.div
                animate={{ x: ["-200%", "200%"] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 80,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)",
                  transform: "skewX(-25deg)",
                }}
              />
              <span style={{ position: "relative", zIndex: 2 }}>
                Начать эру
              </span>
              <ArrowRight
                size={18}
                style={{ position: "relative", zIndex: 2 }}
              />
            </motion.button>

            {/* ВТОРИЧНАЯ КНОПКА — С ЭФФЕКТОМ ГОЛОГРАММЫ */}
            <motion.button
              whileHover={{
                scale: 1.04,
                background: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.04)",
                borderColor: isDark ? "rgba(255,255,255,.15)" : "rgba(0,0,0,.1)",
              }}
              whileTap={{ scale: 0.96 }}
              style={{
                border: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'}`,
                cursor: "pointer",
                padding: "20px 32px",
                borderRadius: 26,
                background: isDark ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.02)",
                color: isDark ? "#fff" : "#111827",
                fontWeight: 600,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
                backdropFilter: "blur(12px)",
                transition: "all .3s",
              }}
            >
              <Play size={16} />
              Смотреть демо
            </motion.button>
          </motion.div>

          {/* ТРАСТ-БЛОК — С ФЛОАТ-ЭФФЕКТОМ */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {ITEMS.map((item, idx) => (
              <motion.div
                key={item.label}
                whileHover={{
                  y: -4,
                  borderColor: isDark ? "rgba(99,102,241,.3)" : "rgba(99,102,241,.2)",
                  boxShadow: "0 8px 30px rgba(99,102,241,.1)",
                }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                style={{
                  padding: "10px 20px 10px 16px",
                  borderRadius: 999,
                  background: isDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.02)",
                  border: `1px solid ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'}`,
                  color: isDark ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.5)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all .3s",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span style={{ color: isDark ? "rgba(99,102,241,.6)" : "rgba(99,102,241,.7)" }}>
                  {item.icon}
                </span>
                {item.label}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

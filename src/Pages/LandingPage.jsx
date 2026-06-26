import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Header from "./Header";
import Hero from "./Hero";
import Features from "./Features";
import Logos from "./Logos";
import RegisterBlock from "./RegisterBlock";
import Footer from "./Footer";
import { useTheme } from "../Context/ThemeContext";

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: isDark ? "#05070e" : "#f0f2f5",
        color: isDark ? "#fff" : "#111827",
        minHeight: "100vh",
        overflow: "hidden",
        position: "relative",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {/* ─── ГЛОБАЛЬНЫЙ КВАНТОВЫЙ ФОН ─── */}
      {isDark && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* Основные свечения */}
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "20%",
              width: 600,
              height: 600,
              background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              right: "20%",
              width: 500,
              height: 500,
              background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 800,
              height: 800,
              background: "radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
          />

          {/* Орбитальные кольца */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "10%",
              right: "5%",
              width: 500,
              height: 500,
              borderRadius: "50%",
              border: "1px solid rgba(99,102,241,0.03)",
            }}
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                top: -2,
                left: "50%",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#6366f1",
                boxShadow: "0 0 20px rgba(99,102,241,0.4)",
              }}
            />
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              bottom: "15%",
              left: "5%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              border: "1px solid rgba(139,92,246,0.03)",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                bottom: -2,
                left: "50%",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#8b5cf6",
                boxShadow: "0 0 15px rgba(139,92,246,0.3)",
              }}
            />
          </motion.div>

          {/* Частицы */}
          {Array.from({ length: 50 }).map((_, i) => {
            const size = Math.random() * 2 + 0.5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 25 + 20;
            const delay = Math.random() * 15;
            const colors = ["rgba(99,102,241,0.4)", "rgba(139,92,246,0.3)", "rgba(59,130,246,0.3)"];
            const color = colors[i % 3];
            return (
              <motion.div
                key={i}
                animate={{
                  x: [0, Math.random() * 80 - 40, 0],
                  y: [0, Math.random() * 80 - 40, 0],
                  opacity: [0.1, 0.5, 0.1],
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
                  background: color,
                  boxShadow: `0 0 ${size * 4}px rgba(99,102,241,0.2)`,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* Голографическая сетка */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.02,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)",
            }}
          />

          {/* Индикатор скролла */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: scrolled ? 0 : 0.6 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.2)",
                fontWeight: 500,
              }}
            >
              Скролл
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 16,
                height: 16,
                borderRight: "1.5px solid rgba(255,255,255,0.15)",
                borderBottom: "1.5px solid rgba(255,255,255,0.15)",
                transform: "rotate(45deg)",
              }}
            />
          </motion.div>
        </div>
      )}

      {/* ─── КОНТЕНТ ─── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Header />

        <main>
          {/* Каждая секция с прозрачным фоном, чтобы просвечивал квантовый фон */}
          <section style={{ background: "transparent" }}>
            <Hero />
          </section>

          <section style={{ background: "transparent", padding: "0" }}>
            <Features />
          </section>

          <section style={{ background: "transparent", padding: "0" }}>
            <Logos />
          </section>

          <section style={{ background: "transparent", padding: "0" }}>
            <RegisterBlock />
          </section>

          <section style={{ background: "transparent", padding: "0" }}>
            <Footer />
          </section>
        </main>

        {/* ─── ПЛАВНЫЙ ГРАДИЕНТ НА ДНЕ ─── */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            background: `linear-gradient(to bottom, transparent, ${isDark ? '#05070e' : '#f0f2f5'})`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      </div>
    </div>
  );
}

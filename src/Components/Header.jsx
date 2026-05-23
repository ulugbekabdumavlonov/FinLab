import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X, ChevronRight } from "lucide-react";

const NAV = [
  { name: "Возможности", path: "/features" },
  { name: "Тарифы", path: "/pricing" },
  { name: "Партнёрам", path: "/partners" },
];

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
};

export default function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          padding: scrolled ? "14px 20px" : "20px",
          transition: ".3s",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "14px 18px",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: scrolled ? "rgba(8,11,20,.82)" : "rgba(8,11,20,.45)",
            border: "1px solid rgba(255,255,255,.06)",
            backdropFilter: "blur(22px)",
            boxShadow: "0 10px 40px rgba(0,0,0,.25)",
          }}
        >
          {/* LOGO */}
          <Link to="/">
            <motion.div whileHover={{ scale: 1.03 }} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 900,
                  boxShadow: "0 10px 30px rgba(99,102,241,.35)",
                }}
              >
                F
              </div>

              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 19, letterSpacing: "-.04em" }}>
                  FinLab
                </div>
                <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>
                  AI Finance OS
                </div>
              </div>
            </motion.div>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex" style={{ alignItems: "center", gap: 8 }}>
            {NAV.map((item) => {
              const active = pathname === item.path;

              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ y: -1 }}
                    style={{
                      position: "relative",
                      padding: "12px 18px",
                      borderRadius: 16,
                      color: active ? "#fff" : "rgba(255,255,255,.55)",
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: "hidden",
                      ...(active && {
                        background: "rgba(99,102,241,.12)",
                        border: "1px solid rgba(99,102,241,.18)",
                      }),
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="active-nav"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 16,
                          background: "linear-gradient(135deg,rgba(99,102,241,.14),rgba(139,92,246,.1))",
                        }}
                      />
                    )}

                    <span style={{ position: "relative", zIndex: 2 }}>
                      {item.name}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* ACTIONS */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hidden lg:flex" style={{ alignItems: "center", gap: 12 }}>
              <Link to="/login">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    ...glass,
                    color: "#fff",
                    padding: "13px 18px",
                    borderRadius: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Войти
                </motion.button>
              </Link>

              <Link to="/register">
                <motion.button
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    border: "none",
                    padding: "14px 22px",
                    borderRadius: 18,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 12px 35px rgba(99,102,241,.35)",
                  }}
                >
                  <motion.div
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: 80,
                      background: "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)",
                      transform: "skewX(-20deg)",
                    }}
                  />

                  <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    Начать <ChevronRight size={16} />
                  </span>
                </motion.button>
              </Link>
            </div>

            {/* MOBILE BUTTON */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setOpen(!open)}
              className="lg:hidden"
              style={{
                ...glass,
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.55)",
                backdropFilter: "blur(8px)",
                zIndex: 90,
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              style={{
                position: "fixed",
                top: 92,
                left: 16,
                right: 16,
                zIndex: 100,
                padding: 18,
                borderRadius: 28,
                background: "rgba(8,11,20,.94)",
                border: "1px solid rgba(255,255,255,.06)",
                backdropFilter: "blur(28px)",
                boxShadow: "0 20px 60px rgba(0,0,0,.4)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {NAV.map((item) => {
                  const active = pathname === item.path;

                  return (
                    <Link key={item.path} to={item.path}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        style={{
                          padding: "16px 18px",
                          borderRadius: 18,
                          color: active ? "#fff" : "rgba(255,255,255,.65)",
                          background: active ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.03)",
                          border: active
                            ? "1px solid rgba(99,102,241,.2)"
                            : "1px solid rgba(255,255,255,.05)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontWeight: 600,
                        }}
                      >
                        {item.name}
                        <ChevronRight size={18} />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
                <Link to="/login">
                  <button
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: 18,
                      ...glass,
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    Войти
                  </button>
                </Link>

                <Link to="/register">
                  <button
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: 18,
                      border: "none",
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "#fff",
                      fontWeight: 700,
                      boxShadow: "0 10px 30px rgba(99,102,241,.35)",
                    }}
                  >
                    Начать бесплатно
                  </button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

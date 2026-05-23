import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Wallet,
  Eye,
  EyeOff,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Sparkles size={18} />,
    text: "AI-рекомендации по оптимизации",
  },
  {
    icon: <Wallet size={18} />,
    text: "Все банковские данные в одном месте",
  },
  {
    icon: <BarChart3 size={18} />,
    text: "Автоматический отчёт ДДС",
  },
];

export default function RegisterBlock() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [show, setShow] =
    useState(false);

  const handleRegister =
    async () => {
      if (
        !email.trim() ||
        !password.trim()
      ) {
        return alert(
          "Заполните все поля"
        );
      }

      try {
        setLoading(true);

        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

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
        background: "#080b14",
        padding:
          "120px 20px 80px",
      }}
    >
      {/* BACKGROUND */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "rgba(99,102,241,.22)",
          filter: "blur(140px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: -250,
          right: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "rgba(139,92,246,.18)",
          filter: "blur(140px)",
        }}
      />

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(320px,1fr))",
          gap: 40,
          alignItems: "center",
        }}
      >
        {/* LEFT */}
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
          }}
        >
          {/* BADGE */}
          <div
            style={{
              display: "inline-flex",
              alignItems:
                "center",
              gap: 10,
              padding:
                "10px 16px",
              borderRadius: 999,
              background:
                "rgba(255,255,255,.04)",
              border:
                "1px solid rgba(255,255,255,.06)",
              color:
                "rgba(255,255,255,.6)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing:
                ".08em",
              textTransform:
                "uppercase",
              marginBottom: 26,
            }}
          >
            <Sparkles size={14} />
            AI Finance Platform
          </div>

          {/* TITLE */}
          <h2
            style={{
              fontSize:
                "clamp(42px,6vw,74px)",
              lineHeight: 0.95,
              fontWeight: 900,
              letterSpacing:
                "-.07em",
              color: "#fff",
              marginBottom: 24,
              maxWidth: 700,
            }}
          >
            Финансы
            <br />
            нового
            <span
              style={{
                background:
                  "linear-gradient(135deg,#6366f1,#8b5cf6)",
                WebkitBackgroundClip:
                  "text",
                color:
                  "transparent",
              }}
            >
              {" "}
              уровня
            </span>
          </h2>

          {/* DESC */}
          <p
            style={{
              maxWidth: 560,
              fontSize: 18,
              lineHeight: 1.8,
              color:
                "rgba(255,255,255,.42)",
              marginBottom: 36,
            }}
          >
            Управляйте
            cashflow,
            прибылью,
            долгами и
            бюджетами в
            одной AI-системе.
          </p>

          {/* FEATURES */}
          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: 14,
            }}
          >
            {FEATURES.map(
              (item, i) => (
                <motion.div
                  key={i}
                  whileHover={{
                    x: 4,
                  }}
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 14,
                    padding:
                      "16px 18px",
                    borderRadius: 22,
                    background:
                      "rgba(255,255,255,.03)",
                    border:
                      "1px solid rgba(255,255,255,.05)",
                    backdropFilter:
                      "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      background:
                        "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color:
                        "#fff",
                      boxShadow:
                        "0 10px 25px rgba(99,102,241,.35)",
                    }}
                  >
                    {
                      item.icon
                    }
                  </div>

                  <span
                    style={{
                      color:
                        "rgba(255,255,255,.72)",
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {
                      item.text
                    }
                  </span>
                </motion.div>
              )
            )}
          </div>
        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{ once: true }}
          transition={{
            duration: 0.7,
          }}
          style={{
            position:
              "relative",
          }}
        >
          {/* GLOW */}
          <div
            style={{
              position:
                "absolute",
              inset: -30,
              borderRadius: 40,
              background:
                "rgba(99,102,241,.18)",
              filter:
                "blur(60px)",
            }}
          />

          {/* CARD */}
          <div
            style={{
              position:
                "relative",
              zIndex: 2,
              overflow:
                "hidden",
              borderRadius: 36,
              padding: 36,
              background:
                "linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03))",
              border:
                "1px solid rgba(255,255,255,.08)",
              backdropFilter:
                "blur(24px)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,.35)",
            }}
          >
            {/* TOP LINE */}
            <div
              style={{
                position:
                  "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background:
                  "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)",
              }}
            />

            {/* TITLE */}
            <div
              style={{
                marginBottom: 30,
              }}
            >
              <h3
                style={{
                  color:
                    "#fff",
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing:
                    "-.05em",
                  marginBottom: 10,
                }}
              >
                Создать аккаунт
              </h3>

              <p
                style={{
                  color:
                    "rgba(255,255,255,.4)",
                  fontSize: 15,
                  lineHeight: 1.7,
                }}
              >
                7 дней
                бесплатного
                доступа без
                ограничений
              </p>
            </div>

            {/* INPUTS */}
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 18,
              }}
            >
              {/* EMAIL */}
              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "18px 20px",
                    borderRadius: 18,
                    border:
                      "1px solid rgba(255,255,255,.08)",
                    background:
                      "rgba(255,255,255,.03)",
                    color:
                      "#fff",
                    outline:
                      "none",
                    fontSize: 15,
                  }}
                />
              </div>

              {/* PASSWORD */}
              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <input
                  type={
                    show
                      ? "text"
                      : "password"
                  }
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "18px 20px",
                    borderRadius: 18,
                    border:
                      "1px solid rgba(255,255,255,.08)",
                    background:
                      "rgba(255,255,255,.03)",
                    color:
                      "#fff",
                    outline:
                      "none",
                    fontSize: 15,
                  }}
                />

                <button
                  onClick={() =>
                    setShow(
                      !show
                    )
                  }
                  style={{
                    position:
                      "absolute",
                    top: "50%",
                    right: 18,
                    transform:
                      "translateY(-50%)",
                    background:
                      "transparent",
                    border:
                      "none",
                    color:
                      "rgba(255,255,255,.45)",
                    cursor:
                      "pointer",
                  }}
                >
                  {show ? (
                    <EyeOff
                      size={
                        18
                      }
                    />
                  ) : (
                    <Eye
                      size={
                        18
                      }
                    />
                  )}
                </button>
              </div>

              {/* BUTTON */}
              <motion.button
                whileHover={{
                  scale: 1.02,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                disabled={loading}
                onClick={
                  handleRegister
                }
                style={{
                  position:
                    "relative",
                  overflow:
                    "hidden",
                  border:
                    "none",
                  cursor:
                    "pointer",
                  marginTop: 6,
                  padding:
                    "18px 22px",
                  borderRadius: 20,
                  background:
                    "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color:
                    "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: 10,
                  boxShadow:
                    "0 15px 40px rgba(99,102,241,.35)",
                }}
              >
                {/* Shine */}
                <motion.div
                  animate={{
                    x: [
                      "-120%",
                      "220%",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat:
                      Infinity,
                    ease: "linear",
                  }}
                  style={{
                    position:
                      "absolute",
                    top: 0,
                    bottom: 0,
                    width: 80,
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)",
                    transform:
                      "skewX(-20deg)",
                  }}
                />

                <AnimatePresence mode="wait">
                  <motion.span
                    key={
                      loading
                    }
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                    style={{
                      position:
                        "relative",
                      zIndex: 2,
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    {loading
                      ? "Создание..."
                      : "Попробовать бесплатно"}

                    {!loading && (
                      <ArrowRight
                        size={
                          18
                        }
                      />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {/* FOOTER */}
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: 10,
                  marginTop: 8,
                  color:
                    "rgba(255,255,255,.35)",
                  fontSize: 13,
                }}
              >
                <ShieldCheck
                  size={15}
                />
                Данные защищены
                enterprise-grade
                security
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

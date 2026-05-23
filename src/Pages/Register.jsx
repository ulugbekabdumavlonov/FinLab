import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import {
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [show, setShow] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleRegister =
    async () => {
      if (
        !name ||
        !email ||
        !password
      ) {
        return alert(
          "Заполните поля"
        );
      }

      try {
        setLoading(true);

        const user =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        await updateProfile(
          user.user,
          {
            displayName: name,
          }
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
        minHeight: "100vh",
        background:
          "#050816",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        padding:
          "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* GLOW */}
      <div
        style={{
          position: "absolute",
          top: -150,
          left: -150,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "rgba(99,102,241,.2)",
          filter: "blur(120px)",
        }}
      />

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        style={{
          width: "100%",
          maxWidth: 1050,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(320px,1fr))",
          background:
            "rgba(255,255,255,.03)",
          border:
            "1px solid rgba(255,255,255,.06)",
          borderRadius: 36,
          overflow: "hidden",
          backdropFilter:
            "blur(20px)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,.45)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* LEFT */}
        <div
          style={{
            padding:
              "70px 50px",
            background:
              "linear-gradient(135deg,#111827,#1e1b4b)",
            position: "relative",
          }}
        >
          <div
            style={{
              position:
                "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right,rgba(99,102,241,.25),transparent 40%)",
            }}
          />

          <div
            style={{
              position:
                "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display:
                  "inline-block",
                padding:
                  "10px 16px",
                borderRadius:
                  999,
                background:
                  "rgba(255,255,255,.06)",
                border:
                  "1px solid rgba(255,255,255,.08)",
                color:
                  "rgba(255,255,255,.6)",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 26,
              }}
            >
              FINLAB AI
            </div>

            <h1
              style={{
                fontSize:
                  "clamp(42px,6vw,70px)",
                lineHeight: 0.95,
                fontWeight: 900,
                letterSpacing:
                  "-.06em",
                color: "#fff",
                marginBottom: 22,
              }}
            >
              Финансы
              <br />
              без хаоса
            </h1>

            <p
              style={{
                color:
                  "rgba(255,255,255,.45)",
                lineHeight: 1.8,
                maxWidth: 420,
                fontSize: 16,
              }}
            >
              ДДС, P&L,
              бюджеты и
              аналитика в
              одной системе.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div
          style={{
            padding:
              "70px 50px",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            background:
              "rgba(255,255,255,.02)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
            }}
          >
            <h2
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 10,
                letterSpacing:
                  "-.05em",
              }}
            >
              Регистрация
            </h2>

            <p
              style={{
                color:
                  "rgba(255,255,255,.4)",
                marginBottom: 32,
                lineHeight: 1.7,
              }}
            >
              Создай аккаунт
              и начни
              бесплатно
            </p>

            {/* INPUTS */}
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 16,
              }}
            >
              {[{
                value: name,
                set: setName,
                placeholder:
                  "Имя",
              },{
                value: email,
                set: setEmail,
                placeholder:
                  "Email",
              }].map(
                (
                  item,
                  i
                ) => (
                  <input
                    key={i}
                    value={
                      item.value
                    }
                    placeholder={
                      item.placeholder
                    }
                    onChange={(
                      e
                    ) =>
                      item.set(
                        e
                          .target
                          .value
                      )
                    }
                    style={{
                      padding:
                        "18px",
                      borderRadius:
                        18,
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      background:
                        "rgba(255,255,255,.04)",
                      color:
                        "#fff",
                      outline:
                        "none",
                      fontSize: 15,
                    }}
                  />
                )
              )}

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
                  value={
                    password
                  }
                  onChange={(
                    e
                  ) =>
                    setPassword(
                      e
                        .target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "18px",
                    borderRadius:
                      18,
                    border:
                      "1px solid rgba(255,255,255,.08)",
                    background:
                      "rgba(255,255,255,.04)",
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
                    border:
                      "none",
                    background:
                      "transparent",
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
                }}
                whileTap={{
                  scale: 0.98,
                }}
                disabled={
                  loading
                }
                onClick={
                  handleRegister
                }
                style={{
                  marginTop: 8,
                  padding:
                    "18px 20px",
                  borderRadius:
                    18,
                  border:
                    "none",
                  cursor:
                    "pointer",
                  background:
                    "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color:
                    "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: 10,
                  boxShadow:
                    "0 10px 30px rgba(99,102,241,.25)",
                }}
              >
                {loading
                  ? "Создание..."
                  : "Создать аккаунт"}

                {!loading && (
                  <ArrowRight
                    size={18}
                  />
                )}
              </motion.button>

              {/* LOGIN */}
              <p
                style={{
                  textAlign:
                    "center",
                  color:
                    "rgba(255,255,255,.4)",
                  fontSize: 14,
                  marginTop: 6,
                }}
              >
                Уже есть
                аккаунт?{" "}
                <span
                  onClick={() =>
                    navigate(
                      "/login"
                    )
                  }
                  style={{
                    color:
                      "#818cf8",
                    cursor:
                      "pointer",
                    fontWeight: 600,
                  }}
                >
                  Войти
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

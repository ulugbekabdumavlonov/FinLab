import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../../Services/firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("Заполните поля");
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/app");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <style>{`
        .auth-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .auth-left {
          display: block;
          padding: 70px 50px;
          background: linear-gradient(135deg, #111827, #1e1b4b);
          position: relative;
        }
        @media (max-width: 640px) {
          .auth-left { display: none; }
          .auth-grid { grid-template-columns: 1fr; }
          .auth-right-inner { padding: 40px 24px !important; }
        }
        .auth-input {
          width: 100%;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.04);
          color: #fff;
          outline: none;
          font-size: 15px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .auth-input:focus {
          border-color: rgba(99,102,241,.5);
        }
        .auth-input::placeholder { color: rgba(255,255,255,.3); }
        .mobile-logo { display: none; }
        @media(max-width:640px){ .mobile-logo { display: block !important; } }
      `}</style>

      <section
        style={{
          minHeight: "100vh",
          background: "#050816",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* GLOW */}
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(99,102,241,.18)",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="auth-grid"
          style={{
            width: "100%",
            maxWidth: 1000,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: 36,
            overflow: "hidden",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.45)",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* LEFT — скрывается на мобильном через CSS */}
          <div className="auth-left">
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top right,rgba(99,102,241,.25),transparent 40%)",
              }}
            />
            <div style={{ position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.08)",
                  color: "rgba(255,255,255,.6)",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 26,
                }}
              >
                FINLAB
              </div>
              <h1
                style={{
                  fontSize: "clamp(42px,6vw,68px)",
                  lineHeight: 0.95,
                  fontWeight: 900,
                  letterSpacing: "-.06em",
                  color: "#fff",
                  marginBottom: 20,
                }}
              >
                Добро
                <br />
                пожаловать
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,.45)",
                  lineHeight: 1.8,
                  maxWidth: 400,
                  fontSize: 16,
                }}
              >
                Управляйте финансами, cashflow и аналитикой бизнеса в одном месте.
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,.02)",
            }}
          >
            <div
              className="auth-right-inner"
              style={{ width: "100%", maxWidth: 380, padding: "70px 50px" }}
            >
              {/* Логотип только на мобильном */}
              <div className="mobile-logo" style={{ marginBottom: 20 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(99,102,241,.15)",
                    border: "1px solid rgba(99,102,241,.3)",
                    color: "#818cf8",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  FINLAB
                </span>
              </div>

              <h2
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: 10,
                  letterSpacing: "-.05em",
                }}
              >
                Вход
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,.4)",
                  marginBottom: 32,
                }}
              >
                Введите данные аккаунта
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input
                  className="auth-input"
                  placeholder="Email"
                  onChange={(e) => setEmail(e.target.value)}
                />

                {/* PASSWORD */}
                <div style={{ position: "relative" }}>
                  <input
                    className="auth-input"
                    type={show ? "text" : "password"}
                    placeholder="Пароль"
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 52 }}
                  />
                  <button
                    onClick={() => setShow(!show)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: 18,
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "rgba(255,255,255,.45)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* LOGIN BTN */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    marginTop: 6,
                    padding: "18px 20px",
                    borderRadius: 18,
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 10px 30px rgba(99,102,241,.25)",
                    width: "100%",
                  }}
                >
                  {loading ? "Вход..." : "Войти"}
                  {!loading && <ArrowRight size={18} />}
                </motion.button>

                {/* GOOGLE */}
                <button
                  onClick={handleGoogle}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.03)",
                    color: "rgba(255,255,255,.85)",
                    fontWeight: 600,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <FcGoogle size={20} />
                  Войти через Google
                </button>

                {/* FOOTER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 4,
                    fontSize: 14,
                    color: "rgba(255,255,255,.4)",
                  }}
                >
                  <span style={{ cursor: "pointer" }}>Забыли пароль?</span>
                  <span
                    onClick={() => navigate("/register")}
                    style={{ color: "#818cf8", cursor: "pointer", fontWeight: 600 }}
                  >
                    Регистрация
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}

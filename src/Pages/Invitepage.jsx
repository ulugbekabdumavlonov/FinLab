import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState("loading");
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    async function init() {
      try { await signOut(auth); } catch {}
      try {
        const snap = await getDoc(doc(db, "invites", token));
        if (!snap.exists()) return setStatus("error");
        const data = snap.data();
        if (data.status === "accepted") return setStatus("used");
        if (data.status === "revoked")  return setStatus("error");
        if (new Date(data.expiresAt) < new Date()) return setStatus("expired");
        setInvite(data);
        setStatus("valid");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    }
    init();
  }, [token]);

  async function handleRegister() {
    if (!form.firstName || !form.lastName) return setErr("Введите имя и фамилию");
    if (form.password.length < 8) return setErr("Пароль минимум 8 символов");
    if (form.password !== form.confirm) return setErr("Пароли не совпадают");

    setSaving(true); setErr(null);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, invite.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        firstName:   form.firstName,
        lastName:    form.lastName,
        email:       invite.email,
        companyId:   invite.companyId,
        userRole:    "employee",
        permissions: invite.permissions || {},
        createdAt:   new Date().toISOString(),
      });
      await updateDoc(doc(db, "invites", token), {
        status:     "accepted",
        acceptedAt: new Date().toISOString(),
        userId:     user.uid,
      });
      navigate("/app");
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }

  if (status === "loading") return (
    <Screen>
      <div style={styles.card}>
        <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={styles.spinner} />
          <p style={{ marginTop: 16, fontSize: 13, color: "#64748B" }}>Проверяем ссылку…</p>
        </div>
      </div>
    </Screen>
  );

  if (status === "used") return (
    <Screen><StateCard icon="✅" color="#059669" bg="#D1FAE5"
      title="Ссылка уже использована"
      desc="Этот инвайт уже был принят."
      action={{ label: "Войти в аккаунт", onClick: () => navigate("/login") }}
    /></Screen>
  );

  if (status === "expired") return (
    <Screen><StateCard icon="⏰" color="#D97706" bg="#FEF3C7"
      title="Ссылка истекла"
      desc="Попросите владельца выслать новое приглашение."
    /></Screen>
  );

  if (status === "error") return (
    <Screen><StateCard icon="❌" color="#DC2626" bg="#FEF2F2"
      title="Ссылка недействительна"
      desc="Приглашение не найдено или отозвано."
    /></Screen>
  );

  const initials = (invite.companyName || "C")[0].toUpperCase();

  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Карточка */}
        <div style={styles.card}>

          {/* Шапка */}
          <div style={styles.cardTop}>
            <div style={styles.badge}>
              <span>✉️</span> Приглашение в команду
            </div>
            <div style={styles.avatar}>{initials}</div>
            <h1 style={styles.h1}>Вас приглашают в {invite.companyName || "компанию"}</h1>
            <p style={styles.sub}>Регистрация для <b style={{ color: "#0F172A" }}>{invite.email}</b></p>

            {/* Шаги */}
            <div style={styles.steps}>
              <Step label="Аккаунт" active />
              <div style={styles.stepLine} />
              <Step label="Профиль" />
              <div style={styles.stepLine} />
              <Step label="Готово" />
            </div>
          </div>

          {/* Форма */}
          <div style={styles.cardBody}>
            <div style={styles.grid2}>
              <Field label="Имя">
                <Inp placeholder="Алексей" value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Фамилия">
                <Inp placeholder="Иванов" value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </Field>
            </div>

            <Field label="Email" style={{ marginBottom: 16 }}>
              <Inp value={invite.email} disabled
                style={{ background: "#F8FAFC", color: "#94A3B8" }} />
            </Field>

            <div style={styles.divider} />

            <Field label="Пароль" style={{ marginBottom: 12 }}>
              <div style={{ position: "relative" }}>
                <Inp type={showPass ? "text" : "password"}
                  placeholder="Минимум 8 символов"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <button onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </Field>

            <Field label="Подтвердите пароль" style={{ marginBottom: 20 }}>
              <Inp type="password" placeholder="Повторите пароль"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })} />
            </Field>

            {err && (
              <div style={styles.errBox}>
                <span>⚠️</span> {err}
              </div>
            )}

            <button onClick={handleRegister} disabled={saving} style={{
              ...styles.btn,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "Создание аккаунта…" : "Создать аккаунт →"}
            </button>

            <p style={styles.footer}>
              Уже есть аккаунт?{" "}
              <span onClick={() => navigate("/login")}
                style={{ color: "#2563EB", cursor: "pointer" }}>
                Войти
              </span>
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ── Вспомогательные компоненты ──────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F1F5F9",
      padding: "1rem", fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      {children}
    </div>
  );
}

function StateCard({ icon, color, bg, title, desc, action }) {
  const navigate = useNavigate();
  return (
    <div style={{ ...styles.card, maxWidth: 400, textAlign: "center", padding: "2.5rem 2rem" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 1.25rem" }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: action ? 20 : 0 }}>{desc}</p>
      {action && (
        <button onClick={action.onClick} style={{ ...styles.btn, marginTop: 0 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function Step({ label, active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5,
      color: active ? "#2563EB" : "#94A3B8", fontWeight: active ? 500 : 400 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%",
        background: active ? "#2563EB" : "#CBD5E1" }} />
      {label}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11.5, fontWeight: 500, color: "#64748B",
        display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function Inp({ style, ...props }) {
  return (
    <input
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5,
        padding: "9px 12px", width: "100%", border: "1px solid #E2E8F0",
        borderRadius: 9, background: "#fff", color: "#0F172A",
        outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s", ...style }}
      onFocus={e => { e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
      {...props}
    />
  );
}

// ── Стили ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 18,
    width: "100%",
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  cardTop: {
    background: "#F8FAFC",
    padding: "2rem 2rem 1.5rem",
    borderBottom: "1px solid #E2E8F0",
    textAlign: "center",
  },
  cardBody: {
    padding: "1.5rem 2rem 2rem",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#EFF6FF", color: "#2563EB",
    fontSize: 12, fontWeight: 500,
    padding: "5px 13px", borderRadius: 20,
    marginBottom: "1.25rem",
  },
  avatar: {
    width: 52, height: 52, borderRadius: "50%",
    background: "#2563EB", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, fontWeight: 600, margin: "0 auto 1rem",
  },
  h1: { fontSize: 18, fontWeight: 600, color: "#0F172A", margin: 0, marginBottom: 6 },
  sub: { fontSize: 13, color: "#64748B", margin: 0 },
  steps: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "1.25rem" },
  stepLine: { width: 24, height: 1, background: "#E2E8F0" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  divider: { border: "none", borderTop: "1px solid #F1F5F9", margin: "1.25rem 0" },
  errBox: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 12.5, color: "#DC2626",
    background: "#FEF2F2", border: "1px solid #FECACA",
    padding: "9px 13px", borderRadius: 8, marginBottom: 14,
  },
  btn: {
    width: "100%", padding: "11px",
    background: "#2563EB", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    marginTop: 4,
  },
  footer: { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 14 },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%",
    transform: "translateY(-50%)",
    background: "none", border: "none",
    cursor: "pointer", fontSize: 14, padding: 2,
  },
  spinner: {
    width: 32, height: 32, border: "3px solid #E2E8F0",
    borderTopColor: "#2563EB", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
};

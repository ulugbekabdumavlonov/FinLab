// InviteAcceptPage.jsx
// Публичная страница — доступна без авторизации
// Маршрут: /invite/:inviteId
//
// Флоу:
// 1. Загружает данные инвайта (компания, права)
// 2. Если не залогинен → показывает форму Register/Login
// 3. После авторизации → автоматически принимает инвайт
// 4. Редирект в /app

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../firebase";

const ALL_PERMISSIONS = [
  { key: "cashflow",           label: "Cash Flow"             },
  { key: "pl",                 label: "P&L"                   },
  { key: "reports",            label: "Дашборд"               },
  { key: "transactions",       label: "Транзакции (просмотр)" },
  { key: "transactions_write", label: "Транзакции (запись)"   },
  { key: "accounts",           label: "Счета (просмотр)"      },
  { key: "accounts_write",     label: "Счета (запись)"        },
  { key: "categories",         label: "Категории (просмотр)"  },
  { key: "categories_write",   label: "Категории (запись)"    },
];

// Минимальные права по умолчанию для нового участника
const DEFAULT_PERMISSIONS = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p.key, false])
);

const C = {
  ink:        "#111827",
  inkMid:     "#374151",
  inkLight:   "#9ca3af",
  surface:    "#ffffff",
  surfaceAlt: "#f9fafb",
  border:     "#e5e7eb",
  borderMid:  "#d1d5db",
  pos:        "#15803d",
  posBg:      "#f0fdf4",
  neg:        "#b91c1c",
  negBg:      "#fef2f2",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
};

export default function InviteAcceptPage() {
  const { inviteId } = useParams();
  const navigate     = useNavigate();

  const [invite,     setInvite]     = useState(null);
  const [loadingInv, setLoadingInv] = useState(true);
  const [invError,   setInvError]   = useState("");

  const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
  const [authMode,    setAuthMode]    = useState("register"); // "register" | "login"

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [authErr,  setAuthErr]  = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [done,      setDone]      = useState(false);

  // ── Watch auth state ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsub;
  }, []);

  // ── Load invite ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inviteId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "invites", inviteId));
        if (!snap.exists()) { setInvError("Приглашение не найдено или уже недействительно."); return; }
        const data = snap.data();
        if (data.status === "accepted") { setInvError("Это приглашение уже было принято."); return; }
        if (data.status === "cancelled") { setInvError("Это приглашение было отменено."); return; }
        setInvite({ id: snap.id, ...data });
        // Pre-fill email if invite has it
        if (data.email) setEmail(data.email);
      } catch (e) {
        setInvError("Ошибка загрузки приглашения.");
      } finally {
        setLoadingInv(false);
      }
    })();
  }, [inviteId]);

  // ── Accept invite (called after user is confirmed logged in) ──────────────
  const acceptInvite = async (user) => {
    if (!invite) return;
    setAccepting(true);
    try {
      // Add member to owner's team with default (minimal) permissions
      await setDoc(
        doc(db, "users", invite.ownerUid, "team", user.uid),
        {
          email:       user.email,
          displayName: user.displayName || name || user.email.split("@")[0],
          role:        "viewer",
          permissions: DEFAULT_PERMISSIONS, // владелец сам откроет нужные права
          joinedAt:    serverTimestamp(),
          inviteId,
        }
      );

      // Mark invite accepted
      await updateDoc(doc(db, "invites", inviteId), {
        status:     "accepted",
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp(),
      });

      // Save owner reference in new user's profile
      await setDoc(
        doc(db, "users", user.uid, "access", invite.ownerUid),
        {
          ownerUid:    invite.ownerUid,
          companyName: invite.companyName || "",
          role:        "viewer",
          joinedAt:    serverTimestamp(),
        }
      );

      setDone(true);
      setTimeout(() => navigate("/app"), 2500);
    } catch (e) {
      setAuthErr("Ошибка при принятии приглашения: " + e.message);
    } finally {
      setAccepting(false);
    }
  };

  // ── Auto-accept if already logged in ──────────────────────────────────────
  useEffect(() => {
    if (currentUser && invite && !done && !accepting) {
      acceptInvite(currentUser);
    }
  }, [currentUser, invite]);

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!name.trim())             { setAuthErr("Введите имя");           return; }
    if (!email.includes("@"))     { setAuthErr("Некорректный email");    return; }
    if (password.length < 6)      { setAuthErr("Минимум 6 символов");    return; }
    setAuthBusy(true); setAuthErr("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // acceptInvite вызовется автоматически через useEffect выше
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Этот email уже зарегистрирован. Войдите в аккаунт.",
        "auth/weak-password":        "Слишком простой пароль.",
        "auth/invalid-email":        "Некорректный email.",
      };
      setAuthErr(msgs[e.code] || e.message);
      if (e.code === "auth/email-already-in-use") setAuthMode("login");
    } finally {
      setAuthBusy(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.includes("@"))  { setAuthErr("Некорректный email"); return; }
    if (!password)             { setAuthErr("Введите пароль");     return; }
    setAuthBusy(true); setAuthErr("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const msgs = {
        "auth/user-not-found":   "Пользователь не найден.",
        "auth/wrong-password":   "Неверный пароль.",
        "auth/invalid-email":    "Некорректный email.",
        "auth/invalid-credential": "Неверный email или пароль.",
      };
      setAuthErr(msgs[e.code] || e.message);
    } finally {
      setAuthBusy(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const wrap = {
    minHeight: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #eff6ff 0%, #f9fafb 60%, #f0fdf4 100%)",
    padding: "24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const card = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: "32px",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
  };

  const input = {
    width: "100%", boxSizing: "border-box",
    fontFamily: "inherit", fontSize: 14, padding: "10px 12px",
    border: `1px solid ${C.borderMid}`, borderRadius: 7,
    outline: "none", color: C.ink, background: C.surface,
    marginBottom: 10,
  };

  const btn = (bg) => ({
    width: "100%", fontFamily: "inherit", fontSize: 14, padding: "11px 0",
    borderRadius: 7, border: "none", background: bg,
    color: "#fff", cursor: "pointer", fontWeight: 600,
    opacity: authBusy ? 0.7 : 1,
  });

  // ── Loading invite ─────────────────────────────────────────────────────────
  if (loadingInv || currentUser === undefined) {
    return (
      <div style={wrap}>
        <div style={{ color: C.inkLight, fontSize: 14 }}>Загрузка…</div>
      </div>
    );
  }

  // ── Invite error ───────────────────────────────────────────────────────────
  if (invError) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Ошибка</div>
          <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 20 }}>{invError}</div>
          <button onClick={() => navigate("/")} style={{ ...btn(C.accent), width: "auto", padding: "9px 24px" }}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.pos, marginBottom: 8 }}>
            Добро пожаловать!
          </div>
          <div style={{ fontSize: 14, color: C.inkMid }}>
            Вы успешно подключились к <strong>{invite?.companyName}</strong>.<br />
            Перенаправляем в приложение…
          </div>
        </div>
      </div>
    );
  }

  // ── Accepting (logged in, waiting) ─────────────────────────────────────────
  if (accepting || (currentUser && !done)) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 15, color: C.inkMid }}>Подключаемся к {invite?.companyName}…</div>
        </div>
      </div>
    );
  }

  // ── Auth form (not logged in) ──────────────────────────────────────────────
  const activePerms = ALL_PERMISSIONS.filter((p) => invite?.permissions?.[p.key]);

  return (
    <div style={wrap}>
      <div style={card}>

        {/* Company info */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 12px",
            background: C.accentBg, border: `1px solid ${C.accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: C.accent,
          }}>
            {(invite?.companyName || "C")[0].toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: C.inkLight, marginBottom: 4 }}>Вас пригласили в</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{invite?.companyName || "компанию"}</div>
        </div>

        {/* Permissions preview */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkLight, marginBottom: 8 }}>
            Начальный доступ
          </div>
          <div style={{ fontSize: 13, color: C.inkMid }}>
            После подключения владелец настроит ваши права. Пока будет минимальный доступ.
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: 3 }}>
          {[["register","Регистрация"], ["login","Войти"]].map(([mode, lbl]) => (
            <button key={mode} onClick={() => { setAuthMode(mode); setAuthErr(""); }} style={{
              flex: 1, fontFamily: "inherit", fontSize: 13, padding: "7px 0",
              borderRadius: 5, border: "none",
              background: authMode === mode ? C.accent : "transparent",
              color: authMode === mode ? "#fff" : C.inkMid,
              cursor: "pointer", fontWeight: authMode === mode ? 600 : 400,
              transition: "all 0.15s",
            }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Register form */}
        {authMode === "register" && (
          <div>
            <input
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
            <input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              style={{ ...input, marginBottom: 0 }}
            />
            {authErr && <div style={{ fontSize: 12, color: C.neg, margin: "8px 0" }}>{authErr}</div>}
            <button
              onClick={handleRegister}
              disabled={authBusy}
              style={{ ...btn(C.accent), marginTop: 14 }}
            >
              {authBusy ? "Создаём аккаунт…" : "Создать аккаунт и войти"}
            </button>
          </div>
        )}

        {/* Login form */}
        {authMode === "login" && (
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ ...input, marginBottom: 0 }}
            />
            {authErr && <div style={{ fontSize: 12, color: C.neg, margin: "8px 0" }}>{authErr}</div>}
            <button
              onClick={handleLogin}
              disabled={authBusy}
              style={{ ...btn(C.accent), marginTop: 14 }}
            >
              {authBusy ? "Входим…" : "Войти и подключиться"}
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.inkLight }}>
          Нажимая кнопку, вы соглашаетесь с условиями использования
        </div>
      </div>
    </div>
  );
}

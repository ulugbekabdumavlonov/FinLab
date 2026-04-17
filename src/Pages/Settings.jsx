import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

// ─── Firestore helpers ────────────────────────────────────────────────────────
const userRef = () => doc(db, "users", auth.currentUser?.uid);

// Простой in-memory кэш — данные грузятся один раз
let _cache = null;
let _cachePromise = null;

async function loadUserData() {
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = getDoc(userRef()).then(snap => {
    _cache = snap.exists() ? snap.data() : {};
    _cachePromise = null;
    return _cache;
  });
  return _cachePromise;
}

async function saveUserData(data) {
  await setDoc(userRef(), data, { merge: true });
  // Обновляем кэш после сохранения
  _cache = _cache ? { ..._cache, ...data } : data;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  page:     { maxWidth: 700, padding: "2rem 1rem", fontFamily: "'DM Sans', -apple-system, sans-serif", color: "#0F172A" },
  h1:       { fontSize: 22, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 3 },
  secLabel: { fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 8 },
  section:  { marginBottom: "1.75rem" },
  card:     { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" },
  cardBody: { padding: "1.4rem" },
  g2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginBottom: "0.9rem" },
  g1:       { marginBottom: "0.9rem" },
  divider:  { border: "none", borderTop: "1px solid #E2E8F0", margin: "1.2rem 0" },
  saveRow:  { display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: "1.2rem", borderTop: "1px solid #E2E8F0", marginTop: "1.2rem" },
  hint:     { fontSize: 11, color: "#94A3B8", marginTop: 3 },
  label:    { fontSize: 11.5, fontWeight: 500, color: "#64748B", display: "block", marginBottom: 4 },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const skeletonKeyframes = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

function Skeleton({ width = "100%", height = 36, style = {} }) {
  return (
    <>
      <style>{skeletonKeyframes}</style>
      <div
        style={{
          width,
          height,
          borderRadius: 9,
          background: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)",
          backgroundSize: "800px 100%",
          animation: "shimmer 1.4s infinite linear",
          ...style,
        }}
      />
    </>
  );
}

function SectionSkeleton() {
  return (
    <div style={s.section}>
      <Skeleton width={80} height={12} style={{ marginBottom: 10, borderRadius: 4 }} />
      <div style={s.card}>
        <div style={s.cardBody}>
          <div style={s.g2}>
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
          <Skeleton height={36} style={{ marginBottom: "0.9rem" }} />
          <div style={s.g2}>
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: "1.2rem", borderTop: "1px solid #E2E8F0", marginTop: "1.2rem" }}>
            <Skeleton width={90} height={34} />
            <Skeleton width={110} height={34} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Lbl({ children }) {
  return <label style={s.label}>{children}</label>;
}
function Hint({ children }) {
  return <p style={s.hint}>{children}</p>;
}
function Divider() {
  return <hr style={s.divider} />;
}

function Inp({ style, ...props }) {
  return (
    <input
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13.5,
        padding: "9px 12px",
        width: "100%",
        border: "1px solid #CBD5E1",
        borderRadius: 9,
        background: "#fff",
        color: "#0F172A",
        outline: "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = "#2563EB"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = "#CBD5E1"; e.target.style.boxShadow = "none"; }}
      {...props}
    />
  );
}

function BtnGhost({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: "8px 18px", borderRadius: 9, cursor: "pointer", fontWeight: 500, background: "transparent", color: "#64748B", border: "1px solid #CBD5E1", transition: "background 0.15s" }}
      onMouseEnter={e => e.target.style.background = "#F1F5F9"}
      onMouseLeave={e => e.target.style.background = "transparent"}
    >
      {children}
    </button>
  );
}

function BtnPrimary({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: "8px 18px", borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 500, background: "#2563EB", color: "#fff", border: "none", opacity: disabled ? 0.7 : 1, transition: "background 0.15s" }}
      onMouseEnter={e => { if (!disabled) e.target.style.background = "#1D4ED8"; }}
      onMouseLeave={e => e.target.style.background = "#2563EB"}
    >
      {children}
    </button>
  );
}

function SaveRow({ onSave, loading, status, saveLabel = "Сохранить" }) {
  return (
    <div>
      <div style={s.saveRow}>
        <BtnGhost>Сбросить</BtnGhost>
        <BtnPrimary onClick={onSave} disabled={loading}>
          {loading ? "Сохранение…" : status?.type === "success" ? "Сохранено ✓" : saveLabel}
        </BtnPrimary>
      </div>
      {status && (
        <p style={{ fontSize: 12, marginTop: 8, color: status.type === "error" ? "#DC2626" : "#059669", background: status.type === "error" ? "#FEF2F2" : "#D1FAE5", padding: "6px 12px", borderRadius: 6 }}>
          {status.message}
        </p>
      )}
    </div>
  );
}

// ─── Custom Select ────────────────────────────────────────────────────────────
function CustomSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }} onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <div
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, padding: "9px 36px 9px 12px", border: `1px solid ${open ? "#2563EB" : "#CBD5E1"}`, borderRadius: 9, background: "#fff", color: "#0F172A", cursor: "pointer", userSelect: "none", boxShadow: open ? "0 0 0 3px rgba(37,99,235,0.1)" : "none", transition: "border-color 0.15s", position: "relative" }}
      >
        {value}
        <span style={{ position: "absolute", right: 10, top: "50%", transform: `translateY(-50%) rotate(${open ? "180deg" : "0deg"})`, color: "#94A3B8", fontSize: 11, transition: "transform 0.2s", pointerEvents: "none" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#0F172A", background: opt === value ? "#EFF6FF" : "transparent", fontWeight: opt === value ? 500 : 400 }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = "#F8FAFC"; }}
              onMouseLeave={e => { e.currentTarget.style.background = opt === value ? "#EFF6FF" : "transparent"; }}
            >
              {opt}
              {opt === value && <span style={{ fontSize: 12, color: "#2563EB" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Password Input ───────────────────────────────────────────────────────────
function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Inp type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} style={{ paddingRight: 38 }} />
      <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 13, padding: 2 }}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 38, height: 21, borderRadius: 11, background: on ? "#2563EB" : "#CBD5E1", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2.5, left: on ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function ToggleRow({ label, desc, on, onChange, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 0", borderBottom: last ? "none" : "1px solid #E2E8F0", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ─── Currency Pills ───────────────────────────────────────────────────────────
const CURRENCIES = [
  { symbol: "$",    code: "USD", name: "US Dollar" },
  { symbol: "€",    code: "EUR", name: "Euro" },
  { symbol: "£",    code: "GBP", name: "British Pound" },
  { symbol: "¥",    code: "JPY", name: "Japanese Yen" },
  { symbol: "₸",    code: "KZT", name: "Kazakhstani Tenge" },
  { symbol: "so'm", code: "UZS", name: "Uzbek Som" },
];

function CurrencyPills({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {CURRENCIES.map(c => (
        <div
          key={c.code}
          onClick={() => onChange(c.code)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", border: `1px solid ${value === c.code ? "#2563EB" : "#CBD5E1"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, background: value === c.code ? "#EFF6FF" : "transparent", color: value === c.code ? "#2563EB" : "#0F172A", fontWeight: value === c.code ? 500 : 400, transition: "all 0.15s" }}
        >
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: c.symbol.length > 2 ? 11 : 13, fontWeight: 600 }}>{c.symbol}</span>
          <span>{c.code}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileSection({ data }) {
  const [form, setForm] = useState({
    firstName: data.firstName || "",
    lastName:  data.lastName  || "",
    email:     data.email     || auth.currentUser?.email || "",
    role:      data.role      || "",
    phone:     data.phone     || "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);

  const handleSave = async () => {
    setLoading(true); setStatus(null);
    try {
      if (form.email !== auth.currentUser.email) await updateEmail(auth.currentUser, form.email);
      await saveUserData({ firstName: form.firstName, lastName: form.lastName, email: form.email, role: form.role, phone: form.phone });
      setStatus({ type: "success", message: "Профиль сохранён." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally { setLoading(false); }
  };

  const initials = ((form.firstName[0] || "") + (form.lastName[0] || "")).toUpperCase() || "??";
  const f = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Мой профиль</div>
      <div style={s.card}><div style={s.cardBody}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.4rem", paddingBottom: "1.4rem", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#2563EB", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{(form.firstName + " " + form.lastName).trim() || "Ваше имя"}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Владелец профиля</div>
          </div>
          <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: "6px 13px", border: "1px solid #E2E8F0", borderRadius: 8, background: "transparent", color: "#64748B", cursor: "pointer" }}>
            Изменить фото
          </button>
        </div>
        <div style={s.g2}>
          <div><Lbl>Имя</Lbl><Inp type="text" {...f("firstName")} /></div>
          <div><Lbl>Фамилия</Lbl><Inp type="text" {...f("lastName")} /></div>
        </div>
        <div style={s.g1}>
          <Lbl>Электронная почта</Lbl>
          <Inp type="email" {...f("email")} />
          <Hint>Используется для входа и рассылок</Hint>
        </div>
        <div style={s.g2}>
          <div><Lbl>Должность</Lbl><Inp type="text" {...f("role")} placeholder="Финансовый менеджер" /></div>
          <div><Lbl>Телефон</Lbl><Inp type="tel" {...f("phone")} placeholder="+998 90 000 00 00" /></div>
        </div>
        <SaveRow onSave={handleSave} loading={loading} status={status} />
      </div></div>
    </div>
  );
}

// ─── COMPANY ──────────────────────────────────────────────────────────────────
function BusinessSection({ data }) {
  const b = data.business || {};
  const [form, setForm] = useState({
    businessName:  b.businessName  || "",
    industry:      b.industry      || "IT",
    companySize:   b.companySize   || "11–50",
    businessEmail: b.businessEmail || "",
    taxId:         b.taxId         || "",
    address:       b.address       || "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);

  const handleSave = async () => {
    setLoading(true); setStatus(null);
    try { await saveUserData({ business: form }); setStatus({ type: "success", message: "Данные компании сохранены." }); }
    catch (err) { setStatus({ type: "error", message: err.message }); }
    finally { setLoading(false); }
  };

  const f = key => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Компания</div>
      <div style={s.card}><div style={s.cardBody}>
        <div style={s.g1}><Lbl>Название компании</Lbl><Inp type="text" {...f("businessName")} placeholder="Название вашей компании" /></div>
        <div style={s.g2}>
          <div><Lbl>Индустрия</Lbl><CustomSelect options={["IT","E-commerce","Финансы","Здравоохранение","Другое"]} value={form.industry} onChange={v => setForm({ ...form, industry: v })} /></div>
          <div><Lbl>Кол-во сотрудников</Lbl><CustomSelect options={["1–10","11–50","51–200","200+"]} value={form.companySize} onChange={v => setForm({ ...form, companySize: v })} /></div>
        </div>
        <div style={s.g2}>
          <div><Lbl>Почта компании</Lbl><Inp type="email" {...f("businessEmail")} placeholder="company@gmail.com" /></div>
          <div><Lbl>ИНН / НДС</Lbl><Inp type="text" {...f("taxId")} placeholder="UZ123456789" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5 }} /></div>
        </div>
        <div style={s.g1}><Lbl>Адрес</Lbl><Inp type="text" {...f("address")} placeholder="Улица, Город, Страна" /></div>
        <SaveRow onSave={handleSave} loading={loading} status={status} />
      </div></div>
    </div>
  );
}

// ─── SECURITY ─────────────────────────────────────────────────────────────────
function SecuritySection({ data }) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [totp, setTotp] = useState(data.twoFactor?.totp ?? true);
  const [sms,  setSms]  = useState(data.twoFactor?.sms  ?? false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);

  const handleSave = async () => {
    if (!currentPass) return setStatus({ type: "error", message: "Введите текущий пароль" });
    if (newPass !== confirmPass) return setStatus({ type: "error", message: "Новые пароли не совпадают" });
    if (newPass && newPass.length < 8) return setStatus({ type: "error", message: "Пароль должен быть не менее 8 символов" });
    setLoading(true); setStatus(null);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      if (newPass) await updatePassword(auth.currentUser, newPass);
      await saveUserData({ twoFactor: { totp, sms } });
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      setStatus({ type: "success", message: "Настройки безопасности сохранены" });
    } catch (err) { setStatus({ type: "error", message: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Безопасность</div>
      <div style={s.card}><div style={s.cardBody}>
        <div style={s.g1}><Lbl>Текущий пароль</Lbl><PasswordInput placeholder="Введите текущий пароль" value={currentPass} onChange={e => setCurrentPass(e.target.value)} /></div>
        <div style={s.g2}>
          <div><Lbl>Новый пароль</Lbl><PasswordInput placeholder="Мин. 8 символов" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
          <div><Lbl>Подтвердите пароль</Lbl><PasswordInput placeholder="Повторите пароль" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} /></div>
        </div>
        <Divider />
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: "0.75rem" }}>Двухфакторная аутентификация</div>
        <ToggleRow label="Authenticator app (TOTP)" desc="Google Authenticator или Authy" on={totp} onChange={setTotp} />
        <ToggleRow label="SMS подтверждение" desc="Получить код SMS сообщением" on={sms} onChange={setSms} last />
        <SaveRow onSave={handleSave} loading={loading} status={status} saveLabel="Поменять пароль" />
      </div></div>
    </div>
  );
}

// ─── CURRENCY & LOCALE ────────────────────────────────────────────────────────
function CurrencySection({ data }) {
  const l = data.locale || {};
  const [form, setForm] = useState({
    currency:     l.currency     || "USD",
    dateFormat:   l.dateFormat   || "DD/MM/YYYY",
    timezone:     l.timezone     || "UTC+5 — Ташкент",
    numberFormat: l.numberFormat || "1,000.00",
    fiscalYear:   l.fiscalYear   || "Январь",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);

  const handleSave = async () => {
    setLoading(true); setStatus(null);
    try { await saveUserData({ locale: form }); setStatus({ type: "success", message: "Изменения сохранены" }); }
    catch (err) { setStatus({ type: "error", message: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Валюта & Регион</div>
      <div style={s.card}><div style={s.cardBody}>
        <Lbl>Основная валюта</Lbl>
        <div style={{ marginBottom: "0.9rem" }}>
          <CurrencyPills value={form.currency} onChange={v => setForm({ ...form, currency: v })} />
        </div>
        <Divider />
        <div style={s.g2}>
          <div><Lbl>Формат даты</Lbl><CustomSelect options={["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"]} value={form.dateFormat} onChange={v => setForm({ ...form, dateFormat: v })} /></div>
          <div><Lbl>Часовой пояс</Lbl><CustomSelect options={["UTC+5 — Ташкент","UTC+0 — Лондон","UTC-5 — Нью-Йорк","UTC+3 — Москва"]} value={form.timezone} onChange={v => setForm({ ...form, timezone: v })} /></div>
        </div>
        <div style={s.g2}>
          <div><Lbl>Формат чисел</Lbl><CustomSelect options={["1,000.00","1.000,00","1 000,00"]} value={form.numberFormat} onChange={v => setForm({ ...form, numberFormat: v })} /></div>
          <div><Lbl>Начало фин. года</Lbl><CustomSelect options={["Январь","Апрель","Июль","Октябрь"]} value={form.fiscalYear} onChange={v => setForm({ ...form, fiscalYear: v })} /></div>
        </div>
        <SaveRow onSave={handleSave} loading={loading} status={status} />
      </div></div>
    </div>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function NotificationsSection({ data }) {
  const defaults = { invoicePaid: true, weeklySummary: true, failedPayment: true, newMember: false, productUpdates: false };
  const [notifs, setNotifs] = useState({ ...defaults, ...(data.notifications || {}) });

  const toggle = async key => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    await saveUserData({ notifications: updated });
  };

  const items = [
    { key: "invoicePaid",    label: "Подписка оплачена",   desc: "Оповещать при оплате подписки" },
    { key: "weeklySummary",  label: "Еженедельная сводка", desc: "Ключевые метрики по понедельникам" },
    { key: "failedPayment",  label: "Неудачные платежи",   desc: "Оповещать при сбое платежа" },
    { key: "newMember",      label: "Новый пользователь",  desc: "Принятие приглашения" },
    { key: "productUpdates", label: "Обновления продукта", desc: "Новые функции и улучшения" },
  ];

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Уведомления</div>
      <div style={s.card}><div style={s.cardBody}>
        {items.map(({ key, label, desc }, i) => (
          <ToggleRow key={key} label={label} desc={desc} on={notifs[key]} onChange={() => toggle(key)} last={i === items.length - 1} />
        ))}
      </div></div>
    </div>
  );
}

// ─── BILLING ──────────────────────────────────────────────────────────────────
function BillingSection({ data }) {
  const billing = { plan: "Pro", price: "1 200 000 UZS", renewal: "—", seats: "—", apiCalls: "—", storage: "—", ...(data.billing || {}) };

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Подписка</div>
      <div style={s.card}><div style={s.cardBody}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>
              {billing.plan} plan{" "}
              <span style={{ display: "inline-block", fontSize: 10.5, padding: "2px 9px", background: "#FEF3C7", color: "#92400E", borderRadius: 20, fontWeight: 500, marginLeft: 6, verticalAlign: "middle" }}>Active</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{billing.price} / месяц · Обновление {billing.renewal}</div>
          </div>
          <BtnGhost>Управлять</BtnGhost>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
          {[{ val: billing.seats, lbl: "Пользователей" }, { val: billing.apiCalls, lbl: "API запросов / мес" }, { val: billing.storage, lbl: "Хранилище" }].map(({ val, lbl }) => (
            <div key={lbl} style={{ background: "#F1F5F9", borderRadius: 10, padding: "0.85rem 1rem" }}>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.5 }}>{val}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div></div>
    </div>
  );
}

// ─── DANGER ───────────────────────────────────────────────────────────────────
function DangerSection() {
  const rows = [
    { title: "Экспорт всех данных",      desc: "Скачать архив данных",              btn: "Экспорт",   danger: false },
    { title: "Отменить подписку",         desc: "Данные сохранятся в течение 30 дней", btn: "Отключить", danger: true  },
    { title: "Удалить аккаунт полностью", desc: "Удалить все данные навсегда",       btn: "Удалить",   danger: true  },
  ];

  return (
    <div style={s.section}>
      <div style={s.secLabel}>Danger zone</div>
      <div style={{ ...s.card, border: "1px solid #FECACA" }}><div style={s.cardBody}>
        {rows.map(({ title, desc, btn, danger }, i) => (
          <div key={title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 0", borderBottom: i < rows.length - 1 ? "1px solid #E2E8F0" : "none", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: danger ? "#DC2626" : "#0F172A" }}>{title}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{desc}</div>
            </div>
            {danger
              ? <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: "6px 13px", border: "1px solid #FECACA", borderRadius: 8, background: "transparent", color: "#DC2626", cursor: "pointer" }}>{btn}</button>
              : <BtnGhost>{btn}</BtnGhost>
            }
          </div>
        ))}
      </div></div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const [userData, setUserData] = useState(null);
  const [error, setError]       = useState(null);

  useEffect(() => {
    // Один запрос для всей страницы
    loadUserData()
      .then(setUserData)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={s.page}>
        <p style={{ fontSize: 13, color: "#DC2626", background: "#FEF2F2", padding: "10px 14px", borderRadius: 8 }}>
          Ошибка загрузки: {error}
        </p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={s.h1}>Настройки</h1>
        <p style={s.subtitle}>Управляйте аккаунтом и рабочим пространством</p>
      </div>

      {/* Пока данные грузятся — показываем skeleton */}
      {!userData ? (
        <>
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </>
      ) : (
        <>
          <ProfileSection       data={userData} />
          <BusinessSection      data={userData} />
          <SecuritySection      data={userData} />
          <CurrencySection      data={userData} />
          <NotificationsSection data={userData} />
          <BillingSection       data={userData} />
          <DangerSection />
        </>
      )}
    </div>
  );
}

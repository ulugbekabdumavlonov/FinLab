import { useState, useEffect } from "react";
import { auth, db } from "../firebase"; // adjust path to your firebase config
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

// ─── Firestore helpers ────────────────────────────────────────────────────────
const userRef = () => doc(db, "users", auth.currentUser?.uid);

async function loadUserData() {
  const snap = await getDoc(userRef());
  return snap.exists() ? snap.data() : {};
}

async function saveUserData(data) {
  await setDoc(userRef(), data, { merge: true });
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth: 720,
    padding: "2rem 1rem",
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--color-text-primary, #111)",
  },
  pageTitle: { fontSize: 22, fontWeight: 500, letterSpacing: -0.5, margin: 0 },
  pageSubtitle: { fontSize: 14, color: "var(--color-text-secondary, #666)", marginTop: 4 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-tertiary, #999)",
    marginBottom: 10,
  },
  card: {
    background: "var(--color-background-primary, #fff)",
    border: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12))",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  cardBody: { padding: "1.5rem" },
  divider: {
    border: "none",
    borderTop: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))",
    margin: "1.5rem 0",
  },
  section: { marginBottom: "2rem" },
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary, #666)", display: "block", marginBottom: 5 }}>
      {children}
    </label>
  );
}

function Hint({ children }) {
  return <p style={{ fontSize: 11, color: "var(--color-text-tertiary, #999)", marginTop: 3 }}>{children}</p>;
}

function Input({ style, ...props }) {
  return (
    <input
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13.5,
        padding: "9px 12px",
        border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))",
        borderRadius: 8,
        background: "var(--color-background-primary, #fff)",
        color: "var(--color-text-primary, #111)",
        outline: "none",
        width: "100%",
        ...style,
      }}
      {...props}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13.5,
        padding: "9px 12px",
        border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))",
        borderRadius: 8,
        background: "var(--color-background-primary, #fff)",
        color: "var(--color-text-primary, #111)",
        outline: "none",
        width: "100%",
        cursor: "pointer",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

function FieldGrid({ children, full }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: full ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
      {children}
    </div>
  );
}

function FieldGroup({ label, hint, children }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

function StatusMessage({ status }) {
  if (!status) return null;
  const isError = status.type === "error";
  return (
    <p style={{
      fontSize: 12,
      marginTop: 8,
      color: isError ? "var(--color-text-danger, #c0392b)" : "#0F6E56",
      background: isError ? "var(--color-background-danger, #fdf0ef)" : "#E1F5EE",
      padding: "6px 12px",
      borderRadius: 6,
    }}>
      {status.message}
    </p>
  );
}

function SaveRow({ onSave, saveLabel = "Сохранить", loading, status }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: "1.25rem", borderTop: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))", marginTop: "1.25rem" }}>
        <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: "9px 16px", background: "transparent", color: "var(--color-text-secondary, #666)", border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))", borderRadius: 8, cursor: "pointer" }}>
          Сбросить
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, padding: "9px 22px", background: status?.type === "success" ? "#0F6E56" : "#1D9E75", color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.2s" }}
        >
          {loading ? "Сохранение…" : status?.type === "success" ? "Сохранено ✓" : saveLabel}
        </button>
      </div>
      <StatusMessage status={status} />
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#1D9E75" : "var(--color-border-secondary, rgba(0,0,0,0.2))", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

function ToggleRow({ label, desc, on, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 0", borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)", marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Input type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} style={{ paddingRight: 38 }} />
      <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary, #999)", fontSize: 13, padding: 2 }}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

function CurrencyOption({ symbol, code, name, selected, onSelect }) {
  return (
    <div onClick={onSelect} style={{ border: selected ? "1.5px solid #1D9E75" : "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))", borderRadius: 8, padding: "9px 11px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: selected ? "#E1F5EE" : "transparent", transition: "all 0.15s" }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: selected ? "#1D9E75" : "var(--color-text-secondary, #666)", width: 28, flexShrink: 0 }}>{symbol}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: selected ? "#0F6E56" : "var(--color-text-primary, #111)" }}>{code}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary, #999)" }}>{name}</div>
      </div>
    </div>
  );
}

const CURRENCIES = [
  { symbol: "$",    code: "USD", name: "US Dollar" },
  { symbol: "€",    code: "EUR", name: "Euro" },
  { symbol: "£",    code: "GBP", name: "British Pound" },
  { symbol: "¥",    code: "JPY", name: "Japanese Yen" },
  { symbol: "₸",    code: "KZT", name: "Kazakhstani Tenge" },
  { symbol: "so'm", code: "UZS", name: "Uzbek Som" },
];

// ─── PROFILE SECTION ──────────────────────────────────────────────────────────
function ProfileSection() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadUserData().then((data) => {
      setForm({
        firstName: data.firstName || "",
        lastName:  data.lastName  || "",
        email:     data.email     || auth.currentUser?.email || "",
        role:      data.role      || "",
        phone:     data.phone     || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // Update email in Firebase Auth if it changed
      if (form.email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, form.email);
      }
      await saveUserData({
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        role:      form.role,
        phone:     form.phone,
      });
      setStatus({ type: "success", message: "Profile saved successfully." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const initials = ((form.firstName[0] || "") + (form.lastName[0] || "")).toUpperCase() || "??";

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Мой профил</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 500, color: "#0F6E56", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{(form.firstName + " " + form.lastName).trim() || "Your name"}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)", marginTop: 2 }}>Владелец профиля</div>
            </div>
            <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, padding: "7px 14px", border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary, #666)", cursor: "pointer" }}>
              Изменить фото
            </button>
          </div>

          <FieldGrid>
            <FieldGroup label="Имя">
              <Input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Фамилия">
              <Input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </FieldGroup>
          </FieldGrid>
          <FieldGrid full>
            <FieldGroup label="Адрес электроной почты" hint="Используется для логина и рассылок">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FieldGroup>
          </FieldGrid>
          <FieldGrid>
            <FieldGroup label="Должность">
              <Input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Финансовый менеджер" />
            </FieldGroup>
            <FieldGroup label="Номер телефона">
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 000 00 00" />
            </FieldGroup>
          </FieldGrid>

          <SaveRow onSave={handleSave} loading={loading} status={status} />
        </div>
      </div>
    </div>
  );
}

// ─── BUSINESS SECTION ─────────────────────────────────────────────────────────
function BusinessSection() {
  const [form, setForm] = useState({ businessName: "", industry: "SaaS / Software", companySize: "11–50 employees", businessEmail: "", taxId: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadUserData().then((data) => {
      const b = data.business || {};
      setForm({
        businessName:  b.businessName  || "",
        industry:      b.industry      || "SaaS / Software",
        companySize:   b.companySize   || "11–50 employees",
        businessEmail: b.businessEmail || "",
        taxId:         b.taxId         || "",
        address:       b.address       || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await saveUserData({ business: form });
      setStatus({ type: "success", message: "Business info saved." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Компания</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          <FieldGrid full>
            <FieldGroup label="Business name">
              <Input type="text" {...f("businessName")} placeholder="Название вашей компании" />
            </FieldGroup>
          </FieldGrid>
          <FieldGrid>
            <FieldGroup label="Индустрия">
              <Select {...f("industry")}>
                {["IT", "E-commerce", "Финанси", "Здравохранение", "Другое"].map((o) => <option key={o}>{o}</option>)}
              </Select>
            </FieldGroup>
            <FieldGroup label="Кол-во сотрудников">
              <Select {...f("companySize")}>
                {["1–10 Сотрудников", "11–50 Сотрудников", "51–200 Сотрудников", "200+ Сотрудников"].map((o) => <option key={o}>{o}</option>)}
              </Select>
            </FieldGroup>
          </FieldGrid>
          <FieldGrid>
            <FieldGroup label="Почта компании">
              <Input type="email" {...f("businessEmail")} placeholder="FinLab@gmail.com" />
            </FieldGroup>
            <FieldGroup label="НДС плателщик">
              <Input type="text" {...f("taxId")} placeholder="e.g. UZ123456789" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5 }} />
            </FieldGroup>
          </FieldGrid>
          <FieldGrid full>
            <FieldGroup label="Адресс компании">
              <Input type="text" {...f("address")} placeholder="Улица, Город, Страна" />
            </FieldGroup>
          </FieldGrid>
          <SaveRow onSave={handleSave} loading={loading} status={status} />
        </div>
      </div>
    </div>
  );
}

// ─── SECURITY SECTION ─────────────────────────────────────────────────────────
function SecuritySection() {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [totp, setTotp] = useState(true);
  const [sms, setSms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadUserData().then((data) => {
      setTotp(data.twoFactor?.totp ?? true);
      setSms(data.twoFactor?.sms ?? false);
    });
  }, []);

  const handleSave = async () => {
    if (!currentPass) return setStatus({ type: "error", message: "Введите текущий пароль" });
    if (newPass !== confirmPass) return setStatus({ type: "error", message: "Новые пароли не совпадают" });
    if (newPass && newPass.length < 8) return setStatus({ type: "error", message: "Пароль должен быть не менее 8 символов" });

    setLoading(true);
    setStatus(null);
    try {
      // Re-authenticate before sensitive changes
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
      await reauthenticateWithCredential(auth.currentUser, credential);

      if (newPass) await updatePassword(auth.currentUser, newPass);

      await saveUserData({ twoFactor: { totp, sms } });

      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setStatus({ type: "success", message: "Настройки безопасности сохранены" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Безопасность</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          <FieldGrid full>
            <FieldGroup label="Текущий пароль">
              <PasswordInput placeholder="Введите текущий пароль" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
            </FieldGroup>
          </FieldGrid>
          <FieldGrid>
            <FieldGroup label="Новый пароль">
              <PasswordInput placeholder="Мин. 8 значение" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Подтвердите новый пароль">
              <PasswordInput placeholder="Повторите новый пароль" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
            </FieldGroup>
          </FieldGrid>

          <hr style={s.divider} />
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: "0.75rem" }}>Two-factor authentication</div>
          <ToggleRow label="Authenticator app (TOTP)" desc="Google Authenticator или Authy" on={totp} onChange={setTotp} />
          <ToggleRow label="SMS подтверждение код" desc="Получить код смс сообщением" on={sms} onChange={setSms} />

          <SaveRow onSave={handleSave} loading={loading} status={status} saveLabel="Поменять пароль" />
        </div>
      </div>
    </div>
  );
}

// ─── CURRENCY & LOCALE SECTION ────────────────────────────────────────────────
function CurrencySection() {
  const [form, setForm] = useState({ currency: "USD", dateFormat: "DD/MM/YYYY", timezone: "UTC+5", numberFormat: "dot", fiscalYear: "January" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadUserData().then((data) => {
      const l = data.locale || {};
      setForm({
        currency:     l.currency     || "USD",
        dateFormat:   l.dateFormat   || "DD/MM/YYYY",
        timezone:     l.timezone     || "UTC+5",
        numberFormat: l.numberFormat || "dot",
        fiscalYear:   l.fiscalYear   || "January",
      });
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await saveUserData({ locale: form });
      setStatus({ type: "success", message: "Изменения сохранены" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Валюта & Регион</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: "0.75rem" }}>Основная валюта</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
            {CURRENCIES.map((c) => (
              <CurrencyOption key={c.code} {...c} selected={form.currency === c.code} onSelect={() => setForm({ ...form, currency: c.code })} />
            ))}
          </div>

          <hr style={s.divider} />

          <FieldGrid>
            <FieldGroup label="Формат даты">
              <Select {...f("dateFormat")}>
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Часовой пояс">
              <Select {...f("timezone")}>
                <option value="UTC+5">UTC+5 — Ташкент</option>
                <option value="UTC+0">UTC+0 — Лондон</option>
                <option value="UTC-5">UTC-5 — Нью-Йорк</option>
                <option value="UTC+3">UTC+3 — Москва</option>
              </Select>
            </FieldGroup>
          </FieldGrid>
          <FieldGrid>
            <FieldGroup label="Формат чисел">
              <Select {...f("numberFormat")}>
                <option value="dot">1,000.00</option>
                <option value="comma">1.000,00</option>
                <option value="space">1 000,00</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Начало финансового года">
              <Select {...f("fiscalYear")}>
                {["Январь", "Апрель", "Июль", "Октябрь"].map((m) => <option key={m}>{m}</option>)}
              </Select>
            </FieldGroup>
          </FieldGrid>

          <SaveRow onSave={handleSave} loading={loading} status={status} saveLabel="Сохранить" />
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS SECTION ────────────────────────────────────────────────────
function NotificationsSection() {
  const defaults = { invoicePaid: true, weeklySummary: true, failedPayment: true, newMember: false, productUpdates: false };
  const [notifs, setNotifs] = useState(defaults);

  useEffect(() => {
    loadUserData().then((data) => {
      if (data.notifications) setNotifs({ ...defaults, ...data.notifications });
    });
  }, []);

  // Auto-save on every toggle
  const toggle = async (key) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    await saveUserData({ notifications: updated });
  };

  const items = [
    { key: "invoicePaid",    label: "Подписка оплачена",               desc: "Оповещать при оплате подписки" },
    { key: "weeklySummary",  label: "Еженедельная сводка",             desc: "Выручка, отток и ключевые метрики по понедельникам" },
    { key: "failedPayment",  label: "Уведомление о неудачных платежах",      desc: "Оповещать при неудачном платеже или просроченной карте" },
    { key: "newMember",      label: "Новый ползователь",      desc: "Подтверждение принятия приглашения" },
    { key: "productUpdates", label: "Обновления продукты и журнал изменения", desc: "Новые функции и улучшения" },
  ];

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Уведомления</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          {items.map(({ key, label, desc }) => (
            <ToggleRow key={key} label={label} desc={desc} on={notifs[key]} onChange={() => toggle(key)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BILLING SECTION (read-only, loaded from Firestore) ───────────────────────
function BillingSection() {
  const [billing, setBilling] = useState({ plan: "Pro", price: "1 200 000 UZS", renewal: "—", seats: "—", apiCalls: "—", storage: "—" });

  useEffect(() => {
    loadUserData().then((data) => {
      if (data.billing) setBilling((prev) => ({ ...prev, ...data.billing }));
    });
  }, []);

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Подписка</div>
      <div style={s.card}>
        <div style={s.cardBody}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {billing.plan} plan{" "}
                <span style={{ display: "inline-block", fontSize: 11, padding: "2px 9px", background: "#FAEEDA", color: "#854F0B", borderRadius: 20, fontWeight: 500, marginLeft: 6, verticalAlign: "middle" }}>Active</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary, #666)", marginTop: 3 }}>
                {billing.price} / месяц · Обновление {billing.renewal}
              </div>
            </div>
            <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: "9px 16px", background: "transparent", color: "var(--color-text-secondary, #666)", border: "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))", borderRadius: 8, cursor: "pointer" }}>
              Управляь подпиской
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            {[
              { val: billing.seats,    lbl: "Кол-во ползователей" },
              { val: billing.apiCalls, lbl: "API запросы за месяц" },
              { val: billing.storage,  lbl: "Объем хранилища: 50 ГБ" },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ background: "var(--color-background-secondary, #f5f5f5)", borderRadius: 8, padding: "0.9rem 1rem" }}>
                <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: -0.5 }}>{val}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary, #666)", marginTop: 3 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DANGER SECTION ───────────────────────────────────────────────────────────
function DangerSection() {
  const rows = [
    { title: "Экспорт всех данных",            desc: "Скачать все данные",       btn: "Экспорт",         danger: false },
    { title: "Отменить подписку",         desc: "Приостановить подписку — Данные будуть сохраняться в течение 30 дней",     btn: "Отключить",     danger: true  },
    { title: "Удалить аккуант полностью", desc: "Удалить все данные",  btn: "Удалить", danger: true  },
  ];

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Danger zone</div>
      <div style={{ ...s.card, border: "0.5px solid var(--color-border-danger, #e74c3c)" }}>
        <div style={s.cardBody}>
          {rows.map(({ title, desc, btn, danger }, i) => (
            <div key={title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 0", borderBottom: i < rows.length - 1 ? "0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.1))" : "none", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: danger ? "var(--color-text-danger, #c0392b)" : "var(--color-text-primary, #111)" }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)", marginTop: 2 }}>{desc}</div>
              </div>
              <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, padding: "7px 14px", border: danger ? "0.5px solid var(--color-border-danger, #e74c3c)" : "0.5px solid var(--color-border-secondary, rgba(0,0,0,0.2))", borderRadius: 8, background: "transparent", color: danger ? "var(--color-text-danger, #c0392b)" : "var(--color-text-secondary, #666)", cursor: "pointer", flexShrink: 0 }}>
                {btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div style={s.page}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={s.pageTitle}>Настройки</h1>
        <p style={s.pageSubtitle}>Управляйте своим аккаунтом, настройками и рабочим пространством</p>
      </div>
      <ProfileSection />
      <BusinessSection />
      <SecuritySection />
      <CurrencySection />
      <NotificationsSection />
      <BillingSection />
      <DangerSection />
    </div>
  );
}
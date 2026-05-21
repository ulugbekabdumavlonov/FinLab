/**
 * BusinessDirections.jsx v4.0
 * — Карточки + таблица (переключатель как в MyWallet)
 * — Виртуальный баланс по счётам из транзакций
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { auth, db } from "../firebase";
import {
  collection, addDoc, getDocs,
  updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { useAppStore, store } from "../Pages/useAppStore";

const getCompanyId = () => window.__finlab_user?.companyId || auth.currentUser?.uid;
const userCol = (name) => collection(db, "users", getCompanyId(), name);
const userDoc = (name, id) => doc(db, "users", getCompanyId(), name, id);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F2F7",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F7F8FC",
  border:       "#E4E8F0",
  borderHover:  "#C8D0E0",
  ink:          "#0F172A",
  inkMid:       "#3D4A5C",
  inkLight:     "#64748B",
  inkFaint:     "#94A3B8",
  blue:         "#2563EB",
  blueBg:       "#EFF6FF",
  blueBorder:   "#BFDBFE",
  green:        "#059669",
  greenBg:      "#ECFDF5",
  greenBorder:  "#6EE7B7",
  red:          "#E11D48",
  redBg:        "#FFF1F2",
  redBorder:    "#FECDD3",
  amber:        "#D97706",
  amberBg:      "#FFFBEB",
  amberBorder:  "#FDE68A",
  purple:       "#7C3AED",
  purpleBg:     "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

const DIRECTION_ICONS = [
  { value: "🎮", label: "Гейм-клуб" },
  { value: "🛒", label: "Розница" },
  { value: "🍽️", label: "Ресторан" },
  { value: "🏠", label: "Недвижимость" },
  { value: "🏗️", label: "Строительство" },
  { value: "🏭", label: "Производство" },
  { value: "🚚", label: "Логистика" },
  { value: "💊", label: "Медицина" },
  { value: "📚", label: "Образование" },
  { value: "💻", label: "IT / Технологии" },
  { value: "🏦", label: "Финансы" },
  { value: "🌾", label: "Агробизнес" },
  { value: "⚡", label: "Энергетика" },
  { value: "✈️", label: "Туризм" },
  { value: "🎯", label: "Маркетинг" },
  { value: "🔧", label: "Сервис / Ремонт" },
  { value: "💄", label: "Красота / СПА" },
  { value: "🏋️", label: "Фитнес / Спорт" },
  { value: "📦", label: "Склад / Оптовая" },
  { value: "🌐", label: "Другое" },
];

const PALETTES = [
  { bg: "#EFF6FF", color: "#2563EB", light: "#DBEAFE" },
  { bg: "#ECFDF5", color: "#059669", light: "#D1FAE5" },
  { bg: "#FFF7ED", color: "#EA580C", light: "#FED7AA" },
  { bg: "#FFF1F2", color: "#E11D48", light: "#FECDD3" },
  { bg: "#F5F3FF", color: "#7C3AED", light: "#EDE9FE" },
  { bg: "#FFFBEB", color: "#D97706", light: "#FDE68A" },
  { bg: "#F0FDF4", color: "#16A34A", light: "#BBF7D0" },
  { bg: "#FDF2F8", color: "#C026D3", light: "#F5D0FE" },
];
function getPalette(name = "") {
  return PALETTES[name.charCodeAt(0) % PALETTES.length];
}

const STATUSES = [
  { value: "active",   label: "Активное",       color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  { value: "paused",   label: "Приостановлено", color: C.amber,  bg: C.amberBg,  border: C.amberBorder },
  { value: "closed",   label: "Закрыто",        color: C.red,    bg: C.redBg,    border: C.redBorder },
  { value: "planning", label: "Планируется",    color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
];
function getStatus(val) { return STATUSES.find(s => s.value === val) || STATUSES[0]; }

function StatusBadge({ value }) {
  const s = getStatus(value);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

const fmtNum = (n) => Math.abs(n).toLocaleString("ru-RU");

// ─── Виртуальный остаток по счёту в рамках проекта ───────────────────────────
function calcVirtualByAccount(accountName, projectName, transactions) {
  let balance = 0;
  transactions.forEach((tx) => {
    if (tx.direction !== projectName) return;
    if (tx._source === "split" || tx.source === "split") return;
    const amt = Number(tx.amount || 0);
    if (tx.type === "income"  && tx.walletName === accountName) balance += Math.abs(amt);
    if (tx.type === "expense" && tx.walletName === accountName) balance -= Math.abs(amt);
    if (tx.type === "transfer") {
      if (tx.toWalletName === accountName) balance += Math.abs(amt);
      if (tx.walletName   === accountName) balance -= Math.abs(amt);
    }
  });
  return balance;
}

// Общий виртуальный остаток по всем счетам проекта
function calcProjectVirtualTotal(projectName, linkedAccounts, transactions) {
  return linkedAccounts.reduce(
    (sum, a) => sum + calcVirtualByAccount(a.name, projectName, transactions),
    0
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/>
  </svg>
);

const inpBase = {
  fontFamily: "inherit", fontSize: 13, padding: "9px 12px",
  border: `1px solid ${C.border}`, borderRadius: 8,
  background: C.surfaceAlt, color: C.ink, outline: "none",
  width: "100%", boxSizing: "border-box",
};

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.inkFaint }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.inkFaint }}>{hint}</span>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function DirectionModal({ initial, entities, accounts, onClose, onSuccess }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name:        initial?.name        || "",
    icon:        initial?.icon        || "🌐",
    description: initial?.description || "",
    status:      initial?.status      || "active",
    location:    initial?.location    || "",
    employees:   initial?.employees   || "",
    revenue:     initial?.revenue     || "",
    currency:    initial?.currency    || "UZS",
    entityIds:   initial?.entityIds   || [],
    accountIds:  initial?.accountIds  || [],
    notes:       initial?.notes       || "",
  });
  const [saving,   setSaving]   = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (key, id) =>
    set(key, form[key].includes(id) ? form[key].filter(i => i !== id) : [...form[key], id]);

  const handleSave = async () => {
  if (!form.name.trim()) return;
  setSaving(true);
  try {
    if (isEdit) {
      await updateDoc(userDoc("projects", initial.id), { ...form, updatedAt: serverTimestamp() });
      store.updateProject(initial.id, { id: initial.id, ...form });
    } else {
      const ref = await addDoc(userCol("projects"), { ...form, createdAt: serverTimestamp() });
      store.addProject({ id: ref.id, ...form });
    }
    await onSuccess();
    onClose();
  } finally { setSaving(false); }
};

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 400, padding: 24,
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
        width: 640, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(15,23,42,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 28px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: C.surface, zIndex: 10,
          borderRadius: "16px 16px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>{form.icon}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>
                {isEdit ? "Редактировать направление" : "Новое направление бизнеса"}
              </div>
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 1 }}>
                {isEdit ? form.name : "Укажите название и параметры"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.surfaceAlt, cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center", color: C.inkFaint,
          }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Icon + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "start" }}>
            <Field label="Иконка">
              <div style={{ position: "relative" }}>
                <button onClick={() => setIconOpen(v => !v)} style={{
                  width: 52, height: 44, borderRadius: 8,
                  border: `1px solid ${iconOpen ? C.blue : C.border}`,
                  background: iconOpen ? C.blueBg : C.surfaceAlt,
                  fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{form.icon}</button>
                {iconOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: 10, width: 300,
                    boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
                  }}>
                    {DIRECTION_ICONS.map(({ value, label }) => (
                      <button key={value} title={label}
                        onClick={() => { set("icon", value); setIconOpen(false); }}
                        style={{
                          padding: "8px 4px", borderRadius: 8,
                          border: `1px solid ${form.icon === value ? C.blue : "transparent"}`,
                          background: form.icon === value ? C.blueBg : "transparent",
                          fontSize: 20, cursor: "pointer", display: "flex",
                          flexDirection: "column", alignItems: "center", gap: 2,
                        }}>
                        {value}
                        <span style={{ fontSize: 8, color: C.inkFaint, lineHeight: 1, textAlign: "center" }}>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Название *">
              <input autoFocus value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Напр. Гейм-клубы, Рестораны…"
                style={{ ...inpBase, fontSize: 14, fontWeight: 600 }}
              />
            </Field>
          </div>

          <Field label="Описание">
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Опишите направление бизнеса…" rows={3}
              style={{ ...inpBase, resize: "vertical", minHeight: 80, lineHeight: 1.6 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Статус">
              <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...inpBase, cursor: "pointer" }}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Локация">
              <input value={form.location} onChange={e => set("location", e.target.value)}
                placeholder="Напр. Ташкент, 3 точки" style={inpBase} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Сотрудников">
              <input type="number" value={form.employees} onChange={e => set("employees", e.target.value)} placeholder="0" style={inpBase} />
            </Field>
            <Field label="Выручка / мес (план)">
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" value={form.revenue} onChange={e => set("revenue", e.target.value)} placeholder="0" style={{ ...inpBase, flex: 1 }} />
                <select value={form.currency} onChange={e => set("currency", e.target.value)} style={{ ...inpBase, width: 90, cursor: "pointer" }}>
                  {["UZS","USD","EUR","RUB","KZT"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </Field>
          </div>

          <div style={{ height: 1, background: C.border }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em" }}>Привязанные юрлица</div>

          {entities.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkFaint, padding: "12px 14px", background: C.surfaceAlt, borderRadius: 8 }}>
              Нет юрлиц. Добавьте в разделе «Мои юрлица».
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {entities.map(e => {
                const pal = getPalette(e.name);
                const checked = form.entityIds.includes(e.id);
                return (
                  <div key={e.id} onClick={() => toggleArr("entityIds", e.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${checked ? C.blue : C.border}`,
                    background: checked ? C.blueBg : C.surfaceAlt, transition: "all 0.15s",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: pal.bg, color: pal.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                      {e.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: checked ? C.blue : C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                      <div style={{ fontSize: 10, color: C.inkFaint }}>{[e.orgType, e.inn ? `ИНН: ${e.inn}` : null].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? C.blue : C.borderHover}`, background: checked ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2.5 2.5L8 3"/></svg>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 1, background: C.border }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em" }}>Счета направления</div>

          {accounts.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkFaint, padding: "12px 14px", background: C.surfaceAlt, borderRadius: 8 }}>
              Нет счетов. Добавьте в разделе «Счета».
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {accounts.map(a => {
                const checked = form.accountIds.includes(a.id);
                return (
                  <div key={a.id} onClick={() => toggleArr("accountIds", a.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${checked ? C.green : C.border}`,
                    background: checked ? C.greenBg : C.surfaceAlt, transition: "all 0.15s",
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: checked ? C.greenBg : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏦</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: checked ? C.green : C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? C.green : C.borderHover}`, background: checked ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2.5 2.5L8 3"/></svg>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ height: 1, background: C.border }} />
          <Field label="Примечания">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Доп. информация…" rows={2}
              style={{ ...inpBase, resize: "vertical", lineHeight: 1.6 }} />
          </Field>
        </div>

        <div style={{
          padding: "14px 28px 20px", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 10, position: "sticky", bottom: 0,
          background: C.surface, borderRadius: "0 0 16px 16px",
        }}>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
            fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            padding: "10px 28px", borderRadius: 8, border: "none",
            background: (saving || !form.name.trim()) ? C.border : C.blue,
            color: (saving || !form.name.trim()) ? C.inkFaint : "#fff",
            cursor: (saving || !form.name.trim()) ? "not-allowed" : "pointer",
          }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Создать направление"}
          </button>
          <button onClick={onClose} style={{
            fontFamily: "inherit", fontSize: 13, padding: "10px 18px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: "transparent", color: C.inkMid, cursor: "pointer",
          }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card View ────────────────────────────────────────────────────────────────
function DirectionCard({ item, entities, accounts, transactions, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pal = getPalette(item.name);

  const linkedEntities = entities.filter(e => (item.entityIds || []).includes(e.id));
  const linkedAccounts = accounts.filter(a => (item.accountIds || []).includes(a.id));

  const accountVirtuals = useMemo(() =>
    linkedAccounts.map(a => ({
      ...a,
      virtual: calcVirtualByAccount(a.name, item.name, transactions),
    })),
    [linkedAccounts, item.name, transactions]
  );

  const totalVirtual = accountVirtuals.reduce((s, a) => s + a.virtual, 0);
  const cur = item.currency || "UZS";

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      overflow: "hidden", display: "flex", flexDirection: "column",
      transition: "box-shadow 0.15s, transform 0.15s",
      boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(15,23,42,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(15,23,42,0.06)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ height: 5, background: `linear-gradient(90deg, ${pal.color}, ${pal.color}99)` }} />

      <div style={{ padding: "20px 20px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: pal.bg, border: `2px solid ${pal.light}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              {item.icon || "🌐"}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.3px" }}>{item.name}</div>
              {item.location && <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>📍 {item.location}</div>}
            </div>
          </div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(v => !v)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: menuOpen ? C.surfaceAlt : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.inkFaint, fontSize: 16 }}>⋯</button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "4px 0", minWidth: 160, boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}>
                <button onClick={() => { onEdit(item); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: C.inkMid, fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  ✏️ Редактировать
                </button>
                <div style={{ height: 1, background: C.border, margin: "2px 0" }} />
                <button onClick={() => { onDelete(item.id); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: C.red, fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.redBg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  🗑️ Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge value={item.status || "active"} />
          {item.employees && <span style={{ fontSize: 11, color: C.inkFaint }}>👥 {item.employees} сотр.</span>}
        </div>

        {item.description && (
          <p style={{ fontSize: 12, color: C.inkLight, lineHeight: 1.65, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {item.description}
          </p>
        )}

        {/* Юрлица */}
        {linkedEntities.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Юрлица</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {linkedEntities.map(e => {
                const p = getPalette(e.name);
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: p.bg, color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                      {e.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{e.name}</div>
                      {(e.orgType || e.inn) && <div style={{ fontSize: 10, color: C.inkFaint }}>{[e.orgType, e.inn ? `ИНН ${e.inn}` : null].filter(Boolean).join(" · ")}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Счета — название + виртуальный остаток */}
        {accountVirtuals.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Счета</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {accountVirtuals.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🏦</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{a.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: a.virtual >= 0 ? C.green : C.red }}>
                    {a.virtual >= 0 ? "+" : "−"}{fmtNum(a.virtual)} {a.currency || cur}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.notes && (
          <div style={{ padding: "8px 12px", background: C.amberBg, borderRadius: 8, border: `1px solid ${C.amberBorder}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Заметки</div>
            <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.5 }}>{item.notes}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surfaceAlt }}>
        <span style={{ fontSize: 11, color: C.inkFaint }}>
          {linkedEntities.length} юрлиц · {accountVirtuals.length} счетов
        </span>
        {accountVirtuals.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: totalVirtual >= 0 ? C.green : C.red }}>
            Σ {totalVirtual >= 0 ? "+" : "−"}{fmtNum(totalVirtual)} {cur}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
function DirectionTable({ items, entities, accounts, transactions, onEdit, onDelete }) {
  const COL = {
    padding: "9px 14px", fontSize: 11, fontWeight: 500,
    color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", textAlign: "left",
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: C.surfaceAlt }}>
              <th style={COL}>Направление</th>
              <th style={COL}>Статус</th>
              <th style={COL}>Юрлицо</th>
              <th style={COL}>Счёт</th>
              <th style={{ ...COL, textAlign: "right" }}>Виртуальный баланс</th>
              <th style={{ ...COL, textAlign: "right" }}>Итого по проекту</th>
              <th style={{ ...COL, textAlign: "center" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const pal = getPalette(item.name);
              const linkedEntities = entities.filter(e => (item.entityIds || []).includes(e.id));
              const linkedAccounts = accounts.filter(a => (item.accountIds || []).includes(a.id));
              const accountVirtuals = linkedAccounts.map(a => ({
                ...a,
                virtual: calcVirtualByAccount(a.name, item.name, transactions),
              }));
              const totalVirtual = accountVirtuals.reduce((s, a) => s + a.virtual, 0);
              const cur = item.currency || "UZS";
              const isLast = idx === items.length - 1;

              // Если нет счетов — одна строка
              if (accountVirtuals.length === 0) {
                return (
                  <tr key={item.id}
                    style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: pal.bg, border: `1.5px solid ${pal.light}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {item.icon || "🌐"}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.name}</div>
                          {item.location && <div style={{ fontSize: 11, color: C.inkFaint }}>📍 {item.location}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge value={item.status || "active"} /></td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.inkLight }}>
                      {linkedEntities.map(e => e.name).join(", ") || <span style={{ color: C.inkFaint }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.inkFaint }}>—</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: C.inkFaint }}>—</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: C.inkFaint }}>—</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button onClick={() => onEdit(item)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surfaceAlt, color: C.inkMid, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          ✏️ Изменить
                        </button>
                        <button onClick={() => onDelete(item.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surfaceAlt, color: C.red, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          🗑️ Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              // Если есть счета — строка на каждый счёт, первая строка содержит название и действия
              return accountVirtuals.map((a, aIdx) => {
                const isFirstAcc = aIdx === 0;
                const isLastAcc  = aIdx === accountVirtuals.length - 1;
                const rowBorder  = isLast && isLastAcc ? "none" : `1px solid ${C.border}`;
                const rowBg      = aIdx % 2 === 1 ? C.surfaceAlt : "transparent";

                return (
                  <tr key={`${item.id}-${a.id}`}
                    style={{ borderBottom: rowBorder, background: rowBg, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.blueBg}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    {/* Название — только в первой строке, rowSpan */}
                    {isFirstAcc && (
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }} rowSpan={accountVirtuals.length}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: pal.bg, border: `1.5px solid ${pal.light}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            {item.icon || "🌐"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.name}</div>
                            {item.location && <div style={{ fontSize: 11, color: C.inkFaint }}>📍 {item.location}</div>}
                          </div>
                        </div>
                      </td>
                    )}
                    {isFirstAcc && (
                      <td style={{ padding: "12px 14px", verticalAlign: "top" }} rowSpan={accountVirtuals.length}>
                        <StatusBadge value={item.status || "active"} />
                      </td>
                    )}
                    {isFirstAcc && (
                      <td style={{ padding: "12px 14px", fontSize: 13, color: C.inkLight, verticalAlign: "top" }} rowSpan={accountVirtuals.length}>
                        {linkedEntities.map(e => e.name).join(", ") || <span style={{ color: C.inkFaint }}>—</span>}
                      </td>
                    )}

                    {/* Счёт */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 15 }}>🏦</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{a.name}</span>
                      </div>
                    </td>

                    {/* Виртуальный баланс по этому счёту */}
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: a.virtual >= 0 ? C.green : C.red }}>
                        {a.virtual >= 0 ? "+" : "−"}{fmtNum(a.virtual)} {a.currency || cur}
                      </span>
                    </td>

                    {/* Итого по проекту — только в первой строке */}
                    {isFirstAcc ? (
                      <td style={{ padding: "10px 14px", textAlign: "right", verticalAlign: "top" }} rowSpan={accountVirtuals.length}>
                        <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: totalVirtual >= 0 ? C.green : C.red }}>
                          {totalVirtual >= 0 ? "+" : "−"}{fmtNum(totalVirtual)} {cur}
                        </span>
                      </td>
                    ) : null}

                    {/* Действия — только в первой строке */}
                    {isFirstAcc ? (
                      <td style={{ padding: "10px 14px", verticalAlign: "top" }} rowSpan={accountVirtuals.length}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => onEdit(item)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surfaceAlt, color: C.inkMid, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                            ✏️ Изменить
                          </button>
                          <button onClick={() => onDelete(item.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.surfaceAlt, color: C.red, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                            🗑️ Удалить
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BusinessDirections() {
  const { accounts, transactions } = useAppStore();
  const [directions,   setDirections]   = useState([]);
  const [entities,     setEntities]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode,     setViewMode]     = useState("card"); // "card" | "table"

 const loadData = useCallback(async () => {
    setLoading(true);
    const [p, e] = await Promise.all([
      getDocs(userCol("projects")),
      getDocs(userCol("legal_entities")),
    ]);
    setDirections(p.docs.map(d => ({ id: d.id, ...d.data() })));
    setEntities(e.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!confirm("Удалить направление?")) return;
    await deleteDoc(userDoc("projects", id));
    setDirections(prev => prev.filter(d => d.id !== id));
  };

  const filtered = directions.filter(d => {
    if (filterStatus !== "all" && (d.status || "active") !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.location?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = directions.filter(d => (d.status || "active") === "active").length;

  const totalVirtual = useMemo(() => {
    let bal = 0;
    directions.forEach(dir => {
      const linked = accounts.filter(a => (dir.accountIds || []).includes(a.id));
      linked.forEach(a => { bal += calcVirtualByAccount(a.name, dir.name, transactions); });
    });
    return bal;
  }, [directions, accounts, transactions]);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: C.bg, color: C.ink }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {modal?.mode === "create" && (
        <DirectionModal entities={entities} accounts={accounts} onClose={() => setModal(null)} onSuccess={loadData} />
      )}
      {modal?.mode === "edit" && (
        <DirectionModal initial={modal.item} entities={entities} accounts={accounts} onClose={() => setModal(null)} onSuccess={loadData} />
      )}

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 8px rgba(15,23,42,0.06)",
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.4px" }}>Направления бизнеса</h1>
          <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
            {directions.length} направлений · {activeCount} активных
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.inkFaint, pointerEvents: "none" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск…"
              style={{ ...inpBase, paddingLeft: 28, width: 180 }} />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {[["all", "Все"], ...STATUSES.map(s => [s.value, s.label])].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterStatus(val)} style={{
                padding: "7px 12px", borderRadius: 8, fontFamily: "inherit", fontSize: 12,
                border: `1px solid ${filterStatus === val ? C.blue : C.border}`,
                background: filterStatus === val ? C.blueBg : C.surface,
                color: filterStatus === val ? C.blue : C.inkMid,
                cursor: "pointer", fontWeight: filterStatus === val ? 700 : 400,
              }}>{lbl}</button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {[["card", <IconGrid />], ["table", <IconList />]].map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 34, height: 34,
                  background: viewMode === mode ? C.blueBg : C.surface,
                  color: viewMode === mode ? C.blue : C.inkFaint,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}>
                {icon}
              </button>
            ))}
          </div>

          <button onClick={() => setModal({ mode: "create" })} style={{
            fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: C.blue, color: "#fff", cursor: "pointer",
          }}>+ Добавить направление</button>
        </div>
      </div>

      <div style={{ padding: "24px 40px 60px" }}>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Всего направлений</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{directions.length}</div>
          </div>
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, opacity: 0.7 }}>Активных</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.green }}>{activeCount}</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Юрлиц</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.inkMid }}>{entities.length}</div>
          </div>
          <div style={{
            background: totalVirtual >= 0 ? C.greenBg : C.redBg,
            border: `1px solid ${totalVirtual >= 0 ? C.greenBorder : C.redBorder}`,
            borderRadius: 12, padding: "16px 22px", flex: 2, minWidth: 220,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: totalVirtual >= 0 ? C.green : C.red, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, opacity: 0.7 }}>
              Общий баланс по всем счетам
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totalVirtual >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums" }}>
              {totalVirtual >= 0 ? "+" : "−"}{fmtNum(totalVirtual)} UZS
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.inkFaint }}>Загрузка…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "70px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.inkMid, marginBottom: 8 }}>
              {directions.length === 0 ? "Нет направлений бизнеса" : "Ничего не найдено"}
            </div>
            <div style={{ fontSize: 13, color: C.inkFaint, marginBottom: 20 }}>
              {directions.length === 0 ? "Добавьте направления: гейм-клуб, ресторан, розница и т.д." : "Попробуйте изменить фильтр или поиск"}
            </div>
            {directions.length === 0 && (
              <button onClick={() => setModal({ mode: "create" })} style={{
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: C.blue, color: "#fff", cursor: "pointer",
              }}>+ Добавить первое направление</button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === "card" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map(item => (
              <DirectionCard
                key={item.id} item={item}
                entities={entities} accounts={accounts} transactions={transactions}
                onEdit={item => setModal({ mode: "edit", item })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === "table" && (
          <DirectionTable
            items={filtered}
            entities={entities} accounts={accounts} transactions={transactions}
            onEdit={item => setModal({ mode: "edit", item })}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

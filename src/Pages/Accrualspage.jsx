/**
 * AccrualsPage.jsx — Метод начисления
 * Дизайн совпадает с CashFlow.jsx и P&L
 * Исправлены: derivedStatus, amount sign, linkedPayments UI, normalizeDate
 * Добавлены: матчер транзакций, onSnapshot для categories/projects
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (col, id) => doc(db, "users", auth.currentUser.uid, col, id);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Math.abs(Number(n)).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtSigned = (n) => (n >= 0 ? "+" : "−") + " " + fmt(n);

const todayStr = () => new Date().toISOString().slice(0, 10);

function normalizeDate(raw) {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = String(raw).split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// ─── Design tokens — идентичны CashFlow.jsx ───────────────────────────────────
const C = {
  ink:      "#111827",
  inkMid:   "#374151",
  inkLight: "#9ca3af",
  inkFaint: "#d1d5db",

  surface:    "#ffffff",
  surfaceAlt: "#f9fafb",

  border:    "#e5e7eb",
  borderMid: "#d1d5db",

  pos:   "#15803d",
  posBg: "#f0fdf4",

  neg:   "#b91c1c",
  negBg: "#fef2f2",

  accent:   "#2563eb",
  accentBg: "#eff6ff",

  amber:   "#b45309",
  amberBg: "#fffbeb",
};

const STATUS = {
  pending:  { bg: C.amberBg,  color: C.amber,  border: "#fde68a", label: "Не оплачено" },
  partial:  { bg: C.accentBg, color: C.accent,  border: "#bfdbfe", label: "Частично"    },
  paid:     { bg: C.posBg,    color: C.pos,     border: "#bbf7d0", label: "Оплачено"    },
  overdue:  { bg: C.negBg,    color: C.neg,     border: "#fecaca", label: "Просрочено"  },
};

function deriveStatus(accrual, transactions) {
  const linkedIds = accrual.linkedPayments || [];
  const txs       = transactions.filter((t) => linkedIds.includes(t.id));
  const paid      = txs.reduce((s, t) => s + Math.abs(Number(t.Sum ?? t.amount ?? 0)), 0);
  const base      = Math.abs(Number(accrual.amount ?? 0));
  const isOverdue = accrual.dueDate && accrual.dueDate < todayStr();

  if (paid <= 0 && isOverdue) return "overdue";
  if (paid <= 0)              return "pending";
  if (paid >= base)           return "paid";
  return "partial";
}

// ─── Общие компоненты ─────────────────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "inherit", fontSize: 13, padding: "5px 14px", borderRadius: 6,
      border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? C.accentBg : C.surface,
      color: active ? C.accent : C.inkMid,
      cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap",
      fontWeight: active ? 500 : 400,
    }}>
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, pos, sub }) {
  return (
    <div style={{
      background: C.surface, padding: "14px 18px",
      borderRight: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 400, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 500,
        color: pos === undefined ? C.ink : (pos ? C.pos : C.neg),
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px",
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const inpBase = {
  fontFamily: "inherit", fontSize: 13, padding: "8px 11px",
  border: `1px solid ${C.border}`, borderRadius: 6,
  background: C.surfaceAlt, color: C.ink, outline: "none",
  width: "100%", boxSizing: "border-box",
};

function Field({ label, required, children, hint, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{
        fontSize: 9, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: C.inkLight,
      }}>
        {label}{required && <span style={{ color: C.neg, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint  && !error && <span style={{ fontSize: 11, color: C.inkLight }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: C.neg }}>{error}</span>}
    </div>
  );
}

// ─── CounterpartyDropdown ────────────────────────────────────────────────────
function CounterpartyDropdown({ value, onChange, counterparties }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!e.target.closest("[data-cpd]")) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const options  = useMemo(() =>
    [...new Set(counterparties.map((c) => c.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")),
    [counterparties]
  );
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));

  return (
    <div data-cpd style={{ position: "relative" }}>
      <div
        onClick={() => { setOpen((v) => !v); setQ(""); }}
        style={{
          ...inpBase, display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", borderColor: open ? C.accent : C.border,
          background: open ? C.accentBg : C.surfaceAlt,
          color: value ? C.ink : C.inkLight,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "Выбрать контрагента"}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke={open ? C.accent : C.inkLight} strokeWidth="1.5"
          style={{ flexShrink: 0, marginLeft: 6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M1 3l4 4 4-4"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 600,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
          maxHeight: 260, overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "7px 8px", borderBottom: `1px solid ${C.border}` }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск или введите вручную…"
              style={{ ...inpBase, fontSize: 12, padding: "6px 10px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) { onChange(q.trim()); setOpen(false); setQ(""); }
              }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); }}
              style={{ padding: "8px 12px", fontSize: 13, color: C.inkLight, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >— Не выбрано</div>

            {q.trim() && !filtered.some(o => o.toLowerCase() === q.trim().toLowerCase()) && (
              <div onClick={() => { onChange(q.trim()); setOpen(false); setQ(""); }}
                style={{
                  padding: "8px 12px", fontSize: 13, color: C.accent, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  borderBottom: `1px solid ${C.border}`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentBg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                + Использовать «{q.trim()}»
              </div>
            )}

            {filtered.map((opt) => (
              <div key={opt}
                onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                style={{
                  padding: "8px 12px", fontSize: 13, cursor: "pointer",
                  background: opt === value ? C.accentBg : "transparent",
                  color: opt === value ? C.accent : C.ink,
                  fontWeight: opt === value ? 500 : 400,
                }}
                onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = C.surfaceAlt; }}
                onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AccrualForm ──────────────────────────────────────────────────────────────
function AccrualForm({ initial, categories, projects, counterparties, onSave, onCancel }) {
  const empty = {
    type: "expense", category: "", project: "", counterparty: "",
    description: "", amount: "", currency: "UZS",
    accrualDate: todayStr(), dueDate: "", splitMonths: 1,
  };
  const [form,   setForm]   = useState(initial ? { ...initial, amount: Math.abs(initial.amount || 0) } : empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = "Введите сумму";
    if (!form.category)    e.category    = "Выберите категорию";
    if (!form.accrualDate) e.accrualDate = "Укажите дату";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // amount хранится со знаком: расход — отрицательный, доход — положительный
      const signedAmount = form.type === "expense"
        ? -Math.abs(Number(form.amount))
        :  Math.abs(Number(form.amount));
      await onSave({ ...form, amount: signedAmount });
    } finally {
      setSaving(false);
    }
  };

  const isExpense = form.type === "expense";

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "20px 24px", marginBottom: 14,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: C.inkLight, marginBottom: 18,
      }}>
        {initial ? "Редактировать начисление" : "Новое начисление"}
      </div>

      {/* Тип + Валюта */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, marginBottom: 14 }}>
        <Field label="Тип операции">
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            {[["expense","Расход"], ["income","Доход"]].map(([val, lbl]) => {
              const active = form.type === val;
              return (
                <button key={val} onClick={() => set("type", val)} style={{
                  flex: 1, fontFamily: "inherit", fontSize: 13, padding: "8px 0",
                  border: "none", borderLeft: val === "income" ? `1px solid ${C.border}` : "none",
                  background: active ? (val === "expense" ? C.negBg : C.posBg) : C.surfaceAlt,
                  color: active ? (val === "expense" ? C.neg : C.pos) : C.inkLight,
                  cursor: "pointer", fontWeight: active ? 500 : 400, transition: "all 0.12s",
                }}>{lbl}</button>
              );
            })}
          </div>
        </Field>
        <Field label="Валюта">
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)} style={{ ...inpBase, cursor: "pointer" }}>
            {["UZS","USD","EUR","RUB","KZT"].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Сумма + Контрагент */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Field label="Сумма начисления" required error={errors.amount}>
          <input type="number" min="0" value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
            style={{ ...inpBase, borderColor: errors.amount ? C.neg : C.border, fontSize: 15, fontWeight: 500 }}
          />
        </Field>
        <Field label="Контрагент">
          <CounterpartyDropdown value={form.counterparty} onChange={(v) => set("counterparty", v)} counterparties={counterparties} />
        </Field>
      </div>

      {/* Категория + Проект */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Field label="Категория" required error={errors.category}>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            style={{ ...inpBase, cursor: "pointer", borderColor: errors.category ? C.neg : C.border }}>
            <option value="">— выберите —</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Проект">
          <select value={form.project} onChange={(e) => set("project", e.target.value)} style={{ ...inpBase, cursor: "pointer" }}>
            <option value="">— без проекта —</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {/* Описание */}
      <div style={{ marginBottom: 14 }}>
        <Field label="Описание">
          <input type="text" value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Краткое описание обязательства"
            style={inpBase}
          />
        </Field>
      </div>

      {/* Даты + Разбивка */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12, marginBottom: 18 }}>
        <Field label="Дата начисления" required hint="Период расхода/дохода" error={errors.accrualDate}>
          <input type="date" value={form.accrualDate}
            onChange={(e) => set("accrualDate", e.target.value)}
            style={{ ...inpBase, borderColor: errors.accrualDate ? C.neg : C.border }}
          />
        </Field>
        <Field label="Срок оплаты" hint="Дедлайн по договору">
          <input type="date" value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)} style={inpBase} />
        </Field>
        <Field label="Разбить на мес." hint="1 = не разбивать">
          <input type="number" min="1" max="36" value={form.splitMonths}
            onChange={(e) => set("splitMonths", Math.max(1, parseInt(e.target.value) || 1))}
            style={inpBase}
          />
        </Field>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{
          fontFamily: "inherit", fontSize: 13, fontWeight: 500,
          padding: "9px 24px", borderRadius: 6, border: "none",
          background: saving ? C.border : (isExpense ? C.neg : C.pos),
          color: saving ? C.inkLight : "#fff",
          cursor: saving ? "default" : "pointer", transition: "all 0.12s",
        }}>
          {saving ? "Сохранение…" : (initial ? "Сохранить" : "Добавить начисление")}
        </button>
        <button onClick={onCancel} style={{
          fontFamily: "inherit", fontSize: 13, padding: "9px 18px", borderRadius: 6,
          border: `1px solid ${C.border}`, background: "transparent", color: C.inkMid, cursor: "pointer",
        }}>Отмена</button>
      </div>
    </div>
  );
}

// ─── TransactionMatcher — привязка оплат к начислению ─────────────────────────
function TransactionMatcher({ accrual, transactions, onLink, onUnlink, onClose }) {
  const [search, setSearch] = useState("");

  const base         = Math.abs(Number(accrual.amount ?? 0));
  const linkedIds    = accrual.linkedPayments || [];
  const linkedTxs    = transactions.filter((t) => linkedIds.includes(t.id));
  const totalPaid    = linkedTxs.reduce((s, t) => s + Math.abs(Number(t.Sum ?? t.amount ?? 0)), 0);
  const remaining    = Math.max(0, base - totalPaid);
  const isExpense    = accrual.type === "expense";

  // Транзакции того же знака, что начисление, ещё не привязанные к другому
  const candidates = transactions
    .filter((t) => {
      const amt = Number(t.Sum ?? t.amount ?? 0);
      if (isExpense ? amt >= 0 : amt <= 0) return false;
      if (!linkedIds.includes(t.id) && (t.accrualId && t.accrualId !== accrual.id)) return false;
      const q = search.toLowerCase();
      return !q || (t.Counterparty || t.counterparty || "").toLowerCase().includes(q)
        || (t.Category || t.category || "").toLowerCase().includes(q)
        || (t._isoDate || "").includes(q);
    })
    .sort((a, b) => (b._isoDate || "").localeCompare(a._isoDate || ""));

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "18px 20px", marginTop: 10,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>Привязать оплаты</div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
            Начислено: {fmt(base)} · Оплачено: {fmt(totalPaid)} · Остаток: {fmt(remaining)} {accrual.currency}
          </div>
        </div>
        <button onClick={onClose} style={{
          fontFamily: "inherit", fontSize: 12, padding: "5px 12px",
          border: `1px solid ${C.border}`, borderRadius: 6,
          background: "transparent", color: C.inkMid, cursor: "pointer",
        }}>Закрыть</button>
      </div>

      {/* Прогресс */}
      <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 14 }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${Math.min(100, base > 0 ? (totalPaid / base) * 100 : 0)}%`,
          background: totalPaid >= base ? C.pos : C.accent,
          transition: "width 0.3s",
        }} />
      </div>

      {/* Привязанные */}
      {linkedTxs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight, marginBottom: 8 }}>
            Привязанные оплаты
          </div>
          {linkedTxs.map((t) => {
            const amt = Math.abs(Number(t.Sum ?? t.amount ?? 0));
            return (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", background: C.posBg,
                border: `1px solid #bbf7d0`, borderRadius: 6, marginBottom: 6,
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.pos }}>
                    {t.Counterparty || t.counterparty || t.Category || t.category || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkLight }}>
                    {t._isoDate} · {t.Category || t.category || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.pos, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(amt)} {t._accountCurrency || "UZS"}
                  </span>
                  <button onClick={() => onUnlink(t.id)} style={{
                    fontFamily: "inherit", fontSize: 11, padding: "3px 10px",
                    border: `1px solid ${C.border}`, borderRadius: 5,
                    background: C.surface, color: C.inkMid, cursor: "pointer",
                  }}>Отвязать</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Поиск */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск транзакций…"
        style={{ ...inpBase, marginBottom: 10 }}
      />

      {/* Кандидаты */}
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight, marginBottom: 8 }}>
        Доступные транзакции
      </div>
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {candidates.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: C.inkLight }}>
            Нет доступных транзакций
          </div>
        )}
        {candidates.map((t) => {
          const amt       = Math.abs(Number(t.Sum ?? t.amount ?? 0));
          const isLinked  = linkedIds.includes(t.id);
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", borderRadius: 6, marginBottom: 4,
              background: isLinked ? C.posBg : C.surfaceAlt,
              border: `1px solid ${isLinked ? "#bbf7d0" : C.border}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.Counterparty || t.counterparty || "—"}
                </div>
                <div style={{ fontSize: 11, color: C.inkLight }}>
                  {t._isoDate} · {t.Category || t.category || "—"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.inkMid, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(amt)} {t._accountCurrency || "UZS"}
                </span>
                <button
                  onClick={() => isLinked ? onUnlink(t.id) : onLink(t.id)}
                  style={{
                    fontFamily: "inherit", fontSize: 11, padding: "4px 12px",
                    border: `1px solid ${isLinked ? C.pos : C.accent}`,
                    borderRadius: 5,
                    background: isLinked ? C.posBg : C.accentBg,
                    color: isLinked ? C.pos : C.accent,
                    cursor: "pointer", fontWeight: 500,
                  }}
                >
                  {isLinked ? "✓ Привязана" : "Привязать"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AccrualRow ───────────────────────────────────────────────────────────────
function AccrualRow({ accrual, categories, projects, counterparties, transactions, onUpdate, onDelete }) {
  const [editing,   setEditing]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [matching,  setMatching]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const linkedIds = accrual.linkedPayments || [];
  const linkedTxs = transactions.filter((t) => linkedIds.includes(t.id));
  const totalPaid = linkedTxs.reduce((s, t) => s + Math.abs(Number(t.Sum ?? t.amount ?? 0)), 0);
  const base      = Math.abs(Number(accrual.amount ?? 0));
  const remaining = Math.max(0, base - totalPaid);
  const pct       = base > 0 ? Math.min(100, (totalPaid / base) * 100) : 0;
  const isIncome  = accrual.type === "income";
  const status    = deriveStatus(accrual, transactions);

  const handleSave = async (data) => { await onUpdate(accrual.id, data); setEditing(false); };

  const handleLink = async (txId) => {
    const current = accrual.linkedPayments || [];
    if (current.includes(txId)) return;
    await onUpdate(accrual.id, { linkedPayments: [...current, txId] });
  };

  const handleUnlink = async (txId) => {
    const current = accrual.linkedPayments || [];
    await onUpdate(accrual.id, { linkedPayments: current.filter((id) => id !== txId) });
  };

  if (editing) return (
    <div style={{ marginBottom: 8 }}>
      <AccrualForm
        initial={accrual}
        categories={categories} projects={projects} counterparties={counterparties}
        onSave={handleSave} onCancel={() => setEditing(false)}
      />
    </div>
  );

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${status === "overdue" ? "#fecaca" : C.border}`,
      borderRadius: 8, marginBottom: 6, overflow: "hidden",
    }}>
      {/* Основная строка */}
      <div
        onClick={() => { setExpanded((v) => !v); setMatching(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "11px 16px", cursor: "pointer",
          background: expanded ? C.surfaceAlt : C.surface,
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = C.surfaceAlt; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = C.surface; }}
      >
        {/* Цветная полоска типа */}
        <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0, background: isIncome ? C.pos : C.neg }} />

        {/* Инфо */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>
              {accrual.counterparty || accrual.category || "—"}
            </span>
            <StatusBadge status={status} />
            {linkedIds.length > 0 && (
              <span style={{
                fontSize: 10, padding: "1px 7px", borderRadius: 4,
                background: C.accentBg, color: C.accent,
                border: `1px solid #bfdbfe`, fontWeight: 500,
              }}>
                {linkedIds.length} оплат
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.inkLight, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {accrual.category && <span>{accrual.category}</span>}
            {accrual.project  && <><span>·</span><span>{accrual.project}</span></>}
            <span>·</span>
            <span>{accrual.accrualDate}</span>
            {accrual.dueDate && (
              <><span>·</span>
              <span style={{ color: status === "overdue" ? C.neg : C.inkLight }}>
                срок: {accrual.dueDate}
              </span></>
            )}
          </div>
          {accrual.description && (
            <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {accrual.description}
            </div>
          )}
        </div>

        {/* Сумма */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 500,
            color: isIncome ? C.pos : C.neg,
            fontVariantNumeric: "tabular-nums",
          }}>
            {isIncome ? "+" : "−"}{fmt(base)} {accrual.currency}
          </div>
          {status !== "paid" && remaining > 0 && (
            <div style={{ fontSize: 11, color: C.amber, fontVariantNumeric: "tabular-nums" }}>
              остаток {fmt(remaining)}
            </div>
          )}
          {status === "paid" && (
            <div style={{ fontSize: 11, color: C.pos }}>✓ закрыто</div>
          )}
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); setMatching((v) => !v); }}
            style={{
              fontFamily: "inherit", fontSize: 11, padding: "4px 10px", borderRadius: 5,
              border: `1px solid ${matching ? C.accent : C.border}`,
              background: matching ? C.accentBg : "transparent",
              color: matching ? C.accent : C.inkMid, cursor: "pointer",
            }}
          >Оплаты</button>
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{
            fontFamily: "inherit", fontSize: 11, padding: "4px 10px", borderRadius: 5,
            border: `1px solid ${C.border}`, background: "transparent", color: C.inkMid, cursor: "pointer",
          }}>Ред.</button>
          {!confirmDel ? (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true); }} style={{
              fontFamily: "inherit", fontSize: 11, padding: "4px 9px", borderRadius: 5,
              border: `1px solid ${C.border}`, background: "transparent", color: C.inkFaint, cursor: "pointer",
            }}>✕</button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onDelete(accrual.id); }} style={{
              fontFamily: "inherit", fontSize: 11, padding: "4px 10px", borderRadius: 5,
              border: `1px solid #fecaca`, background: C.negBg, color: C.neg,
              cursor: "pointer", fontWeight: 500,
            }}>Удалить?</button>
          )}
        </div>

        <span style={{ color: C.inkFaint, fontSize: 10, flexShrink: 0, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Прогресс-бар */}
      {linkedIds.length > 0 && (
        <div style={{ height: 2, background: C.border }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: pct >= 100 ? C.pos : C.accent,
            transition: "width 0.4s",
          }} />
        </div>
      )}

      {/* Раскрытая панель */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          {matching && (
            <TransactionMatcher
              accrual={accrual}
              transactions={transactions}
              onLink={handleLink}
              onUnlink={handleUnlink}
              onClose={() => setMatching(false)}
            />
          )}

          {!matching && linkedTxs.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight, marginBottom: 8 }}>
                Привязанные оплаты
              </div>
              {linkedTxs.map((t) => {
                const amt = Math.abs(Number(t.Sum ?? t.amount ?? 0));
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 12px", borderRadius: 6, marginBottom: 4,
                    background: C.posBg, border: `1px solid #bbf7d0`,
                  }}>
                    <div style={{ fontSize: 12, color: C.inkMid }}>
                      {t.Counterparty || t.counterparty || "—"} · {t._isoDate}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.pos, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(amt)} {t._accountCurrency || "UZS"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!matching && linkedTxs.length === 0 && (
            <div style={{ paddingTop: 14, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 10 }}>
                Нет привязанных оплат
              </div>
              <button onClick={() => setMatching(true)} style={{
                fontFamily: "inherit", fontSize: 12, padding: "6px 16px",
                border: `1px solid ${C.accent}`, borderRadius: 6,
                background: C.accentBg, color: C.accent, cursor: "pointer",
              }}>Привязать транзакцию</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AccrualsPage() {
  const uid = auth.currentUser?.uid;

  const [accruals,        setAccruals]        = useState([]);
  const [transactions,    setTransactions]     = useState([]);
  const [categories,      setCategories]       = useState([]);
  const [projects,        setProjects]         = useState([]);
  const [counterparties,  setCounterparties]   = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [showForm,        setShowForm]         = useState(false);

  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth,  setFilterMonth]  = useState("");
  const [search,       setSearch]       = useState("");

  // ── Firestore subscriptions (все через onSnapshot) ──
  useEffect(() => {
    if (!uid) return;
    const unsubs = [
      onSnapshot(userCol("accruals"),
        s => { setAccruals(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        () => setLoading(false)
      ),
      onSnapshot(userCol("transactions"),
        s => setTransactions(s.docs.map(d => ({
          id: d.id, ...d.data(),
          _isoDate: normalizeDate(d.data().Date || d.data().date || ""),
          _accountCurrency: d.data()._accountCurrency || d.data().currency || "UZS",
        })))
      ),
      onSnapshot(userCol("operation_categories"),
        s => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(userCol("projects"),
        s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(userCol("counterparties"),
        s => setCounterparties(s.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [uid]);

  const handleAdd = async (data) => {
    const splits = data.splitMonths > 1 ? data.splitMonths : 1;
    const splitAmt = data.amount / splits;
    const baseDate = new Date(data.accrualDate + "T00:00:00");

    for (let i = 0; i < splits; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const isoDate = d.toISOString().slice(0, 10);
      await addDoc(userCol("accruals"), {
        ...data,
        amount:       splitAmt,
        accrualDate:  isoDate,
        linkedPayments: [],
        splitIndex:   splits > 1 ? i + 1 : null,
        splitTotal:   splits > 1 ? splits : null,
        createdAt:    serverTimestamp(),
        uid,
      });
    }
    setShowForm(false);
  };

  const handleUpdate = async (id, data) =>
    updateDoc(userDoc("accruals", id), { ...data, updatedAt: serverTimestamp() });

  const handleDelete = async (id) =>
    deleteDoc(userDoc("accruals", id));

  // ── Enrich с единственным derivedStatus ──
  const enriched = useMemo(() =>
    accruals.map(a => ({
      ...a,
      accrualDate: normalizeDate(a.accrualDate),
      dueDate:     normalizeDate(a.dueDate),
      derivedStatus: deriveStatus(a, transactions),
    })),
    [accruals, transactions]
  );

  // ── Фильтрация ──
  const filtered = useMemo(() => enriched.filter(a => {
    if (filterType   !== "all" && a.type          !== filterType)   return false;
    if (filterStatus !== "all" && a.derivedStatus !== filterStatus) return false;
    if (filterMonth  && a.accrualDate && !a.accrualDate.startsWith(filterMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.counterparty || "").toLowerCase().includes(q) ||
        (a.category     || "").toLowerCase().includes(q) ||
        (a.description  || "").toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => (b.accrualDate || "").localeCompare(a.accrualDate || "")),
  [enriched, filterType, filterStatus, filterMonth, search]);

  // ── KPI ──
  const kpi = useMemo(() => {
    const currency   = enriched[0]?.currency || "UZS";
    const receivable = enriched
      .filter(a => a.type === "income" && a.derivedStatus !== "paid")
      .reduce((s, a) => {
        const paid = (a.linkedPayments || [])
          .reduce((ps, id) => {
            const t = transactions.find(tx => tx.id === id);
            return ps + (t ? Math.abs(Number(t.Sum ?? t.amount ?? 0)) : 0);
          }, 0);
        return s + Math.max(0, Math.abs(a.amount || 0) - paid);
      }, 0);
    const payable    = enriched
      .filter(a => a.type === "expense" && a.derivedStatus !== "paid")
      .reduce((s, a) => {
        const paid = (a.linkedPayments || [])
          .reduce((ps, id) => {
            const t = transactions.find(tx => tx.id === id);
            return ps + (t ? Math.abs(Number(t.Sum ?? t.amount ?? 0)) : 0);
          }, 0);
        return s + Math.max(0, Math.abs(a.amount || 0) - paid);
      }, 0);
    const overdueCount = enriched.filter(a => a.derivedStatus === "overdue").length;
    const totalIncome  = enriched.filter(a => a.type === "income") .reduce((s, a) => s + Math.abs(a.amount || 0), 0);
    const totalExpense = enriched.filter(a => a.type === "expense").reduce((s, a) => s + Math.abs(a.amount || 0), 0);
    return { receivable, payable, overdueCount, totalIncome, totalExpense, currency };
  }, [enriched, transactions]);

  const inputStyle = {
    fontFamily: "inherit", fontSize: 12, padding: "5px 9px",
    border: `0.5px solid ${C.borderMid}`, borderRadius: 4,
    background: C.surface, color: C.ink, outline: "none",
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
      <div style={{ fontSize: 13, color: C.inkLight }}>Загрузка данных…</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: "100%", color: C.ink }}>

      {/* ── Заголовок ── */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: C.ink }}>
          Начисления
        </h1>
        <p style={{ margin: "4px 0 0" }}>
          <span style={{ padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Accrual basis · метод начисления
          </span>
        </p>
      </div>

      {/* ── KPI плитки ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        background: C.border, border: `1px solid ${C.border}`,
        borderRadius: 8, overflow: "hidden", marginBottom: 14,
      }}>
        <KpiCard
          label="Дебиторка (к получению)"
          value={`+${fmt(kpi.receivable)} ${kpi.currency}`}
          pos={true}
        />
        <KpiCard
          label="Кредиторка (к оплате)"
          value={`−${fmt(kpi.payable)} ${kpi.currency}`}
          pos={false}
          sub={kpi.overdueCount > 0 ? `${kpi.overdueCount} просрочено` : undefined}
        />
        <KpiCard
          label="Начислено доходов"
          value={`+${fmt(kpi.totalIncome)} ${kpi.currency}`}
          pos={true}
        />
        <KpiCard
          label="Начислено расходов"
          value={`−${fmt(kpi.totalExpense)} ${kpi.currency}`}
          pos={false}
        />
      </div>

      {/* ── Форма добавления ── */}
      {showForm && (
        <AccrualForm
          categories={categories} projects={projects} counterparties={counterparties}
          onSave={handleAdd} onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Фильтры — точно как в CashFlow ── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "16px 20px", marginBottom: 14,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>

          {/* Поиск */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Поиск</div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Контрагент, категория…"
              style={{ ...inputStyle, width: 200 }}
            />
          </div>

          {/* Тип */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Тип</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["income","Доходы"],["expense","Расходы"]].map(([v,l]) => (
                <Pill key={v} label={l} active={filterType === v} onClick={() => setFilterType(v)} />
              ))}
            </div>
          </div>

          {/* Статус */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Статус</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[["all","Все"],["pending","Не оплачено"],["partial","Частично"],["paid","Оплачено"],["overdue","Просрочено"]].map(([v,l]) => (
                <Pill key={v} label={l} active={filterStatus === v} onClick={() => setFilterStatus(v)} />
              ))}
            </div>
          </div>

          {/* Месяц */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Месяц начисления</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="month" value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{ ...inputStyle, width: 150 }}
              />
              {filterMonth && (
                <button onClick={() => setFilterMonth("")} style={{ fontSize: 12, color: C.inkLight, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              )}
            </div>
          </div>

          {/* Добавить */}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowForm(v => !v)} style={{
              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
              padding: "8px 20px", borderRadius: 6, border: "none",
              background: showForm ? C.border : C.accent,
              color: showForm ? C.inkMid : "#fff",
              cursor: "pointer", transition: "all 0.12s",
            }}>
              {showForm ? "✕ Свернуть" : "+ Добавить"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Список ── */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden",
      }}>
        {/* Шапка списка */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.inkLight }}>
            Начисления · {filtered.length} из {enriched.length}
          </span>
          <span style={{ fontSize: 11, color: C.inkLight }}>
            нажмите строку → детали и оплаты
          </span>
        </div>

        {/* Пустое состояние */}
        {filtered.length === 0 && (
          <div style={{
            padding: "60px 24px", textAlign: "center",
            background: C.surface,
          }}>
            <div style={{ fontSize: 13, color: C.inkLight, marginBottom: 14 }}>
              {enriched.length === 0 ? "Нет начислений" : "Ничего не найдено по фильтрам"}
            </div>
            {enriched.length === 0 && (
              <button onClick={() => setShowForm(true)} style={{
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                padding: "9px 22px", borderRadius: 6, border: "none",
                background: C.accent, color: "#fff", cursor: "pointer",
              }}>+ Добавить первое начисление</button>
            )}
          </div>
        )}

        {/* Строки */}
        <div style={{ padding: filtered.length > 0 ? "8px" : 0 }}>
          {filtered.map(a => (
            <AccrualRow
              key={a.id}
              accrual={a}
              categories={categories}
              projects={projects}
              counterparties={counterparties}
              transactions={transactions}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

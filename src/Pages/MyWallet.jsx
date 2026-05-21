import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../firebase";
import {
  updateDoc, deleteDoc, doc,
  collection, addDoc, getDocs,
} from "firebase/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCompanyId = () => {
  const id = window.__finlab_user?.companyId || auth.currentUser?.uid;
  if (!id) throw new Error("Пользователь не авторизован");
  return id;
};
const userCol = (name) => collection(db, "users", getCompanyId(), name);
const userDoc = (name, id) => doc(db, "users", getCompanyId(), name, id);

// ─── Avatar colors ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#E6F1FB", "#185FA5"],
  ["#EAF3DE", "#3B6D11"],
  ["#FAEEDA", "#854F0B"],
  ["#FCEBEB", "#A32D2D"],
  ["#EEEDFE", "#3C3489"],
  ["#E1F5EE", "#0F6E56"],
];
function getAvatarColors(name) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const ACCOUNT_TYPES = ["Наличный", "Банковский", "Расчётный", "Карточный", "Кредитный"];
const CURRENCIES    = ["UZS", "USD", "EUR", "RUB"];
const CREDIT_TYPES  = ["Кредитный"];

const EMPTY_FORM = () => ({
  name: "", entityId: "", entityName: "",
  type: "Наличный", balance: "",
  balanceDate: new Date().toISOString().slice(0, 10),
  currency: "UZS", comment: "",
});

const MONTH_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
}

function calcActualBalance(initialBalance, transactions) {
  return transactions.reduce((acc, tx) => {
    const amt = Number(tx.amount || 0);
    if (tx.type === "income" || tx.type === "transfer_in")  return acc + amt;
    if (tx.type === "expense" || tx.type === "transfer_out") return acc - amt;
    return acc + amt;
  }, Number(initialBalance || 0));
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inp = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 12px",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)",
  fontSize: 14,
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "var(--font-sans)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="3" y1="4" x2="13" y2="4"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10h8l1-10"/>
  </svg>
);

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", padding: "24px 28px", width: 360, maxWidth: "95vw" }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>Подтвердите действие</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>Отмена</button>
          <button onClick={onConfirm} style={{ padding: "8px 18px", background: "#A32D2D", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Modal ────────────────────────────────────────────────────────────
function AccountModal({ initial, entities, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm]     = useState(initial ? { ...initial } : EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const balanceWarn = Number(form.balance) < 0 && !CREDIT_TYPES.includes(form.type)
    ? "Начальный баланс отрицательный для не-кредитного счёта" : "";

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleEntityChange = (id) => {
    const ent = entities.find((e) => e.id === id);
    set("entityId", ent?.id || "");
    set("entityName", ent?.name || "");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setErr("Введите название счёта"); return; }
    setSaving(true); setErr("");
    try { await onSave(form); } catch (e) { setErr(e.message); setSaving(false); }
  };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>{isEdit ? "Редактировать счёт" : "Создать счёт"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>
        {err && <div style={{ marginBottom: 12, padding: "8px 12px", background: "#FCEBEB", color: "#A32D2D", borderRadius: "var(--border-radius-md)", fontSize: 13 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Название счёта *</div>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Напр. Ipotekabank" style={inp} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Юрлицо</div>
            <select value={form.entityId || ""} onChange={(e) => handleEntityChange(e.target.value)} style={inp}>
              <option value="">— Без юрлица</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Тип счёта</div>
            <select value={form.type || "Наличный"} onChange={(e) => set("type", e.target.value)} style={inp}>
              {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Валюта</div>
            <select value={form.currency || "UZS"} onChange={(e) => set("currency", e.target.value)} style={inp}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Начальный баланс</div>
            <input type="number" value={form.balance} onChange={(e) => set("balance", e.target.value)} placeholder="0" style={{ ...inp, borderColor: balanceWarn ? "#A32D2D" : undefined }} />
            {balanceWarn && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 3 }}>{balanceWarn}</div>}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Дата начального баланса</div>
            <input type="date" value={form.balanceDate || ""} onChange={(e) => set("balanceDate", e.target.value)} style={inp} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Комментарий</div>
            <textarea value={form.comment || ""} onChange={(e) => set("comment", e.target.value)} placeholder="Необязательно…" rows={2} style={{ ...inp, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>Отмена</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "9px 22px", background: saving ? "#8fa8e8" : "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────
function SummaryBar({ accounts }) {
  const byCurrency = {};
  for (const acc of accounts) {
    const cur = acc.currency || "UZS";
    const bal = acc._actualBalance ?? Number(acc.balance || 0);
    byCurrency[cur] = (byCurrency[cur] || 0) + bal;
  }
  const entries = Object.entries(byCurrency);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {entries.map(([cur, total]) => {
        const isPos = total >= 0;
        return (
          <div key={cur} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Итого {cur}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: isPos ? "#3B6D11" : "#A32D2D" }}>
              {isPos ? "" : "−"}{Math.abs(total).toLocaleString("ru-RU")} {cur}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Card View ────────────────────────────────────────────────────────────────
function AccountCard({ account, onEdit, onDelete }) {
  const [avatarBg, avatarColor] = getAvatarColors(account.name);
  const actualBalance = account._actualBalance ?? Number(account.balance || 0);
  const isPos         = actualBalance >= 0;
  const isCreditType  = CREDIT_TYPES.includes(account.type);
  const showWarning   = !isPos && !isCreditType;

  return (
    <div style={{ background: "var(--color-background-primary)", border: showWarning ? "0.5px solid #A32D2D" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20, display: "flex", flexDirection: "column", transition: "border-color 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
            {account.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{account.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>{account.entityName || "Без юрлица"}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: avatarBg, color: avatarColor, fontWeight: 500 }}>{account.currency || "UZS"}</span>
      </div>

      {/* Balance */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Актуальный баланс</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: isPos ? "#3B6D11" : "#A32D2D" }}>
          {isPos ? "" : "−"}{Math.abs(actualBalance).toLocaleString("ru-RU")} {account.currency || "UZS"}
        </div>
        {showWarning && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 4 }}>⚠ Баланс отрицательный — проверьте транзакции</div>}
        {account.balance !== undefined && (
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Нач. баланс: {Number(account.balance).toLocaleString("ru-RU")} · на {fmtDate(account.balanceDate) || "—"}
          </div>
        )}
      </div>

      {/* Tx count */}
      {account._txCount !== undefined && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Транзакций</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{account._txCount}</div>
          </div>
          {account._lastTxDate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Последняя</div>
              <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{fmtDate(account._lastTxDate)}</div>
            </div>
          )}
        </div>
      )}

      {/* Type + Currency */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: account.comment ? 10 : 14 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Тип</div>
          <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{account.type || "—"}</div>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Валюта</div>
          <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{account.currency || "UZS"}</div>
        </div>
      </div>

      {account.comment && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Комментарий</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{account.comment}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: "auto" }}>
        <button onClick={() => onEdit(account)} style={{ flex: 1, padding: "7px 0", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Изменить</button>
        <button onClick={() => onDelete(account)} style={{ padding: "7px 12px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "#A32D2D", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Удалить</button>
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────
function AccountTable({ accounts, onEdit, onDelete }) {
  const COL_HDR = { padding: "9px 14px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "0.5px solid var(--color-border-secondary)", whiteSpace: "nowrap" };

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              <th style={{ ...COL_HDR, textAlign: "left" }}>Счёт</th>
              <th style={{ ...COL_HDR, textAlign: "left" }}>Юрлицо</th>
              <th style={{ ...COL_HDR, textAlign: "left" }}>Тип</th>
              <th style={{ ...COL_HDR, textAlign: "left" }}>Валюта</th>
              <th style={{ ...COL_HDR, textAlign: "right" }}>Нач. баланс</th>
              <th style={{ ...COL_HDR, textAlign: "right" }}>Актуальный баланс</th>
              <th style={{ ...COL_HDR, textAlign: "center" }}>Транзакций</th>
              <th style={{ ...COL_HDR, textAlign: "left" }}>Последняя</th>
              <th style={{ ...COL_HDR, textAlign: "center" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, i) => {
              const [avatarBg, avatarColor] = getAvatarColors(account.name);
              const actualBalance = account._actualBalance ?? Number(account.balance || 0);
              const isPos         = actualBalance >= 0;
              const isCreditType  = CREDIT_TYPES.includes(account.type);
              const showWarning   = !isPos && !isCreditType;
              const isLast        = i === accounts.length - 1;
              const rowBorder     = isLast ? "none" : "0.5px solid var(--color-border-tertiary)";

              return (
                <tr key={account.id}
                  style={{ borderBottom: rowBorder, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Name */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {account.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{account.name}</span>
                      {showWarning && <span title="Отрицательный баланс" style={{ fontSize: 12 }}>⚠️</span>}
                    </div>
                  </td>
                  {/* Entity */}
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {account.entityName || <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                  </td>
                  {/* Type */}
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                      {account.type || "—"}
                    </span>
                  </td>
                  {/* Currency */}
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: avatarBg, color: avatarColor, fontWeight: 500 }}>
                      {account.currency || "UZS"}
                    </span>
                  </td>
                  {/* Initial balance */}
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {Number(account.balance || 0).toLocaleString("ru-RU")}
                  </td>
                  {/* Actual balance */}
                  <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isPos ? "#3B6D11" : "#A32D2D", fontVariantNumeric: "tabular-nums" }}>
                      {isPos ? "" : "−"}{Math.abs(actualBalance).toLocaleString("ru-RU")}
                    </span>
                  </td>
                  {/* Tx count */}
                  <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {account._txCount ?? "—"}
                  </td>
                  {/* Last tx */}
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                    {account._lastTxDate ? fmtDate(account._lastTxDate) : "—"}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => onEdit(account)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
                        <IconEdit /> Изменить
                      </button>
                      <button onClick={() => onDelete(account)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "#A32D2D", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
                        <IconTrash /> Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyWallet() {
  const [accounts,   setAccounts]   = useState([]);
  const [entities,   setEntities]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCur,  setFilterCur]  = useState("");
  const [modal,      setModal]      = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [error,      setError]      = useState("");
  const [viewMode,   setViewMode]   = useState("card"); // "card" | "table"

  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 6000); };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [accSnap, entSnap, txSnap] = await Promise.all([
        getDocs(userCol("accounts")),
        getDocs(userCol("legal_entities")),
        getDocs(userCol("transactions")),
      ]);

      const txList = txSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.source !== "split");

      const txByAccount = {};
      for (const tx of txList) {
        const amount = Math.abs(Number(tx.amount || 0));
        if (tx.type === "income" || tx.type === "expense") {
          const accId = tx.accountId || tx.walletId;
          if (!accId) continue;
          if (!txByAccount[accId]) txByAccount[accId] = [];
          txByAccount[accId].push({ ...tx, amount });
        }
        if (tx.type === "transfer") {
          if (tx.walletId) {
            if (!txByAccount[tx.walletId]) txByAccount[tx.walletId] = [];
            txByAccount[tx.walletId].push({ ...tx, type: "transfer_out", amount });
          }
          if (tx.toWalletId) {
            if (!txByAccount[tx.toWalletId]) txByAccount[tx.toWalletId] = [];
            txByAccount[tx.toWalletId].push({ ...tx, type: "transfer_in", amount });
          }
        }
      }

      const accs = accSnap.docs.map((d) => {
        const data   = { id: d.id, ...d.data() };
        const txs    = txByAccount[d.id] || [];
        const sorted = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        return {
          ...data,
          _actualBalance: calcActualBalance(data.balance, txs),
          _txCount:       txs.length,
          _lastTxDate:    sorted[0]?.date || null,
        };
      });

      setAccounts(accs);
      setEntities(entSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showError("Ошибка загрузки: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.name?.toLowerCase().includes(q) ||
      a.entityName?.toLowerCase().includes(q) ||
      a.currency?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q);
    const matchType = !filterType || a.type === filterType;
    const matchCur  = !filterCur  || a.currency === filterCur;
    return matchSearch && matchType && matchCur;
  });

  const handleSave = async (form) => {
    const { id, _actualBalance, _txCount, _lastTxDate, ...data } = form;
    if (id) {
      await updateDoc(userDoc("accounts", id), data);
      await loadData();
    } else {
      const ref = await addDoc(userCol("accounts"), data);
      setAccounts((prev) => [...prev, { ...data, id: ref.id, _actualBalance: Number(data.balance || 0), _txCount: 0, _lastTxDate: null }]);
    }
    setModal(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDel || deleting) return;
    const account = confirmDel;
    setConfirmDel(null);
    setDeleting(account.id);
    try {
      await deleteDoc(userDoc("accounts", account.id));
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    } catch (e) {
      showError("Ошибка удаления: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const hasFilters = search || filterType || filterCur;

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>

      {modal && <AccountModal initial={modal.account || null} entities={entities} onSave={handleSave} onClose={() => setModal(null)} />}
      {confirmDel && <ConfirmDialog message={`Удалить счёт «${confirmDel.name}»? Транзакции счёта останутся в базе.`} onConfirm={handleDeleteConfirmed} onCancel={() => setConfirmDel(null)} />}

      {/* ── Header ── */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Мои счета</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
              {accounts.length} {accounts.length === 1 ? "счёт" : "счетов"} · {entities.length} {entities.length === 1 ? "юрлицо" : "юрлиц"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: 9, pointerEvents: "none", color: "var(--color-text-tertiary)", display: "flex" }}><IconSearch /></span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…"
                style={{ paddingLeft: 28, paddingRight: search ? 28 : 10, paddingTop: 7, paddingBottom: 7, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180 }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>}
            </div>

            {/* Type filter */}
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inp, width: "auto", fontSize: 13, padding: "7px 10px" }}>
              <option value="">Все типы</option>
              {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>

            {/* Currency filter */}
            <select value={filterCur} onChange={(e) => setFilterCur(e.target.value)} style={{ ...inp, width: "auto", fontSize: 13, padding: "7px 10px" }}>
              <option value="">Все валюты</option>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
              {[["card", <IconGrid />], ["table", <IconList />]].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: viewMode === mode ? "var(--color-background-info)" : "var(--color-background-secondary)", color: viewMode === mode ? "var(--color-text-info)" : "var(--color-text-tertiary)", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                  {icon}
                </button>
              ))}
            </div>

            <button onClick={() => setModal({ mode: "create" })}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
              <IconPlus /> Создать счёт
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Summary */}
        {accounts.length > 0 && <SummaryBar accounts={accounts} />}

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", background: "#FCEBEB", color: "#A32D2D", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {error}
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#A32D2D", flexShrink: 0, marginLeft: 8 }}>✕</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
            <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 12 }}>Нет счетов</div>
            <button onClick={() => setModal({ mode: "create" })} style={{ padding: "8px 20px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              + Создать первый счёт
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
            <div style={{ fontSize: 14, color: "var(--color-text-tertiary)", marginBottom: 10 }}>Ничего не найдено по фильтрам</div>
            {hasFilters && (
              <button onClick={() => { setSearch(""); setFilterType(""); setFilterCur(""); }} style={{ padding: "6px 16px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : viewMode === "card" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {filtered.map((account) => (
              <AccountCard key={account.id} account={account}
                onEdit={(a) => setModal({ mode: "edit", account: a })}
                onDelete={(a) => !deleting && setConfirmDel(a)}
              />
            ))}
          </div>
        ) : (
          <AccountTable accounts={filtered}
            onEdit={(a) => setModal({ mode: "edit", account: a })}
            onDelete={(a) => !deleting && setConfirmDel(a)}
          />
        )}
      </div>
    </div>
  );
}

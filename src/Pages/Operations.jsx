/**
 * OperationsPage.jsx — использует useAppStore вместо прямых getDocs
 * Изменения помечены: // ← STORE
 */

import { useState, useMemo } from "react";
import {
  doc, updateDoc, addDoc, deleteDoc,
  increment, serverTimestamp, collection,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAppStore, store } from "../useAppStore"; // ← STORE

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

const fmt       = (n) => Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (n) => (n >= 0 ? "+ " : "− ") + fmt(n);
const MONTH_NAMES = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const DAY_NAMES   = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function normalizeDate(raw) {
  if (!raw) return "1970-01-01";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
}

function formatDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} — ${DAY_NAMES[d.getDay()]}`;
}

function shortDate(iso) {
  const [y, m, day] = iso.split("-");
  return `${parseInt(day)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function groupByDate(txs) {
  const map = {};
  txs.forEach((tx) => {
    const k = tx._isoDate || "1970-01-01";
    if (!map[k]) map[k] = [];
    map[k].push(tx);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

const AVATAR_COLORS = [
  ["#E6F1FB","#185FA5"],["#EAF3DE","#3B6D11"],["#FAEEDA","#854F0B"],
  ["#FCEBEB","#A32D2D"],["#EEEDFE","#3C3489"],["#E1F5EE","#0F6E56"],
];
const _avatarCache = {};
function getAvatarStyle(name) {
  if (!_avatarCache[name]) {
    const idx = [...(name || "?")].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    _avatarCache[name] = AVATAR_COLORS[idx];
  }
  return _avatarCache[name];
}
function initials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function ProjectPill({ value }) {
  if (!value) return <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>—</span>;
  return (
    <span style={{
      fontSize: 12, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
      whiteSpace: "nowrap", display: "inline-block", maxWidth: 130,
      overflow: "hidden", textOverflow: "ellipsis",
      background: "var(--color-background-secondary)",
      color: "var(--color-text-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
    }}>
      {value}
    </span>
  );
}

function TypeBadge({ type }) {
  const map = {
    income:   { bg: "#EAF3DE", color: "#3B6D11", label: "Прих." },
    expense:  { bg: "#FCEBEB", color: "#A32D2D", label: "Расх." },
    transfer: { bg: "#E6F1FB", color: "#185FA5", label: "Перев." },
  };
  const s = map[type] || map.expense;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>{s.label}</span>;
}

function Dropdown({ options, value, onChange, placeholder = "Выбрать" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" };

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Начните вводить название" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Не выбрано</div>
            {filtered.map((opt) => (
              <div key={opt} onClick={() => { onChange(opt); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: opt === value ? "var(--color-background-info)" : "transparent", color: opt === value ? "var(--color-text-info)" : "var(--color-text-primary)", fontWeight: opt === value ? 500 : 400 }} onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}>{opt}</div>
            ))}
            {!filtered.length && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function WalletDropdown({ wallets, value, onChange, placeholder = "Выбрать счёт" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = wallets.filter((w) => w.name.toLowerCase().includes(q.toLowerCase()));
  const selected = wallets.find((w) => w.id === value);
  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" };

  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", fontSize: 14, color: selected ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? `${selected.name} · ${Number(selected.balance || 0).toLocaleString("ru-RU")} ${selected.currency || ""}` : placeholder}
        </span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск счёта…" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(null); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Без счёта</div>
            {filtered.map((w) => (
              <div key={w.id} onClick={() => { onChange(w); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: w.id === value ? "var(--color-background-info)" : "transparent", color: w.id === value ? "var(--color-text-info)" : "var(--color-text-primary)" }} onMouseEnter={(e) => { if (w.id !== value) e.currentTarget.style.background = "var(--color-background-secondary)"; }} onMouseLeave={(e) => { if (w.id !== value) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ fontWeight: 500 }}>{w.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 1 }}>{Number(w.balance || 0).toLocaleString("ru-RU")} {w.currency || "UZS"}</div>
              </div>
            ))}
            {!filtered.length && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Нет счетов</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionModal({ tx, wallets, projects, categories, onSave, onDelete, onClose }) {
  const isEdit     = Boolean(tx);
  const isImported = tx?._source === "imported";

  const [form, setForm] = useState(() =>
    tx
      ? { ...tx, amount: Math.abs(tx.amount) }
      : { _isoDate: new Date().toISOString().slice(0, 10), walletId: "", walletName: "", counterparty: "", category: "", description: "", direction: "", amount: "", type: "expense" }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inp = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" };

  const handleWalletChange = (wallet) => {
    if (!wallet) { set("walletId", ""); set("walletName", ""); }
    else { set("walletId", wallet.id); set("walletName", wallet.name); }
  };

  const handleSave = () => {
    const amount = parseFloat(form.amount) || 0;
    const signed = form.type === "expense" ? -Math.abs(amount) : Math.abs(amount);
    onSave({ ...form, amount: signed });
  };

  const projectNames = projects.map((p) => p.name);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{isEdit ? "Редактировать операцию" : "Новая операция"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {isImported && (
          <div style={{ marginBottom: 14, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", lineHeight: 1.6 }}>
            📄 <strong>{tx.fileName}</strong>{tx.walletName ? ` · Счёт: ${tx.walletName}` : ""}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["expense","Списание"],["income","Поступление"],["transfer","Перевод"]].map(([t, label]) => (
            <button key={t} onClick={() => set("type", t)} style={{ flex: 1, padding: "8px 0", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: form.type === t ? 500 : 400, background: form.type === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: form.type === t ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        {[
          ["Дата",       <input key="d" type="date" value={form._isoDate} onChange={(e) => set("_isoDate", e.target.value)} style={inp} />],
          ["Сумма",      <input key="a" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" style={inp} />],
          ["Контрагент", <input key="c" value={form.counterparty} onChange={(e) => set("counterparty", e.target.value)} placeholder="Введите контрагента" style={inp} />],
          ["Счёт",
            isImported
              ? <div key="acc-ro" style={{ ...inp, background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", cursor: "not-allowed", display: "flex", alignItems: "center" }}>{tx.walletName || "—"}</div>
              : <WalletDropdown key="acc" wallets={wallets} value={form.walletId} onChange={handleWalletChange} />
          ],
          ["Статья",  <Dropdown key="cat" options={categories} value={form.category} onChange={(v) => set("category", v)} placeholder="Выбрать статью" />],
          ["Детали",  <input key="desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Описание" style={inp} />],
          ["Проект",  <Dropdown key="dir" options={projectNames} value={form.direction} onChange={(v) => set("direction", v)} placeholder="Выбрать проект" />],
        ].map(([label, field]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
            {field}
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} style={{ flex: 1, padding: "10px 0", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            {isEdit ? "Сохранить" : "Добавить"}
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
          {isEdit && (
            <button onClick={() => onDelete(tx.id)} style={{ padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)" }}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FILTERS = {
  type: "all", amountFrom: "", amountTo: "", category: "",
  counterparty: "", account: "", direction: "", description: "",
  dateFrom: "", dateTo: "",
};

function FilterModal({ filters, allCounterparties, allAccounts, projects, categories, onApply, onClose }) {
  const [f, setF] = useState(filters);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = { flex: 1, padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" };
  const projectNames = projects.map((p) => p.name);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "24px 28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 500 }}>Фильтр</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["all","Все"],["expense","Списания"],["income","Поступления"],["transfer","Переводы"]].map(([t, label]) => (
            <button key={t} onClick={() => set("type", t)} style={{ flex: 1, padding: "7px 0", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, background: f.type === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: f.type === t ? "var(--color-text-info)" : "var(--color-text-secondary)", fontWeight: f.type === t ? 500 : 400 }}>{label}</button>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Сумма</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="От" value={f.amountFrom} onChange={(e) => set("amountFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="number" placeholder="До" value={f.amountTo} onChange={(e) => set("amountTo", e.target.value)} style={inp} />
          </div>
        </div>
        {[
          ["Статья",     <Dropdown key="cat" options={categories} value={f.category} onChange={(v) => set("category", v)} placeholder="Выбрать" />],
          ["Контрагент", <Dropdown key="cp" options={allCounterparties} value={f.counterparty} onChange={(v) => set("counterparty", v)} placeholder="Выбрать" />],
          ["Счёт",       <Dropdown key="acc" options={allAccounts} value={f.account} onChange={(v) => set("account", v)} placeholder="Выбрать" />],
          ["Проект",     <Dropdown key="dir" options={projectNames} value={f.direction} onChange={(v) => set("direction", v)} placeholder="Выбрать проект" />],
          ["Описание",   <input key="desc" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Описание" style={{ ...inp, width: "100%" }} />],
        ].map(([label, field]) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
            {field}
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Период</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={f.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="date" value={f.dateTo} onChange={(e) => set("dateTo", e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "center" }}>
          <button onClick={() => onApply(f)} style={{ padding: "10px 24px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Фильтровать</button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Закрыть</button>
          <button onClick={() => onApply({ ...EMPTY_FILTERS })} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Очистить</button>
        </div>
      </div>
    </div>
  );
}

const COL_HDR = { padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" };
const GRID = "40px 110px 1fr 160px 140px 130px 110px 80px";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OperationsPage() {
  // ← STORE: один хук вместо getDocs + useState для каждой коллекции
  const {
    transactions, accounts: wallets, projects, categories,
    loading, error: storeError, refresh,
  } = useAppStore();

  const [localError,  setLocalError]  = useState("");
  const [filters,     setFilters]     = useState({ ...EMPTY_FILTERS });
  const [activeTab,   setActiveTab]   = useState("all");
  const [showFilter,  setShowFilter]  = useState(false);
  const [modal,       setModal]       = useState(null);
  const [search,      setSearch]      = useState("");

  const error = localError || storeError || "";

  // ── Derived ───────────────────────────────────────────────────────────────
  const allCounterparties = useMemo(() =>
    [...new Set(transactions.map((t) => t.counterparty).filter(Boolean))].sort(),
    [transactions]
  );
  const allAccounts = useMemo(() =>
    [...new Set(transactions.map((t) => t.walletName).filter(Boolean))].sort(),
    [transactions]
  );

  const filtered = useMemo(() => transactions.filter((tx) => {
    if (activeTab !== "all" && tx.type !== activeTab) return false;
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.category     && tx.category     !== filters.category)     return false;
    if (filters.counterparty && tx.counterparty !== filters.counterparty) return false;
    if (filters.account      && tx.walletName   !== filters.account)      return false;
    if (filters.direction    && tx.direction    !== filters.direction)     return false;
    if (filters.description  && !tx.description?.toLowerCase().includes(filters.description.toLowerCase())) return false;
    if (filters.amountFrom   && Math.abs(tx.amount) < parseFloat(filters.amountFrom)) return false;
    if (filters.amountTo     && Math.abs(tx.amount) > parseFloat(filters.amountTo))   return false;
    if (filters.dateFrom     && tx._isoDate < filters.dateFrom) return false;
    if (filters.dateTo       && tx._isoDate > filters.dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(tx.counterparty?.toLowerCase().includes(q) || tx.description?.toLowerCase().includes(q) || tx.category?.toLowerCase().includes(q) || tx.direction?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [transactions, filters, activeTab, search]);

  const grouped      = useMemo(() => groupByDate(filtered), [filtered]);
  const totalIncome  = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome + totalExpense;
  const hasFilters   = Object.entries(filters).some(([k, v]) => k === "type" ? v !== "all" : Boolean(v));

  const dateRange = useMemo(() => {
    const dates = transactions.map((t) => t._isoDate).filter(Boolean).sort();
    if (!dates.length) return "Все время";
    return `${shortDate(dates[0])} – ${shortDate(dates[dates.length - 1])}`;
  }, [transactions]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveTx = async (tx) => {
    try {
      if (tx._docId) {
        const oldTx       = transactions.find((t) => t.id === tx.id);
        const oldAmount   = oldTx?.amount   || 0;
        const newAmount   = tx.amount;
        const oldWalletId = oldTx?.walletId;
        const newWalletId = tx.walletId;

        await updateDoc(userDoc("transactions", tx._docId), {
          date: tx._isoDate, amount: newAmount, counterparty: tx.counterparty,
          category: tx.category, description: tx.description, direction: tx.direction,
          type: tx.type, walletId: newWalletId || "", walletName: tx.walletName || "",
        });

        if (oldWalletId === newWalletId) {
          const diff = newAmount - oldAmount;
          if (newWalletId && diff !== 0) {
            await updateDoc(userDoc("accounts", newWalletId), { balance: increment(diff) });
            store.updateAccount(newWalletId, { balance: (wallets.find(w => w.id === newWalletId)?.balance || 0) + diff }); // ← STORE
          }
        } else {
          if (oldWalletId && oldAmount !== 0) {
            await updateDoc(userDoc("accounts", oldWalletId), { balance: increment(-oldAmount) });
            store.updateAccount(oldWalletId, { balance: (wallets.find(w => w.id === oldWalletId)?.balance || 0) - oldAmount }); // ← STORE
          }
          if (newWalletId && newAmount !== 0) {
            await updateDoc(userDoc("accounts", newWalletId), { balance: increment(newAmount) });
            store.updateAccount(newWalletId, { balance: (wallets.find(w => w.id === newWalletId)?.balance || 0) + newAmount }); // ← STORE
          }
        }

        // ← STORE: обновляем кэш вместо setState
        store.updateTransaction(tx.id, { ...tx, _isoDate: normalizeDate(tx._isoDate) });

      } else {
        const docData = {
          date: tx._isoDate, amount: tx.amount, counterparty: tx.counterparty,
          category: tx.category, description: tx.description, direction: tx.direction,
          type: tx.type, walletId: tx.walletId || "", walletName: tx.walletName || "",
          source: "manual", fileName: "", createdAt: serverTimestamp(),
        };

        const ref = await addDoc(userCol("transactions"), docData);

        if (tx.walletId && tx.amount !== 0) {
          await updateDoc(userDoc("accounts", tx.walletId), { balance: increment(tx.amount) });
          store.updateAccount(tx.walletId, { balance: (wallets.find(w => w.id === tx.walletId)?.balance || 0) + tx.amount }); // ← STORE
        }

        // ← STORE: добавляем в кэш
        store.addTransaction({
          ...docData,
          id: ref.id, _docId: ref.id,
          _isoDate: normalizeDate(tx._isoDate),
          _source: "manual",
        });
      }
    } catch (e) {
      setLocalError("Ошибка сохранения: " + e.message);
    }
    setModal(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    try {
      await deleteDoc(userDoc("transactions", tx._docId));
      if (tx.walletId && tx.amount !== 0) {
        await updateDoc(userDoc("accounts", tx.walletId), { balance: increment(-tx.amount) });
        store.updateAccount(tx.walletId, { balance: (wallets.find(w => w.id === tx.walletId)?.balance || 0) - tx.amount }); // ← STORE
      }
      store.deleteTransaction(id); // ← STORE
    } catch (e) {
      setLocalError("Ошибка удаления: " + e.message);
    }
    setModal(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>

      {modal && (
        <TransactionModal
          tx={modal.tx} wallets={wallets} projects={projects} categories={categories}
          onSave={handleSaveTx} onDelete={handleDelete} onClose={() => setModal(null)}
        />
      )}
      {showFilter && (
        <FilterModal
          filters={filters} allCounterparties={allCounterparties} allAccounts={allAccounts}
          projects={projects} categories={categories}
          onApply={(f) => { setFilters(f); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>

        <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Операции</h1>
              {/* ← STORE: refresh вместо loadData */}
              <button onClick={refresh} title="Обновить" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16, padding: 4 }}>↻</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg style={{ position: "absolute", left: 8, pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…" style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180 }} />
              </div>
              <button onClick={() => setShowFilter(true)} style={{ padding: "6px 12px", border: hasFilters ? "1px solid #3b62d6" : "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: hasFilters ? "var(--color-background-info)" : "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: hasFilters ? "var(--color-text-info)" : "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 8h6M7 12h2"/></svg>
                Фильтр{hasFilters ? " ●" : ""}
              </button>
              {hasFilters && <button onClick={() => setFilters({ ...EMPTY_FILTERS })} style={{ fontSize: 12, color: "var(--color-text-danger)", background: "none", border: "none", cursor: "pointer" }}>✕ Сбросить</button>}
              <button onClick={() => setModal({ mode: "add" })} style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#3b62d6", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ Добавить операцию</button>
            </div>
          </div>
          <div style={{ display: "flex" }}>
            {[["Операции", true], ["Автоправила", false]].map(([label, active]) => (
              <div key={label} style={{ padding: "10px 16px", fontSize: 14, cursor: "pointer", borderBottom: active ? "2px solid #3b62d6" : "2px solid transparent", color: active ? "#3b62d6" : "var(--color-text-secondary)", fontWeight: active ? 500 : 400 }}>{label}</div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ margin: "12px 24px 0", padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => setLocalError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
          </div>
        )}

        <div style={{ background: "var(--color-background-primary)", marginTop: 1, padding: "12px 24px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "5px 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
            ❮ <span style={{ margin: "0 4px" }}>{dateRange}</span> ❯
          </div>
          {[["all","Все"],["expense","Списания"],["income","Поступления"],["transfer","Переводы"]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "6px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", background: activeTab === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: activeTab === t ? "var(--color-text-info)" : "var(--color-text-secondary)", fontWeight: activeTab === t ? 500 : 400 }}>{label}</button>
          ))}
          <button style={{ padding: "6px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
            Без статьи ({transactions.filter((t) => !t.category).length})
          </button>
        </div>

        <div style={{ background: "var(--color-background-primary)", marginTop: 1, padding: "10px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10 }}>
          {[
            { label: "Поступления", value: filtered.filter(t => t.amount > 0).length ? `+ ${fmt(totalIncome)}` : "—", color: "#3B6D11" },
            { label: "Списания",    value: filtered.filter(t => t.amount < 0).length ? `− ${fmt(Math.abs(totalExpense))}` : "—", color: "#A32D2D" },
            { label: "Сальдо",      value: filtered.length ? fmtSigned(balance) : "—", color: balance >= 0 ? "#3B6D11" : "#A32D2D" },
            { label: "Операций",    value: filtered.length || "—", color: "var(--color-text-secondary)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 14px", flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 500, color }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--color-background-primary)", marginTop: 1, overflowX: "auto" }}>
          <div style={{ minWidth: 960 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={COL_HDR} />
              {["Дата","Контрагент / Детали","Статья","Проект","Счёт","Сумма","Тип"].map((h, i) => (
                <div key={h} style={{ ...COL_HDR, textAlign: i === 5 ? "right" : i === 6 ? "center" : "left" }}>{h}</div>
              ))}
            </div>

            {loading && <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка операций…</div>}

            {!loading && grouped.length === 0 && (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                  {transactions.length === 0 ? "Нет операций" : "Нет операций по выбранным фильтрам"}
                </div>
                {(hasFilters || search) && (
                  <button onClick={() => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); }} style={{ marginTop: 12, padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>Сбросить фильтры</button>
                )}
              </div>
            )}

            {!loading && grouped.map(([date, txs]) => (
              <div key={date}>
                <div style={{ padding: "6px 16px 6px 56px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {formatDateLabel(date)}
                </div>
                {txs.map((tx) => {
                  const [avatarBg, avatarColor] = getAvatarStyle(tx.counterparty);
                  const isPos = tx.amount >= 0;
                  return (
                    <div key={tx.id}
                      onClick={() => setModal({ mode: "edit", tx })}
                      style={{ display: "grid", gridTemplateColumns: GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer", alignItems: "center" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ padding: "10px 0" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500 }}>
                          {initials(tx.counterparty)}
                        </div>
                      </div>
                      <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>{date.split("-").reverse().join(".")}</div>
                      <div style={{ padding: "10px 8px", overflow: "hidden" }}>
                        <div style={{ fontSize: 13, fontWeight: tx.counterparty ? 500 : 400, color: tx.counterparty ? "var(--color-text-primary)" : "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.counterparty || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description || (tx.source === "manual" ? "Ручная операция" : tx.fileName ? `📄 ${tx.fileName}` : "")}</div>
                      </div>
                      <div style={{ padding: "10px 8px", overflow: "hidden" }}>
                        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.category || "—"}</span>
                      </div>
                      <div style={{ padding: "10px 8px" }}><ProjectPill value={tx.direction} /></div>
                      <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.walletName || "—"}</div>
                      <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", color: isPos ? "#3B6D11" : "#A32D2D" }}>{fmtSigned(tx.amount)}</div>
                      <div style={{ padding: "10px 8px", textAlign: "center" }}><TypeBadge type={tx.type} /></div>
                    </div>
                  );
                })}
              </div>
            ))}

            {!loading && filtered.length > 0 && (
              <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-secondary)" }}>
                <span>{filtered.filter((t) => t.amount > 0).length} поступлений <span style={{ color: "#3B6D11", fontWeight: 500 }}>+{fmt(totalIncome)}</span></span>
                <span>{filtered.filter((t) => t.amount < 0).length} списаний <span style={{ color: "#A32D2D", fontWeight: 500 }}>−{fmt(Math.abs(totalExpense))}</span></span>
                <span>Сальдо: <span style={{ color: balance >= 0 ? "#3B6D11" : "#A32D2D", fontWeight: 500 }}>{fmtSigned(balance)}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from "react";
import {
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, collection, onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAppStore } from "../Pages/useAppStore";

// ─── Firebase helpers ──────────────────────────────────────────────────────────
const uid     = ()       => auth.currentUser?.uid;
const userCol = (n)      => collection(db, "users", uid(), n);
const userDoc = (n, id)  => doc(db, "users", uid(), n, id);

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmt    = (n = 0) => Number(n).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n = 0) => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
const fmtK   = (n = 0) =>
  Math.abs(n) >= 1_000_000 ? (n / 1_000_000).toFixed(1) + " млн"
  : Math.abs(n) >= 1_000   ? (n / 1_000).toFixed(0)     + " тыс"
  : fmt(n);

const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const DAYS   = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const todayISO = () => new Date().toISOString().slice(0, 10);

function normalizeDate(raw) {
  if (!raw) return "";
  if (raw?.toDate) return raw.toDate().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(String(raw))) return String(raw).slice(0, 10);
  const p = String(raw).split(".");
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
  return String(raw);
}

function shortDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`;
}
function longDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} — ${DAYS[d.getDay()]}`;
}
function daysLeft(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso + "T00:00:00") - new Date()) / 86_400_000);
}

// ─── Document types (закупка) ──────────────────────────────────────────────────
const DOC_TYPES = [
  { id: "order",    label: "Заказ",        icon: "📋", color: "#3C3489", bg: "#EEEDFE" },
  { id: "invoice",  label: "Счёт",         icon: "🧾", color: "#854F0B", bg: "#FAEEDA" },
  { id: "receipt",  label: "Приходная",    icon: "📥", color: "#185FA5", bg: "#E6F1FB" },
  { id: "act",      label: "Акт услуг",    icon: "🛠",  color: "#0F6E56", bg: "#E1F5EE" },
  { id: "return",   label: "Возврат",      icon: "↩",  color: "#A32D2D", bg: "#FCEBEB" },
];
const TYPE_MAP = Object.fromEntries(DOC_TYPES.map((t) => [t.id, t]));

// ─── Document statuses ─────────────────────────────────────────────────────────
const DOC_STATUSES = [
  { id: "draft",     label: "Черновик",    color: "#6B7280", bg: "#F3F4F6" },
  { id: "sent",      label: "Отправлен",   color: "#3C3489", bg: "#EEEDFE" },
  { id: "confirmed", label: "Подтверждён", color: "#185FA5", bg: "#E6F1FB" },
  { id: "delivered", label: "Получен",     color: "#0F6E56", bg: "#E1F5EE" },
  { id: "paid",      label: "Оплачен",     color: "#3B6D11", bg: "#EAF3DE" },
  { id: "partial",   label: "Частично",    color: "#854F0B", bg: "#FAEEDA" },
  { id: "overdue",   label: "Просрочен",   color: "#A32D2D", bg: "#FCEBEB" },
  { id: "cancelled", label: "Отменён",     color: "#6B7280", bg: "#F3F4F6" },
];
const STATUS_MAP = Object.fromEntries(DOC_STATUSES.map((s) => [s.id, s]));

const VAT_RATES = [0, 12, 15, 20];

// ─── Calc totals ───────────────────────────────────────────────────────────────
function calcTotals(items = []) {
  let subtotal = 0, vatAmount = 0;
  items.forEach((item) => {
    const price = parseFloat(item.price)    || 0;
    const qty   = parseFloat(item.qty)      || 0;
    const disc  = parseFloat(item.discount) || 0;
    const vat   = parseFloat(item.vat)      || 0;
    const base  = price * qty * (1 - disc / 100);
    subtotal  += base;
    vatAmount += base * vat / 100;
  });
  return { subtotal, vatAmount, total: subtotal + vatAmount };
}

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(docs) {
  const h = ["Дата","Номер","Тип","Поставщик","Статус","Позиций","Сумма б/НДС","НДС","Итого","Оплачено","Долг","Срок оплаты","Срок доставки"];
  const rows = docs.map((d) => [
    d._isoDate, d.number,
    TYPE_MAP[d.type]?.label   || d.type,
    d.supplierName,
    STATUS_MAP[d.status]?.label || d.status,
    d.items?.length || 0,
    d.subtotal, d.vatAmount, d.total, d.paid || 0,
    Math.max(0, (d.total || 0) - (d.paid || 0)),
    d.dueDate || "", d.deliveryDate || "",
  ]);
  const csv = [h, ...rows].map((r) =>
    r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `закупки_${todayISO()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Avatar helpers ────────────────────────────────────────────────────────────
const AV_COLORS = [
  ["#E6F1FB","#185FA5"],["#EAF3DE","#3B6D11"],["#FAEEDA","#854F0B"],
  ["#FCEBEB","#A32D2D"],["#EEEDFE","#3C3489"],["#E1F5EE","#0F6E56"],
  ["#FDF3EE","#9C4A1A"],["#EEF0FD","#3A4CB0"],
];
const _av = {};
function avatarStyle(name) {
  if (!_av[name]) {
    const i = [...(name || "?")].reduce((s, c) => s + c.charCodeAt(0), 0) % AV_COLORS.length;
    _av[name] = AV_COLORS[i];
  }
  return _av[name];
}
function initials(name) {
  if (!name) return "?";
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Animated number ───────────────────────────────────────────────────────────
function AnimNum({ value, color }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current, end = value, dur = 480, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisp(start + (end - start) * e);
      if (p < 1) requestAnimationFrame(tick);
      else { setDisp(end); prev.current = end; }
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span style={{ color, fontWeight: 700 }}>{fmtK(disp)}</span>;
}

// ─── Badges ────────────────────────────────────────────────────────────────────
function TypeBadge({ typeId, small }) {
  const t = TYPE_MAP[typeId] || { label: typeId, icon: "📄", color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)" };
  return (
    <span style={{
      fontSize: small ? 11 : 12, padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 20, fontWeight: 500, background: t.bg, color: t.color,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
      border: `0.5px solid ${t.color}22`,
    }}>
      <span style={{ fontSize: small ? 10 : 11 }}>{t.icon}</span>{t.label}
    </span>
  );
}

function StatusBadge({ statusId, small }) {
  const s = STATUS_MAP[statusId] || { label: statusId, color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)" };
  return (
    <span style={{
      fontSize: small ? 11 : 12, padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 20, fontWeight: 500, background: s.bg, color: s.color,
      whiteSpace: "nowrap", border: `0.5px solid ${s.color}22`,
    }}>
      {s.label}
    </span>
  );
}

// ─── Generic Dropdown ──────────────────────────────────────────────────────────
function Dropdown({ options, value, onChange, placeholder = "Выбрать", zIndex = 500, getLabel, getValue }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  const getL = getLabel || ((o) => String(o));
  const getV = getValue || ((o) => o);

  const filtered = options.filter((o) => getL(o).toLowerCase().includes(q.toLowerCase()));
  const selLabel = value ? (getL(options.find((o) => getV(o) === value) ?? value) || value) : "";

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const inp = {
    width: "100%", boxSizing: "border-box",
    border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
    padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)", cursor: "pointer",
          background: "var(--color-background-secondary)", fontSize: 14,
          color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36,
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selLabel || placeholder}</span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex,
          background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)", maxHeight: 240, overflow: "hidden",
          display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              — Не выбрано
            </div>
            {filtered.map((opt, i) => {
              const label   = getL(opt);
              const val     = getV(opt);
              const isActive = val === value;
              return (
                <div key={i} onClick={() => { onChange(val, opt); setOpen(false); setQ(""); }}
                  style={{
                    padding: "9px 14px", fontSize: 14, cursor: "pointer",
                    background: isActive ? "var(--color-background-info)" : "transparent",
                    color: isActive ? "var(--color-text-info)" : "var(--color-text-primary)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >{label}</div>
              );
            })}
            {!filtered.length && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product inline search ─────────────────────────────────────────────────────
function ProductSearch({ products, name, type, onSelect, onChangeName, onChangeType }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState(name || "");
  const ref             = useRef(null);

  useEffect(() => { setQ(name || ""); }, [name]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = products.filter((p) => p.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  const inp = {
    padding: "6px 8px", border: "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)", fontSize: 13,
    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
    outline: "none", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", gap: 4 }}>
      <button
        onClick={() => onChangeType(type === "product" ? "service" : "product")}
        title={type === "product" ? "Товар" : "Услуга"}
        style={{ flexShrink: 0, fontSize: 13, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", padding: "4px 7px" }}>
        {type === "service" ? "🛠" : "📦"}
      </button>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); onChangeName(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Наименование…"
        style={inp}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 32, right: 0, zIndex: 700,
          background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)", maxHeight: 200, overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
          {filtered.map((p) => (
            <div key={p.id}
              onClick={() => { onSelect(p); setQ(p.name); setOpen(false); }}
              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11 }}>{p.type === "service" ? "🛠" : "📦"}</span>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.unit || "шт"}</span>
              </span>
              <span style={{ fontSize: 12, color: "#854F0B", fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>
                {fmt(p.costPrice || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lines editor ──────────────────────────────────────────────────────────────
function LinesEditor({ lines, onChange, products }) {
  const add = () => onChange([...lines, {
    id: Date.now(), type: "product", productId: "", name: "", unit: "шт",
    qty: 1, price: "", discount: 0, vat: 0,
  }]);

  const set = (id, k, v) => onChange(lines.map((l) => l.id === id ? { ...l, [k]: v } : l));

  const pick = (lineId, p) => {
    onChange(lines.map((l) => l.id === lineId ? {
      ...l, productId: p.id, name: p.name, type: p.type || "product",
      unit: p.unit || "шт", price: p.costPrice || 0, vat: p.vat || 0,
    } : l));
  };

  const lineTotal = (l) =>
    (parseFloat(l.price) || 0) * (parseFloat(l.qty) || 0) * (1 - (parseFloat(l.discount) || 0) / 100);

  const inp = {
    padding: "6px 8px", border: "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)", fontSize: 13,
    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
    outline: "none", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box",
  };

  const totals = calcTotals(lines);

  return (
    <div>
      {/* Headers */}
      <div style={{
        display: "grid", gridTemplateColumns: "24px 1fr 64px 76px 80px 64px 60px 80px 24px",
        gap: 4, marginBottom: 6, padding: "0 0 6px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}>
        {["#", "Наименование", "Ед", "Кол-во", "Цена", "Скид%", "НДС%", "Сумма", ""].map((h, i) => (
          <div key={i} style={{
            fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            textAlign: i >= 3 && i <= 7 ? "right" : "left",
          }}>{h}</div>
        ))}
      </div>

      {/* Lines */}
      {lines.map((l, idx) => (
        <div key={l.id} style={{
          display: "grid", gridTemplateColumns: "24px 1fr 64px 76px 80px 64px 60px 80px 24px",
          gap: 4, marginBottom: 4, alignItems: "center",
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>{idx + 1}</div>
          <ProductSearch
            products={products} name={l.name} type={l.type}
            onSelect={(p) => pick(l.id, p)}
            onChangeName={(v) => set(l.id, "name", v)}
            onChangeType={(v) => set(l.id, "type", v)}
          />
          <input value={l.unit} onChange={(e) => set(l.id, "unit", e.target.value)} style={{ ...inp, textAlign: "center" }} />
          <input type="number" value={l.qty} onChange={(e) => set(l.id, "qty", e.target.value)} style={{ ...inp, textAlign: "right" }} />
          <input type="number" value={l.price} onChange={(e) => set(l.id, "price", e.target.value)} placeholder="0" style={{ ...inp, textAlign: "right" }} />
          <input type="number" value={l.discount} onChange={(e) => set(l.id, "discount", e.target.value)} min={0} max={100} style={{ ...inp, textAlign: "right" }} />
          <select value={l.vat} onChange={(e) => set(l.id, "vat", Number(e.target.value))} style={{ ...inp, cursor: "pointer" }}>
            {VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
          <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(lineTotal(l))}</div>
          <button onClick={() => onChange(lines.filter((x) => x.id !== l.id))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)", fontSize: 14, padding: "2px 4px", textAlign: "center" }}>✕</button>
        </div>
      ))}

      <button onClick={add} style={{
        marginTop: 8, padding: "6px 14px", border: "0.5px dashed var(--color-border-secondary)",
        borderRadius: "var(--border-radius-md)", background: "none", fontSize: 13, cursor: "pointer",
        color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Добавить позицию
      </button>

      {/* Totals */}
      {lines.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10 }}>
          {[
            ["Итого без НДС",   fmt(totals.subtotal),  "var(--color-text-secondary)"],
            ["НДС",             fmt(totals.vatAmount),  "var(--color-text-secondary)"],
            ["ИТОГО К ОПЛАТЕ",  fmt(totals.total),      "#854F0B"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{label}</span>
              <span style={{
                fontSize: label === "ИТОГО К ОПЛАТЕ" ? 16 : 13,
                fontWeight: label === "ИТОГО К ОПЛАТЕ" ? 700 : 500, color,
              }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DocModal({ docData, products, counterparties, accounts, projects, onSave, onDelete, onClose }) {
  const isEdit  = Boolean(docData?._docId);
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState("main");

  const makeNumber = () => `ЗАК-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  const [form, setForm] = useState(() =>
    docData
      ? { ...docData }
      : {
          _isoDate: todayISO(), dueDate: "", deliveryDate: "",
          number: makeNumber(), type: "order", status: "draft",
          supplierId: "", supplierName: "",
          walletId: "", walletName: "", project: "",
          notes: "", items: [], paid: 0,
        }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totals = useMemo(() => calcTotals(form.items), [form.items]);

  const debt      = Math.max(0, totals.total - (parseFloat(form.paid) || 0));
  const isPaidFull = debt < 0.01;

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "8px 12px",
    border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
    fontSize: 14, background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)",
  };
  const lbl = { fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 };

  const handleSave = async () => {
    if (saving || !form.supplierName) return;
    setSaving(true);
    try { await onSave({ ...form, ...totals }); }
    finally { setSaving(false); }
  };

  const TABS = [["main", "Основное"], ["items", `Позиции (${form.items.length})`], ["payment", "Оплата / Статус"]];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)", width: 740, maxWidth: "97vw",
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>
                {isEdit ? form.number : "Новый документ закупки"}
              </h2>
              {isEdit && (
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <TypeBadge typeId={form.type} small />
                  <StatusBadge statusId={form.status} small />
                  {totals.total > 0 && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", alignSelf: "center" }}>Итого: {fmt(totals.total)}</span>}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
          </div>

          {/* Type pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {DOC_TYPES.map((t) => (
              <button key={t.id} onClick={() => set("type", t.id)}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
                  fontSize: 12, fontWeight: form.type === t.id ? 500 : 400,
                  background: form.type === t.id ? t.bg : "var(--color-background-secondary)",
                  color: form.type === t.id ? t.color : "var(--color-text-secondary)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {TABS.map(([key, label]) => (
              <div key={key} onClick={() => setTab(key)}
                style={{
                  padding: "8px 16px", fontSize: 14, cursor: "pointer",
                  borderBottom: tab === key ? "2px solid #854F0B" : "2px solid transparent",
                  color: tab === key ? "#854F0B" : "var(--color-text-secondary)",
                  fontWeight: tab === key ? 500 : 400,
                }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>

          {/* ── MAIN ── */}
          {tab === "main" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Номер документа</div>
                  <input value={form.number} onChange={(e) => set("number", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={lbl}>Дата</div>
                  <input type="date" value={form._isoDate} onChange={(e) => set("_isoDate", e.target.value)} style={inp} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Поставщик *</div>
                  <Dropdown
                    options={counterparties}
                    value={form.supplierName}
                    onChange={(v) => set("supplierName", v)}
                    placeholder="Выбрать поставщика"
                    zIndex={600}
                  />
                </div>
                <div>
                  <div style={lbl}>Срок оплаты</div>
                  <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} style={inp} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Ожидаемая дата доставки</div>
                  <input type="date" value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={lbl}>Счёт списания</div>
                  <Dropdown
                    options={accounts}
                    value={form.walletId}
                    onChange={(v, obj) => { set("walletId", v); set("walletName", obj?.name || ""); }}
                    placeholder="Выбрать счёт"
                    zIndex={600}
                    getLabel={(w) => w.name}
                    getValue={(w) => w.id}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Проект</div>
                  <Dropdown
                    options={projects}
                    value={form.project}
                    onChange={(v) => set("project", v)}
                    placeholder="Выбрать проект"
                    zIndex={600}
                    getLabel={(p) => p.name}
                    getValue={(p) => p.name}
                  />
                </div>
                <div />
              </div>

              <div>
                <div style={lbl}>Примечание / Условия</div>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                  placeholder="Договор №, условия поставки, комментарий…"
                  style={{ ...inp, minHeight: 72, resize: "vertical", lineHeight: 1.5 }} />
              </div>

              {form.items.length > 0 && (
                <div style={{
                  background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                  padding: "12px 16px", border: "0.5px solid var(--color-border-tertiary)",
                  display: "flex", gap: 24,
                }}>
                  {[
                    ["Без НДС", fmt(totals.subtotal), "var(--color-text-primary)"],
                    ["НДС",     fmt(totals.vatAmount), "var(--color-text-secondary)"],
                    ["Итого",   fmt(totals.total),     "#854F0B"],
                  ].map(([l, v, c]) => (
                    <div key={l}>
                      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{l}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ITEMS ── */}
          {tab === "items" && (
            <LinesEditor lines={form.items} onChange={(items) => set("items", items)} products={products} />
          )}

          {/* ── PAYMENT ── */}
          {tab === "payment" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Итого к оплате</div>
                  <div style={{
                    padding: "10px 14px", border: "0.5px solid var(--color-border-secondary)",
                    borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)",
                    fontSize: 18, fontWeight: 700, color: "#854F0B",
                  }}>{fmt(totals.total)}</div>
                </div>
                <div>
                  <div style={lbl}>Оплачено</div>
                  <input type="number" value={form.paid} onChange={(e) => set("paid", e.target.value)} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={lbl}>Остаток / Долг</div>
                  <div style={{
                    padding: "10px 14px", borderRadius: "var(--border-radius-md)",
                    border: `0.5px solid ${isPaidFull ? "#3B6D1133" : "#A32D2D33"}`,
                    background: isPaidFull ? "#EAF3DE" : "#FCEBEB",
                    fontSize: 16, fontWeight: 700, color: isPaidFull ? "#3B6D11" : "#A32D2D",
                  }}>
                    {isPaidFull ? "✓ Оплачен" : fmt(debt)}
                  </div>
                </div>
              </div>

              <div>
                <div style={lbl}>Статус документа</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DOC_STATUSES.map((s) => (
                    <button key={s.id} onClick={() => set("status", s.id)}
                      style={{
                        padding: "8px 14px", borderRadius: "var(--border-radius-md)",
                        border: form.status === s.id ? `1.5px solid ${s.color}` : "0.5px solid var(--color-border-secondary)",
                        background: form.status === s.id ? s.bg : "var(--color-background-secondary)",
                        color: form.status === s.id ? s.color : "var(--color-text-secondary)",
                        fontSize: 13, fontWeight: form.status === s.id ? 600 : 400, cursor: "pointer",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                padding: "10px 14px", fontSize: 12, color: "var(--color-text-tertiary)",
                border: "0.5px solid var(--color-border-tertiary)",
              }}>
                💡 При полной оплате переводите статус в «Оплачен». При получении товара — «Получен».
                Если срок оплаты прошёл — «Просрочен».
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.supplierName}
            style={{
              flex: 1, padding: "10px 0",
              background: (saving || !form.supplierName) ? "#c4a87a" : "#854F0B",
              color: "#fff", border: "none", borderRadius: "var(--border-radius-md)",
              fontSize: 14, fontWeight: 500,
              cursor: (saving || !form.supplierName) ? "not-allowed" : "pointer",
              opacity: (saving || !form.supplierName) ? 0.75 : 1,
            }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить изменения" : "Создать документ"}
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
          {isEdit && (
            <button onClick={() => onDelete(docData._docId)} style={{ padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)" }}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_FILTERS = {
  type: "all", status: "all", supplier: "",
  dateFrom: "", dateTo: "", dueDateFrom: "", dueDateTo: "",
  deliveryFrom: "", deliveryTo: "",
  amountFrom: "", amountTo: "", hasDebt: false,
};

function FilterModal({ filters, counterparties, onApply, onClose }) {
  const [f, setF] = useState(filters);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const inp = {
    flex: 1, padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)", fontSize: 14,
    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
    outline: "none", boxSizing: "border-box", fontFamily: "var(--font-sans)",
  };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)", width: 500, maxWidth: "95vw",
        maxHeight: "92vh", overflowY: "auto", padding: "24px 28px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 500 }}>Фильтр</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {/* Type */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Тип документа</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[{ id: "all", label: "Все", icon: "" }, ...DOC_TYPES].map((t) => (
              <button key={t.id} onClick={() => set("type", t.id)}
                style={{
                  padding: "5px 12px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)",
                  fontSize: 12, cursor: "pointer", fontWeight: f.type === t.id ? 500 : 400,
                  background: f.type === t.id ? (TYPE_MAP[t.id]?.bg || "var(--color-background-info)") : "var(--color-background-secondary)",
                  color: f.type === t.id ? (TYPE_MAP[t.id]?.color || "var(--color-text-info)") : "var(--color-text-secondary)",
                }}>
                {t.icon && <span style={{ marginRight: 3 }}>{t.icon}</span>}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Статус</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[{ id: "all", label: "Все" }, ...DOC_STATUSES].map((s) => (
              <button key={s.id} onClick={() => set("status", s.id)}
                style={{
                  padding: "5px 12px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)",
                  fontSize: 12, cursor: "pointer", fontWeight: f.status === s.id ? 500 : 400,
                  background: f.status === s.id ? (STATUS_MAP[s.id]?.bg || "var(--color-background-info)") : "var(--color-background-secondary)",
                  color: f.status === s.id ? (STATUS_MAP[s.id]?.color || "var(--color-text-info)") : "var(--color-text-secondary)",
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Supplier */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Поставщик</div>
          <Dropdown options={counterparties} value={f.supplier} onChange={(v) => set("supplier", v)} placeholder="Все поставщики" />
        </div>

        {/* Debt flag */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="hasDebt" checked={f.hasDebt} onChange={(e) => set("hasDebt", e.target.checked)} style={{ cursor: "pointer", width: 16, height: 16 }} />
          <label htmlFor="hasDebt" style={{ fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>Только с долгом поставщику</label>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Сумма</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="От" value={f.amountFrom} onChange={(e) => set("amountFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="number" placeholder="До" value={f.amountTo} onChange={(e) => set("amountTo", e.target.value)} style={inp} />
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Дата документа</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={f.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="date" value={f.dateTo} onChange={(e) => set("dateTo", e.target.value)} style={inp} />
          </div>
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Срок оплаты</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={f.dueDateFrom} onChange={(e) => set("dueDateFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="date" value={f.dueDateTo} onChange={(e) => set("dueDateTo", e.target.value)} style={inp} />
          </div>
        </div>

        {/* Delivery date */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Дата доставки</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={f.deliveryFrom} onChange={(e) => set("deliveryFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="date" value={f.deliveryTo} onChange={(e) => set("deliveryTo", e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onApply(f)} style={{ padding: "10px 24px", background: "#854F0B", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Применить</button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Закрыть</button>
          <button onClick={() => onApply({ ...EMPTY_FILTERS })} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Очистить</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// КРЕДИТОРКА TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CreditTab({ documents, onOpenDoc }) {
  const creditors = useMemo(() => {
    const map = {};
    documents.forEach((d) => {
      if (d.status === "cancelled" || d.status === "paid") return;
      const debt = Math.max(0, (d.total || 0) - (d.paid || 0));
      if (debt < 0.01) return;
      const s = d.supplierName || "Без поставщика";
      if (!map[s]) map[s] = { supplier: s, docs: [], totalDebt: 0, overdueDebt: 0 };
      const isOverdue = d.dueDate && d.dueDate < todayISO();
      map[s].docs.push({ ...d, debt, isOverdue });
      map[s].totalDebt   += debt;
      map[s].overdueDebt += isOverdue ? debt : 0;
    });
    return Object.values(map).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [documents]);

  const totalDebt    = creditors.reduce((s, c) => s + c.totalDebt, 0);
  const overdueDebt  = creditors.reduce((s, c) => s + c.overdueDebt, 0);
  const overdueCount = creditors.reduce((s, c) => s + c.docs.filter((x) => x.isOverdue).length, 0);
  const [expanded, setExpanded] = useState(new Set());
  const toggle = (name) => setExpanded((p) => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Общий долг поставщикам", value: totalDebt,    color: "#854F0B",                        large: true },
          { label: "Просрочено",             value: overdueDebt,  color: "#A32D2D",                        large: true },
          { label: "Поставщиков-кредиторов", value: creditors.length, color: "var(--color-text-primary)", plain: creditors.length },
          { label: "Просроченных документов",value: overdueCount, color: "#A32D2D",                        plain: overdueCount },
        ].map(({ label, value, color, large, plain }) => (
          <div key={label} style={{ flex: 1, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: large ? 22 : 20, fontWeight: 700, color }}>
              {plain !== undefined ? plain : <AnimNum value={value} color={color} />}
            </div>
          </div>
        ))}
      </div>

      {creditors.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-tertiary)", fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          Задолженности перед поставщиками нет
        </div>
      )}

      {/* Creditor cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {creditors.map((creditor) => {
          const isOpen = expanded.has(creditor.supplier);
          const [avatarBg, avatarColor] = avatarStyle(creditor.supplier);
          return (
            <div key={creditor.supplier} style={{
              background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
              border: creditor.overdueDebt > 0 ? "0.5px solid #A32D2D44" : "0.5px solid var(--color-border-secondary)",
              overflow: "hidden",
            }}>
              <div onClick={() => toggle(creditor.supplier)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {initials(creditor.supplier)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{creditor.supplier}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {creditor.docs.length} документ{creditor.docs.length > 4 ? "ов" : creditor.docs.length > 1 ? "а" : ""}
                    {creditor.overdueDebt > 0 && <span style={{ marginLeft: 8, color: "#A32D2D", fontWeight: 600 }}>⚠ просрочено {fmt(creditor.overdueDebt)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: creditor.overdueDebt > 0 ? "#A32D2D" : "#854F0B" }}>{fmt(creditor.totalDebt)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>к оплате</div>
                </div>
                <div style={{ fontSize: 14, color: "var(--color-text-tertiary)", marginLeft: 8 }}>{isOpen ? "▴" : "▾"}</div>
              </div>

              {isOpen && (
                <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  {creditor.docs.map((d) => {
                    const dl = d.dueDate ? daysLeft(d.dueDate) : null;
                    return (
                      <div key={d.id} onClick={() => onOpenDoc(d)}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr 110px 100px 100px 90px 90px",
                          padding: "10px 18px 10px 70px", borderBottom: "0.5px solid var(--color-border-tertiary)",
                          cursor: "pointer", alignItems: "center",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{d.number}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{shortDate(d._isoDate)}</div>
                        </div>
                        <TypeBadge typeId={d.type} small />
                        <StatusBadge statusId={d.status} small />
                        <div style={{ textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)" }}>{fmt(d.total || 0)}</div>
                        <div style={{ textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)" }}>+{fmt(d.paid || 0)}</div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: d.isOverdue ? "#A32D2D" : "#854F0B" }}>{fmt(d.debt)}</div>
                          {dl !== null && (
                            <div style={{ fontSize: 10, color: d.isOverdue ? "#A32D2D" : "var(--color-text-tertiary)", fontWeight: d.isOverdue ? 600 : 400 }}>
                              {d.isOverdue ? `просрочен ${Math.abs(dl)} дн.` : `${dl} дн. осталось`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Supplier total row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 100px 90px 90px", padding: "8px 18px 8px 70px", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", alignItems: "center" }}>
                    <div>Итого по поставщику</div>
                    <div /><div />
                    <div style={{ textAlign: "right" }}>{fmt(creditor.docs.reduce((s, d) => s + (d.total || 0), 0))}</div>
                    <div style={{ textAlign: "right" }}>{fmt(creditor.docs.reduce((s, d) => s + (d.paid || 0), 0))}</div>
                    <div style={{ textAlign: "right", color: "#A32D2D" }}>{fmt(creditor.totalDebt)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Aging table */}
      {creditors.length > 0 && (
        <div style={{ marginTop: 24, background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Анализ кредиторки по срокам (aging)</div>
          {(() => {
            const buckets = [
              { label: "До 7 дней",    min: 0,  max: 7,        color: "#3B6D11" },
              { label: "7–30 дней",    min: 7,  max: 30,       color: "#854F0B" },
              { label: "30–90 дней",   min: 30, max: 90,       color: "#E8906B" },
              { label: "Более 90 дн.", min: 90, max: Infinity, color: "#A32D2D" },
            ];
            const today = todayISO();
            const allDebtDocs = creditors.flatMap((c) => c.docs);
            const bucketed = buckets.map((b) => {
              const docs = allDebtDocs.filter((d) => {
                if (!d.dueDate || d.dueDate >= today) return false;
                const days = Math.abs(daysLeft(d.dueDate));
                return days >= b.min && days < b.max;
              });
              return { ...b, amount: docs.reduce((s, d) => s + d.debt, 0), count: docs.length };
            });
            const maxB = Math.max(...bucketed.map((b) => b.amount), 1);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bucketed.map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: b.color, fontWeight: 500 }}>{b.label}</span>
                      <span style={{ fontSize: 12 }}>{b.count} докум. — <strong>{fmtK(b.amount)}</strong></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(b.amount / maxB) * 100}%`, background: b.color, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// АНАЛИТИКА TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ documents }) {
  const [period, setPeriod] = useState("6m");

  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === "1m") d.setMonth(d.getMonth() - 1);
    else if (period === "3m") d.setMonth(d.getMonth() - 3);
    else if (period === "6m") d.setMonth(d.getMonth() - 6);
    else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
    else return null;
    return d.toISOString().slice(0, 10);
  }, [period]);

  const docs = useMemo(() =>
    periodStart ? documents.filter((d) => (d._isoDate || "") >= periodStart) : documents,
    [documents, periodStart]
  );

  const stats = useMemo(() => {
    const active  = docs.filter((d) => d.status !== "cancelled");
    const paid    = docs.filter((d) => d.status === "paid");
    const returns = docs.filter((d) => d.type === "return");

    const spend      = paid.reduce((s, d) => s + (d.subtotal || 0), 0);
    const vatTotal   = paid.reduce((s, d) => s + (d.vatAmount || 0), 0);
    const grossTotal = paid.reduce((s, d) => s + (d.total || 0), 0);
    const returnAmt  = returns.reduce((s, d) => s + (d.total || 0), 0);

    const monthCount = period === "1m" ? 4 : period === "3m" ? 3 : period === "6m" ? 6 : period === "1y" ? 12 : 12;
    const months = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mDocs = docs.filter((doc) => doc._isoDate?.startsWith(key) && doc.status === "paid");
      months.push({
        label: MONTHS[d.getMonth()],
        spend: mDocs.reduce((s, doc) => s + (doc.total || 0), 0),
        count: mDocs.length,
      });
    }

    const byType = DOC_TYPES.map((t) => {
      const tDocs = docs.filter((d) => d.type === t.id);
      return { ...t, count: tDocs.length, total: tDocs.reduce((s, d) => s + (d.total || 0), 0) };
    });

    // Top suppliers
    const sMap = {};
    docs.forEach((d) => {
      const s = d.supplierName || "—";
      if (!sMap[s]) sMap[s] = { name: s, count: 0, total: 0, paid: 0 };
      sMap[s].count++;
      sMap[s].total += d.total || 0;
      if (d.status === "paid") sMap[s].paid += d.total || 0;
    });
    const topSuppliers = Object.values(sMap).sort((a, b) => b.total - a.total).slice(0, 8);

    // Top purchased items
    const pMap = {};
    docs.forEach((d) => {
      (d.items || []).forEach((item) => {
        const key = item.name || "—";
        if (!pMap[key]) pMap[key] = { name: key, type: item.type || "product", qty: 0, spend: 0 };
        const base = (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0) * (1 - (parseFloat(item.discount) || 0) / 100);
        pMap[key].qty   += parseFloat(item.qty) || 0;
        pMap[key].spend += base;
      });
    });
    const topItems = Object.values(pMap).sort((a, b) => b.spend - a.spend).slice(0, 8);

    return { spend, vatTotal, grossTotal, returnAmt, months, byType, topSuppliers, topItems };
  }, [docs, period]);

  const maxMonthSpend = Math.max(...stats.months.map((m) => m.spend), 1);
  const maxSupplier   = Math.max(...stats.topSuppliers.map((s) => s.total), 1);
  const maxItem       = Math.max(...stats.topItems.map((p) => p.spend), 1);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* Period */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", alignSelf: "center", marginRight: 4 }}>Период:</span>
        {[["1m","1 мес."],["3m","3 мес."],["6m","6 мес."],["1y","1 год"],["all","Всё время"]].map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)",
              fontSize: 13, cursor: "pointer",
              background: period === key ? "#FAEEDA" : "var(--color-background-secondary)",
              color: period === key ? "#854F0B" : "var(--color-text-secondary)",
              fontWeight: period === key ? 500 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Расходы б/НДС",   value: stats.spend,      color: "#854F0B" },
          { label: "НДС входящий",    value: stats.vatTotal,   color: "#185FA5" },
          { label: "Итого с НДС",     value: stats.grossTotal, color: "#854F0B" },
          { label: "Возвраты поставщику", value: stats.returnAmt, color: "#3B6D11" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              <AnimNum value={value} color={color} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Spend bar chart */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Расходы по месяцам</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
            {stats.months.map((m, i) => {
              const h = Math.max((m.spend / maxMonthSpend) * 90, m.spend > 0 ? 6 : 2);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {m.spend > 0 && <div style={{ fontSize: 8, color: "var(--color-text-tertiary)" }}>{fmtK(m.spend)}</div>}
                  <div style={{ width: "100%", height: h, background: "#854F0B", borderRadius: "3px 3px 0 0", opacity: 0.75 }} />
                  <div style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By doc type */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>По типу документа</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.byType.filter((t) => t.count > 0).map((t) => {
              const maxT = Math.max(...stats.byType.map((x) => x.total), 1);
              return (
                <div key={t.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: t.color, fontWeight: 500 }}>
                      <span>{t.icon}</span>{t.label}<span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({t.count})</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{fmtK(t.total)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(t.total / maxT) * 100}%`, background: t.color, borderRadius: 3, opacity: 0.75, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top items */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Топ закупаемых позиций</div>
          {stats.topItems.length === 0
            ? <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>Нет данных</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.topItems.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.type === "service" ? "🛠 " : "📦 "}{p.name}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#854F0B", flexShrink: 0, marginLeft: 6 }}>{fmtK(p.spend)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(p.spend / maxItem) * 100}%`, background: "#854F0B", borderRadius: 2, opacity: 0.6 }} />
                        </div>
                        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", flexShrink: 0 }}>
                          {fmtInt(p.qty)} ед.
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Top suppliers */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Топ поставщиков</div>
          {stats.topSuppliers.length === 0
            ? <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>Нет данных</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.topSuppliers.map((s, i) => {
                  const [avatarBg, avatarColor] = avatarStyle(s.name);
                  return (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                        {initials(s.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#854F0B", flexShrink: 0, marginLeft: 6 }}>{fmtK(s.total)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(s.total / maxSupplier) * 100}%`, background: "#854F0B", borderRadius: 2, opacity: 0.6 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", flexShrink: 0 }}>{s.count} доп.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const DOC_GRID = "32px 36px 110px 130px 1fr 120px 110px 80px 90px 90px 80px";
const TH = { padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" };

export default function PurchasePage() {
  const { accounts, projects, loading: storeLoading } = useAppStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [purchaseDocs,    setPurchaseDocs]    = useState([]);
  const [products,        setProducts]        = useState([]);
  const [counterparties,  setCounterparties]  = useState([]);
  const [loadingDocs,     setLoadingDocs]     = useState(true);
  const [localError,      setLocalError]      = useState("");

  const [activeTab,   setActiveTab]   = useState("documents");
  const [docModal,    setDocModal]    = useState(null);
  const [showFilter,  setShowFilter]  = useState(false);
  const [filters,     setFilters]     = useState({ ...EMPTY_FILTERS });
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState(new Set());

  // ── Firestore: purchase_documents ──────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingDocs(true);
    const unsub = onSnapshot(userCol("purchase_documents"), (snap) => {
      setPurchaseDocs(
        snap.docs
          .map((d) => ({ id: d.id, _docId: d.id, ...d.data(), _isoDate: normalizeDate(d.data().date || "") }))
          .sort((a, b) => (b._isoDate || "").localeCompare(a._isoDate || ""))
      );
      setLoadingDocs(false);
    }, (e) => { setLocalError("Ошибка загрузки: " + e.message); setLoadingDocs(false); });
    return () => unsub();
  }, []);

  // ── Firestore: products (read-only) ────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(userCol("products"), (snap) =>
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, []);

  // ── Firestore: counterparties ─────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(userCol("counterparties"), (snap) =>
      setCounterparties(snap.docs.map((d) => d.data().name).filter(Boolean).sort()), () => {});
    return () => unsub();
  }, []);

  // ── Hotkey N ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !docModal && !showFilter) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        setDocModal({ doc: null });
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [docModal, showFilter]);

  // ── Filtered docs ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => purchaseDocs.filter((d) => {
    if (filters.type   !== "all" && d.type   !== filters.type)   return false;
    if (filters.status !== "all" && d.status !== filters.status) return false;
    if (filters.supplier && d.supplierName !== filters.supplier)  return false;
    if (filters.hasDebt && Math.max(0, (d.total || 0) - (d.paid || 0)) < 0.01) return false;
    if (filters.amountFrom && (d.total || 0) < parseFloat(filters.amountFrom)) return false;
    if (filters.amountTo   && (d.total || 0) > parseFloat(filters.amountTo))   return false;
    if (filters.dateFrom && (d._isoDate || "") < filters.dateFrom) return false;
    if (filters.dateTo   && (d._isoDate || "") > filters.dateTo)   return false;
    if (filters.dueDateFrom && (d.dueDate || "") < filters.dueDateFrom) return false;
    if (filters.dueDateTo   && (d.dueDate || "") > filters.dueDateTo)   return false;
    if (filters.deliveryFrom && (d.deliveryDate || "") < filters.deliveryFrom) return false;
    if (filters.deliveryTo   && (d.deliveryDate || "") > filters.deliveryTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(d.number?.toLowerCase().includes(q) || d.supplierName?.toLowerCase().includes(q) || d.notes?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [purchaseDocs, filters, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((d) => {
      const k = d._isoDate || "1970-01-01";
      if (!map[k]) map[k] = [];
      map[k].push(d);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const hasFilters = Object.entries(filters).some(([k, v]) =>
    k === "type" || k === "status" ? v !== "all" : k === "hasDebt" ? v : Boolean(v)
  );

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const spend   = filtered.filter((d) => d.status === "paid").reduce((s, d) => s + (d.total || 0), 0);
    const debt    = filtered.filter((d) => d.status !== "cancelled" && d.status !== "paid")
                            .reduce((s, d) => s + Math.max(0, (d.total || 0) - (d.paid || 0)), 0);
    const overdue = filtered.filter((d) =>
      d.status === "overdue" || (d.dueDate && d.dueDate < todayISO() && d.status !== "paid" && d.status !== "cancelled")
    ).length;
    const awaitDelivery = filtered.filter((d) =>
      d.deliveryDate && d.deliveryDate >= todayISO() && !["delivered","paid","cancelled"].includes(d.status)
    ).length;
    return { spend, debt, overdue, awaitDelivery, total: filtered.length };
  }, [filtered]);

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const allFilteredIds = useMemo(() => filtered.map((d) => d.id), [filtered]);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const toggleAll      = () => allSelected ? setSelected(new Set()) : setSelected(new Set(allFilteredIds));
  const toggleOne      = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    try {
      const data = {
        date:          form._isoDate,
        number:        form.number        || "",
        type:          form.type          || "order",
        status:        form.status        || "draft",
        supplierId:    form.supplierId    || "",
        supplierName:  form.supplierName  || "",
        walletId:      form.walletId      || "",
        walletName:    form.walletName    || "",
        project:       form.project       || "",
        dueDate:       form.dueDate       || "",
        deliveryDate:  form.deliveryDate  || "",
        notes:         form.notes         || "",
        items:         form.items         || [],
        subtotal:      form.subtotal      || 0,
        vatAmount:     form.vatAmount     || 0,
        total:         form.total         || 0,
        paid:          parseFloat(form.paid) || 0,
        updatedAt:     serverTimestamp(),
      };
      if (form._docId) {
        await updateDoc(userDoc("purchase_documents", form._docId), data);
      } else {
        await addDoc(userCol("purchase_documents"), { ...data, createdAt: serverTimestamp() });
      }
    } catch (e) { setLocalError("Ошибка: " + e.message); }
    setDocModal(null);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Удалить документ?")) return;
    try { await deleteDoc(userDoc("purchase_documents", docId)); }
    catch (e) { setLocalError("Ошибка: " + e.message); }
    setDocModal(null);
  };

  const handleBulkStatus = async (statusId) => {
    for (const id of [...selected]) {
      const d = purchaseDocs.find((x) => x.id === id);
      if (!d?._docId) continue;
      try { await updateDoc(userDoc("purchase_documents", d._docId), { status: statusId, updatedAt: serverTimestamp() }); } catch {}
    }
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Удалить ${selected.size} документов?`)) return;
    for (const id of [...selected]) {
      const d = purchaseDocs.find((x) => x.id === id);
      if (!d?._docId) continue;
      try { await deleteDoc(userDoc("purchase_documents", d._docId)); } catch {}
    }
    setSelected(new Set());
  };

  const loading = storeLoading || loadingDocs;
  const TABS = [["documents", "Документы"], ["credit", "Кредиторка"], ["analytics", "Аналитика"]];

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "100%", overflow: "hidden", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", display: "flex", flexDirection: "column" }}>

      {/* ── Modals ── */}
      {docModal && (
        <DocModal
          docData={docModal.doc || null}
          products={products}
          counterparties={counterparties}
          accounts={accounts}
          projects={projects}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setDocModal(null)}
        />
      )}
      {showFilter && (
        <FilterModal
          filters={filters}
          counterparties={counterparties}
          onApply={(f) => { setFilters(f); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, zIndex: 200, background: "var(--color-background-primary)" }}>
        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Закупки</h1>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "2px 9px" }}>
                {purchaseDocs.length} документов
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…"
                  style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180, fontFamily: "var(--font-sans)" }} />
              </div>

              {/* Filter */}
              <button onClick={() => setShowFilter(true)}
                style={{ padding: "6px 12px", border: hasFilters ? "1px solid #854F0B" : "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: hasFilters ? "#FAEEDA" : "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: hasFilters ? "#854F0B" : "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 8h6M7 12h2"/></svg>
                Фильтр{hasFilters ? " ●" : ""}
              </button>
              {hasFilters && (
                <button onClick={() => setFilters({ ...EMPTY_FILTERS })} style={{ fontSize: 12, color: "var(--color-text-danger)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              )}

              {/* CSV */}
              <button onClick={() => exportCSV(filtered)}
                style={{ padding: "6px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
                CSV
              </button>

              {/* New */}
              <button onClick={() => setDocModal({ doc: null })}
                style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#854F0B", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                + Документ
              </button>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }} title="N — новый документ">N</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(([key, label]) => (
              <div key={key} onClick={() => setActiveTab(key)}
                style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer", borderBottom: activeTab === key ? "2px solid #854F0B" : "2px solid transparent", color: activeTab === key ? "#854F0B" : "var(--color-text-secondary)", fontWeight: activeTab === key ? 500 : 400, userSelect: "none" }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {localError && (
          <div style={{ margin: "8px 24px 0", padding: "8px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {localError}
            <button onClick={() => setLocalError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
          </div>
        )}

        {/* KPI strip */}
        <div style={{ padding: "10px 24px", display: "flex", gap: 8, borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
          {[
            { label: "Оплачено (расходы)",    val: kpi.spend,          color: "#854F0B",                              plain: false },
            { label: "Кредиторка (долг)",     val: kpi.debt,           color: kpi.debt > 0 ? "#A32D2D" : "#3B6D11",  plain: false },
            { label: "Просроченных",          val: kpi.overdue,        color: kpi.overdue > 0 ? "#A32D2D" : "var(--color-text-tertiary)", plain: true },
            { label: "Ждут доставки",         val: kpi.awaitDelivery,  color: kpi.awaitDelivery > 0 ? "#3C3489" : "var(--color-text-tertiary)", plain: true },
            { label: "Документов в выборке",  val: kpi.total,          color: "var(--color-text-primary)",            plain: true },
          ].map(({ label, val, color, plain }) => (
            <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
              </div>
            </div>
          ))}
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div style={{ background: "#854F0B", padding: "8px 24px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Выбрано: {selected.size}</span>
            {DOC_STATUSES.map((s) => (
              <button key={s.id} onClick={() => handleBulkStatus(s.id)}
                style={{ padding: "4px 10px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
                → {s.label}
              </button>
            ))}
            <button onClick={handleBulkDelete} style={{ padding: "5px 12px", background: "rgba(255,80,80,0.3)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 13, cursor: "pointer" }}>Удалить</button>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>Снять выделение</button>
          </div>
        )}

        {/* Table header */}
        {activeTab === "documents" && !loading && (
          <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ minWidth: 1050, display: "grid", gridTemplateColumns: DOC_GRID, padding: "0 16px" }}>
              <div style={{ ...TH, display: "flex", alignItems: "center" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </div>
              <div style={TH} />
              {["Дата","Номер","Поставщик","Тип","Статус","Итого","Долг","Оплата","Доставка"].map((h, i) => (
                <div key={h} style={{ ...TH, textAlign: i >= 6 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
        )}

        {/* ── DOCUMENTS LIST ── */}
        {!loading && activeTab === "documents" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ minWidth: 1050 }}>
              {grouped.length === 0 && (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📥</div>
                  <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                    {purchaseDocs.length === 0 ? "Нет документов. Нажмите + Документ или клавишу N" : "Ничего не найдено по фильтрам"}
                  </div>
                  {(hasFilters || search) && (
                    <button onClick={() => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); }}
                      style={{ marginTop: 8, padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              )}

              {grouped.map(([date, rows]) => (
                <div key={date}>
                  {/* Date group header */}
                  <div style={{ padding: "5px 16px 5px 84px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                    <span>{longDate(date)}</span>
                    <span>{rows.length} докум. · {fmtK(rows.reduce((s, d) => s + (d.total || 0), 0))}</span>
                  </div>

                  {rows.map((d) => {
                    const [avatarBg, avatarColor] = avatarStyle(d.supplierName || "?");
                    const isChecked  = selected.has(d.id);
                    const debt       = Math.max(0, (d.total || 0) - (d.paid || 0));
                    const isOverdue  = d.dueDate && d.dueDate < todayISO() && d.status !== "paid" && d.status !== "cancelled";
                    const dlDue      = d.dueDate     ? daysLeft(d.dueDate)     : null;
                    const dlDel      = d.deliveryDate ? daysLeft(d.deliveryDate) : null;
                    const isLateDelivery = d.deliveryDate && d.deliveryDate < todayISO() && !["delivered","paid","cancelled"].includes(d.status);

                    return (
                      <div key={d.id}
                        style={{
                          display: "grid", gridTemplateColumns: DOC_GRID, padding: "0 16px",
                          borderBottom: "0.5px solid var(--color-border-tertiary)",
                          background: isChecked ? "#FAEEDA55" : "transparent",
                          alignItems: "center", position: "relative", transition: "background 0.1s, padding-right 0.15s",
                          borderLeft: isOverdue ? "2px solid #A32D2D" : isLateDelivery ? "2px solid #854F0B" : "2px solid transparent",
                        }}
                        onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = "var(--color-background-secondary)"; e.currentTarget.querySelector(".row-act").style.opacity = "1"; e.currentTarget.style.paddingRight = "90px"; }}
                        onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector(".row-act").style.opacity = "0"; e.currentTarget.style.paddingRight = "16px"; }}
                      >
                        {/* Checkbox */}
                        <div style={{ padding: "10px 0", display: "flex", alignItems: "center" }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleOne(d.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer" }} />
                        </div>

                        {/* Avatar */}
                        <div style={{ padding: "10px 0" }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>
                            {initials(d.supplierName)}
                          </div>
                        </div>

                        {/* Date */}
                        <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          {shortDate(d._isoDate)}
                          {isOverdue && <div style={{ fontSize: 9, color: "#A32D2D", fontWeight: 700, marginTop: 1 }}>ПРОСРОЧЕН</div>}
                          {isLateDelivery && !isOverdue && <div style={{ fontSize: 9, color: "#854F0B", fontWeight: 700, marginTop: 1 }}>ЗАДЕРЖКА</div>}
                        </div>

                        {/* Number */}
                        <div style={{ padding: "10px 8px", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.number || "—"}</div>
                        </div>

                        {/* Supplier */}
                        <div style={{ padding: "10px 8px", cursor: "pointer", overflow: "hidden" }} onClick={() => setDocModal({ doc: d })}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.supplierName || "—"}</div>
                          {d.notes && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.notes}</div>}
                        </div>

                        {/* Type */}
                        <div style={{ padding: "10px 8px", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          <TypeBadge typeId={d.type} small />
                        </div>

                        {/* Status */}
                        <div style={{ padding: "10px 8px", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          <StatusBadge statusId={d.status} small />
                        </div>

                        {/* Total */}
                        <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#854F0B", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          {fmt(d.total || 0)}
                        </div>

                        {/* Debt */}
                        <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          {debt > 0.01
                            ? <span style={{ fontSize: 13, fontWeight: 700, color: "#A32D2D" }}>{fmt(debt)}</span>
                            : <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>—</span>}
                        </div>

                        {/* Due date */}
                        <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          {d.dueDate
                            ? <>
                                <div style={{ fontSize: 11, color: isOverdue ? "#A32D2D" : "var(--color-text-secondary)", fontWeight: isOverdue ? 600 : 400 }}>{shortDate(d.dueDate)}</div>
                                {dlDue !== null && (
                                  <div style={{ fontSize: 9, color: isOverdue ? "#A32D2D" : "var(--color-text-tertiary)" }}>
                                    {isOverdue ? `−${Math.abs(dlDue)} дн.` : `+${dlDue} дн.`}
                                  </div>
                                )}
                              </>
                            : <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>—</span>}
                        </div>

                        {/* Delivery date */}
                        <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setDocModal({ doc: d })}>
                          {d.deliveryDate
                            ? <>
                                <div style={{ fontSize: 11, color: isLateDelivery ? "#854F0B" : "var(--color-text-secondary)", fontWeight: isLateDelivery ? 600 : 400 }}>{shortDate(d.deliveryDate)}</div>
                                {dlDel !== null && (
                                  <div style={{ fontSize: 9, color: isLateDelivery ? "#854F0B" : "var(--color-text-tertiary)" }}>
                                    {isLateDelivery ? `−${Math.abs(dlDel)} дн.` : `+${dlDel} дн.`}
                                  </div>
                                )}
                              </>
                            : <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>—</span>}
                        </div>

                        {/* Row actions */}
                        <div className="row-act" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                          <button title="Редактировать" onClick={(e) => { e.stopPropagation(); setDocModal({ doc: d }); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>✏️</button>
                          <button title="Удалить" onClick={(e) => { e.stopPropagation(); handleDelete(d._docId); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--color-text-danger)" }}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Footer summary */}
              {filtered.length > 0 && (
                <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <span>Документов: <strong>{filtered.length}</strong></span>
                  <span>Итого: <strong style={{ color: "#854F0B" }}>{fmt(filtered.reduce((s, d) => s + (d.total || 0), 0))}</strong></span>
                  <span>Оплачено: <strong style={{ color: "#3B6D11" }}>{fmt(filtered.reduce((s, d) => s + (d.paid || 0), 0))}</strong></span>
                  <span>Долг: <strong style={{ color: "#A32D2D" }}>{fmt(filtered.reduce((s, d) => s + Math.max(0, (d.total || 0) - (d.paid || 0)), 0))}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CREDIT TAB ── */}
        {!loading && activeTab === "credit" && (
          <CreditTab documents={purchaseDocs} onOpenDoc={(d) => setDocModal({ doc: d })} />
        )}

        {/* ── ANALYTICS TAB ── */}
        {!loading && activeTab === "analytics" && (
          <AnalyticsTab documents={purchaseDocs} />
        )}
      </div>
    </div>
  );
}

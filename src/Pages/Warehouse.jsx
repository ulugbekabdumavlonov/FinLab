import { useState, useMemo, useEffect, useRef } from "react";
import {
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, collection, onSnapshot, writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { notifyLowStock, notifyNoStock } from ".../notificationService";

// ─── Firebase helpers ──────────────────────────────────────────────────────────
const uid     = ()      => auth.currentUser?.uid;
const userCol = (n)     => collection(db, "users", uid(), n);
const userDoc = (n, id) => doc(db, "users", uid(), n, id);

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

// ─── Movement types ────────────────────────────────────────────────────────────
const MOVEMENT_TYPES = [
  { id: "in",     label: "Приход",        icon: "📥", color: "#0F6E56", bg: "#E1F5EE" },
  { id: "out",    label: "Расход",        icon: "📤", color: "#A32D2D", bg: "#FCEBEB" },
  { id: "adjust", label: "Корректировка", icon: "⚖",  color: "#854F0B", bg: "#FAEEDA" },
];
const MOV_MAP = Object.fromEntries(MOVEMENT_TYPES.map((t) => [t.id, t]));

const REASONS = {
  purchase:    { label: "Закупка",          icon: "🏭" },
  sale:        { label: "Продажа",          icon: "🛒" },
  manual_in:   { label: "Ручной приход",    icon: "➕" },
  manual_out:  { label: "Ручной расход",    icon: "➖" },
  inventory:   { label: "Инвентаризация",   icon: "📋" },
  write_off:   { label: "Списание",         icon: "🗑" },
};

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

// ─── Stock badge ───────────────────────────────────────────────────────────────
function StockBadge({ stock, minStock, unit }) {
  const s   = parseFloat(stock)    || 0;
  const min = parseFloat(minStock) || 0;
  const isEmpty = s <= 0;
  const isLow   = !isEmpty && min > 0 && s <= min;
  const color = isEmpty ? "#A32D2D" : isLow ? "#854F0B" : "#0F6E56";
  const bg    = isEmpty ? "#FCEBEB" : isLow ? "#FAEEDA" : "#E1F5EE";
  const icon  = isEmpty ? "⚠" : isLow ? "↓" : "✓";
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: bg, color, display: "inline-flex", alignItems: "center", gap: 3, border: `0.5px solid ${color}22`, whiteSpace: "nowrap" }}>
      {icon} {fmtInt(s)} {unit || "шт"}
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
  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)" };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-secondary)", fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selLabel || placeholder}</span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Не выбрано</div>
            {filtered.map((opt, i) => {
              const label = getL(opt), val = getV(opt), isActive = val === value;
              return (
                <div key={i} onClick={() => { onChange(val, opt); setOpen(false); setQ(""); }}
                  style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: isActive ? "var(--color-background-info)" : "transparent", color: isActive ? "var(--color-text-info)" : "var(--color-text-primary)", fontWeight: isActive ? 500 : 400 }}
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

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT MODAL — ручная проводка
// ═══════════════════════════════════════════════════════════════════════════════
function MovementModal({ movement, products, onSave, onDelete, onClose }) {
  const isEdit  = Boolean(movement?._docId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() =>
    movement
      ? { ...movement }
      : { _isoDate: todayISO(), type: "in", productId: "", productName: "", unit: "шт", qty: "", costPrice: "", reason: "manual_in", notes: "" }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const [prodSearch, setProdSearch] = useState(form.productName || "");
  const [prodOpen, setProdOpen]     = useState(false);
  const prodRef = useRef(null);

  const filteredProds = products
    .filter((p) => p.type === "product" && p.name?.toLowerCase().includes(prodSearch.toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    const h = (e) => {
      if (prodRef.current && !prodRef.current.contains(e.target)) setProdOpen(false);
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", h); };
  }, [onClose]);

  // Автоматически подставляем reason при смене type
  const handleTypeChange = (t) => {
    set("type", t);
    if (t === "in")     set("reason", "manual_in");
    if (t === "out")    set("reason", "manual_out");
    if (t === "adjust") set("reason", "inventory");
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)" };
  const lbl = { fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 };

  const handleSave = async () => {
    if (saving || !form.productId || !form.qty) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const REASON_OPTIONS = {
    in:     [["manual_in","Ручной приход"],["purchase","Закупка (вручную)"]],
    out:    [["manual_out","Ручной расход"],["write_off","Списание"]],
    adjust: [["inventory","Инвентаризация"]],
  };

  const totalValue = (parseFloat(form.qty) || 0) * (parseFloat(form.costPrice) || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 560, maxWidth: "97vw", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>
              {isEdit ? "Редактировать проводку" : "Новая проводка"}
            </h2>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {MOVEMENT_TYPES.map((t) => (
              <button key={t.id} onClick={() => handleTypeChange(t.id)}
                style={{ flex: 1, padding: "9px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: form.type === t.id ? 600 : 400, background: form.type === t.id ? t.bg : "var(--color-background-secondary)", color: form.type === t.id ? t.color : "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Date + reason */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={lbl}>Дата</div>
              <input type="date" value={form._isoDate} onChange={(e) => set("_isoDate", e.target.value)} style={inp} />
            </div>
            <div>
              <div style={lbl}>Причина</div>
              <select value={form.reason} onChange={(e) => set("reason", e.target.value)}
                style={{ ...inp, cursor: "pointer" }}>
                {(REASON_OPTIONS[form.type] || []).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product search */}
          <div>
            <div style={lbl}>Товар *</div>
            <div ref={prodRef} style={{ position: "relative" }}>
              <input
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); set("productName", e.target.value); set("productId", ""); setProdOpen(true); }}
                onFocus={() => setProdOpen(true)}
                placeholder="Начните вводить название товара…"
                style={inp}
              />
              {prodOpen && filteredProds.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 700, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                  {filteredProds.map((p) => (
                    <div key={p.id}
                      onClick={() => { set("productId", p.id); set("productName", p.name); set("unit", p.unit || "шт"); set("costPrice", p.costPrice || 0); setProdSearch(p.name); setProdOpen(false); }}
                      style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                        {fmtInt(p.stock || 0)} {p.unit || "шт"} · себ. {fmt(p.costPrice || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Qty + unit + cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 12 }}>
            <div>
              <div style={lbl}>{form.type === "adjust" ? "Новый остаток (факт)" : "Количество *"}</div>
              <input type="number" min={0} value={form.qty} onChange={(e) => set("qty", e.target.value)} placeholder="0" style={{ ...inp, fontSize: 16, fontWeight: 600 }} />
            </div>
            <div>
              <div style={lbl}>Ед.</div>
              <input value={form.unit} onChange={(e) => set("unit", e.target.value)} style={inp} />
            </div>
            <div>
              <div style={lbl}>Себестоимость / ед.</div>
              <input type="number" min={0} value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0" style={inp} />
            </div>
          </div>

          {/* Total value preview */}
          {totalValue > 0 && (
            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Стоимость проводки</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: form.type === "in" ? "#0F6E56" : "#A32D2D" }}>
                  {form.type === "in" ? "+" : "−"}{fmt(totalValue)}
                </div>
              </div>
              {form.type === "adjust" && form.productId && (() => {
                const p = products.find((x) => x.id === form.productId);
                const curr = parseFloat(p?.stock) || 0;
                const next = parseFloat(form.qty) || 0;
                const diff = next - curr;
                return diff !== 0 ? (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Изменение остатка</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: diff > 0 ? "#0F6E56" : "#A32D2D" }}>
                      {diff > 0 ? "+" : ""}{fmtInt(diff)} {form.unit}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Notes */}
          <div>
            <div style={lbl}>Комментарий</div>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Причина, документ, ответственный…"
              style={{ ...inp, minHeight: 60, resize: "vertical", lineHeight: 1.5 }} />
          </div>

          {form.type === "adjust" && (
            <div style={{ background: "#FAEEDA", borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 12, color: "#854F0B", border: "0.5px solid #854F0B33" }}>
              ⚖ Корректировка установит остаток в указанное значение (фактический результат инвентаризации).
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.productId || !form.qty}
            style={{ flex: 1, padding: "10px 0", background: (saving || !form.productId || !form.qty) ? "#8fb8a0" : "#0F6E56", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: (saving || !form.productId || !form.qty) ? "not-allowed" : "pointer", opacity: (saving || !form.productId || !form.qty) ? 0.75 : 1 }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Провести"}
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
          {isEdit && (
            <button onClick={() => onDelete(movement._docId)} style={{ padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)" }}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY MODAL — сверка остатков пачкой
// ═══════════════════════════════════════════════════════════════════════════════
function InventoryModal({ products, onSave, onClose }) {
  const goods = products.filter((p) => p.type === "product" && p.isActive !== false);
  const [rows, setRows] = useState(() => goods.map((p) => ({
    productId: p.id, name: p.name, unit: p.unit || "шт",
    current: parseFloat(p.stock) || 0,
    fact: String(parseFloat(p.stock) || 0),
    costPrice: parseFloat(p.costPrice) || 0,
  })));
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [date, setDate]       = useState(todayISO());
  const [notes, setNotes]     = useState("");

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const changed = rows.filter((r) => {
    const f = parseFloat(r.fact);
    return !isNaN(f) && f !== r.current;
  });

  const handleSave = async () => {
    if (!changed.length || saving) return;
    setSaving(true);
    try { await onSave(changed, date, notes); } finally { setSaving(false); }
  };

  const inp = { padding: "6px 8px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box" };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 720, maxWidth: "97vw", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>Инвентаризация</h2>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                Введите фактические остатки. Расхождения будут зафиксированы как корректировки.
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск товара…"
                style={{ ...inp, padding: "7px 12px" }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Дата:</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={{ ...inp, width: 140 }} />
            </div>
            {changed.length > 0 && (
              <span style={{ fontSize: 12, background: "#FAEEDA", color: "#854F0B", borderRadius: 20, padding: "3px 10px", border: "0.5px solid #854F0B33", flexShrink: 0 }}>
                {changed.length} расхождений
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 80px 80px", padding: "8px 24px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", position: "sticky", top: 0, zIndex: 10 }}>
            <div>Товар</div>
            <div style={{ textAlign: "center" }}>Ед.</div>
            <div style={{ textAlign: "right" }}>Учёт</div>
            <div style={{ textAlign: "right" }}>Факт</div>
            <div style={{ textAlign: "right" }}>Δ</div>
            <div style={{ textAlign: "right" }}>Стоим. Δ</div>
          </div>
          {filtered.map((r, idx) => {
            const fact = parseFloat(r.fact);
            const diff = isNaN(fact) ? null : fact - r.current;
            const hasChange = diff !== null && diff !== 0;
            const [avatarBg, avatarColor] = avatarStyle(r.name);
            return (
              <div key={r.productId}
                style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 80px 80px", padding: "8px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "center", background: hasChange ? (diff > 0 ? "#E1F5EE55" : "#FCEBEB55") : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>{initials(r.name)}</div>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                </div>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)" }}>{r.unit}</div>
                <div style={{ textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)" }}>{fmtInt(r.current)}</div>
                <div style={{ textAlign: "right" }}>
                  <input
                    type="number" min={0}
                    value={r.fact}
                    onChange={(e) => setRows((prev) => prev.map((x) => x.productId === r.productId ? { ...x, fact: e.target.value } : x))}
                    style={{ ...inp, width: 76, textAlign: "right", fontWeight: hasChange ? 700 : 400, borderColor: hasChange ? (diff > 0 ? "#0F6E56" : "#A32D2D") : undefined }}
                  />
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: diff === null || diff === 0 ? "var(--color-text-tertiary)" : diff > 0 ? "#0F6E56" : "#A32D2D" }}>
                  {diff === null || diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${fmtInt(diff)}`}
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: diff === null || diff === 0 ? "var(--color-text-tertiary)" : diff > 0 ? "#0F6E56" : "#A32D2D" }}>
                  {diff === null || diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${fmtK(diff * r.costPrice)}`}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-tertiary)" }}>Нет товаров</div>
          )}
        </div>

        {/* Notes + footer */}
        <div style={{ padding: "12px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Комментарий к инвентаризации…"
            style={{ ...inp, marginBottom: 12, padding: "8px 12px", fontSize: 13 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={!changed.length || saving}
              style={{ flex: 1, padding: "10px 0", background: (!changed.length || saving) ? "#8fb8a0" : "#0F6E56", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: (!changed.length || saving) ? "not-allowed" : "pointer", opacity: (!changed.length || saving) ? 0.75 : 1 }}>
              {saving ? "Сохранение…" : `Зафиксировать ${changed.length} расхождений`}
            </button>
            <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════════════════════════════════════
function exportStockCSV(stockItems) {
  const h = ["Товар","Категория","Ед.","Остаток","Мин.","Себестоимость","Стоим. остатка","Статус"];
  const rows = stockItems.map((s) => [
    s.name, s.category || "—", s.unit || "шт",
    s.stock, s.minStock,
    s.costPrice, s.stockValue,
    s.stock <= 0 ? "Нет" : s.minStock > 0 && s.stock <= s.minStock ? "Мало" : "OK",
  ]);
  const csv = [h, ...rows].map((r) =>
    r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `остатки_${todayISO()}.csv`; a.click();
}

function exportMovementsCSV(movements) {
  const h = ["Дата","Тип","Товар","Кол-во","Ед.","Себест./ед.","Стоимость","Причина","Источник","Примечание"];
  const rows = movements.map((m) => [
    m._isoDate,
    MOV_MAP[m.type]?.label || m.type,
    m.productName,
    m.type === "out" ? -Math.abs(m.qty) : m.qty,
    m.unit,
    m.costPrice || 0,
    Math.abs(m.qty) * (m.costPrice || 0),
    REASONS[m.reason]?.label || m.reason,
    m.sourceType || "manual",
    m.notes || "",
  ]);
  const csv = [h, ...rows].map((r) =>
    r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `движение_${todayISO()}.csv`; a.click();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОСТАТКИ TAB
// ═══════════════════════════════════════════════════════════════════════════════
const STOCK_GRID = "36px 1fr 90px 80px 90px 90px 90px 90px";
const TH = { padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" };

function StockTab({ products, allMovements, onEdit, onNewMovement }) {
  const [search, setSearch]   = useState("");
  const [catFilter, setCat]   = useState("");
  const [statusFilter, setStatus] = useState("all"); // all low empty ok
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);

  const stockItems = useMemo(() => {
    return products
      .filter((p) => p.type === "product")
      .map((p) => ({
        ...p,
        stock:      parseFloat(p.stock)     || 0,
        minStock:   parseFloat(p.minStock)  || 0,
        costPrice:  parseFloat(p.costPrice) || 0,
        salePrice:  parseFloat(p.salePrice) || 0,
        stockValue: (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0),
        // движение за последние 30 дней
        in30:  allMovements.filter((m) => m.productId === p.id && m.type === "in"  && m._isoDate >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10)).reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0), 0),
        out30: allMovements.filter((m) => m.productId === p.id && m.type === "out" && m._isoDate >= new Date(Date.now() - 30*86400000).toISOString().slice(0,10)).reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0), 0),
      }));
  }, [products, allMovements]);

  const filtered = useMemo(() => {
    let list = stockItems.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q) && !p.category?.toLowerCase().includes(q)) return false;
      }
      if (catFilter && (p.category || "") !== catFilter) return false;
      if (statusFilter === "empty") return p.stock <= 0;
      if (statusFilter === "low")   return p.stock > 0 && p.minStock > 0 && p.stock <= p.minStock;
      if (statusFilter === "ok")    return p.stock > 0 && !(p.minStock > 0 && p.stock <= p.minStock);
      return true;
    });

    list.sort((a, b) => {
      let va, vb;
      if (sortCol === "stock")      { va = a.stock;      vb = b.stock; }
      else if (sortCol === "value") { va = a.stockValue; vb = b.stockValue; }
      else if (sortCol === "cost")  { va = a.costPrice;  vb = b.costPrice; }
      else if (sortCol === "cat")   { va = a.category || ""; vb = b.category || ""; }
      else                          { va = (a.name||"").toLowerCase(); vb = (b.name||"").toLowerCase(); }
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [stockItems, search, catFilter, statusFilter, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const Arrow = ({ col }) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const totVal    = stockItems.reduce((s, p) => s + p.stockValue, 0);
  const cntEmpty  = stockItems.filter((p) => p.stock <= 0).length;
  const cntLow    = stockItems.filter((p) => p.stock > 0 && p.minStock > 0 && p.stock <= p.minStock).length;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 8, alignItems: "center", background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…"
            style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "var(--font-sans)" }} />
        </div>

        {/* Category */}
        <div style={{ width: 180 }}>
          <Dropdown options={categories} value={catFilter} onChange={setCat} placeholder="Все категории" />
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["all","Все"],["ok","OK"],["low","Мало"],["empty","Нет в наличии"]].map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)}
              style={{ padding: "5px 12px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer", fontWeight: statusFilter === key ? 500 : 400, background: statusFilter === key ? "var(--color-background-info)" : "var(--color-background-secondary)", color: statusFilter === key ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
              {label}
              {key === "empty" && cntEmpty > 0 && <span style={{ marginLeft: 4, background: "#FCEBEB", color: "#A32D2D", borderRadius: 8, padding: "0 5px", fontSize: 10 }}>{cntEmpty}</span>}
              {key === "low"   && cntLow  > 0 && <span style={{ marginLeft: 4, background: "#FAEEDA", color: "#854F0B", borderRadius: 8, padding: "0 5px", fontSize: 10 }}>{cntLow}</span>}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => exportStockCSV(filtered)}
          style={{ padding: "6px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
          CSV
        </button>
        <button onClick={onNewMovement}
          style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          + Проводка
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ padding: "8px 24px", display: "flex", gap: 8, borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", flexShrink: 0 }}>
        {[
          { label: "Позиций",         val: stockItems.length,      color: "var(--color-text-primary)", plain: true },
          { label: "Стоим. склада",   val: totVal,                 color: "#0F6E56",                   plain: false },
          { label: "Нет в наличии",   val: cntEmpty,               color: cntEmpty > 0 ? "#A32D2D" : "var(--color-text-tertiary)", plain: true },
          { label: "Мало на складе",  val: cntLow,                 color: cntLow  > 0 ? "#854F0B" : "var(--color-text-tertiary)", plain: true },
          { label: "В выборке",       val: filtered.length,        color: "var(--color-text-secondary)", plain: true },
        ].map(({ label, val, color, plain }) => (
          <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 14px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
            </div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <div style={{ minWidth: 900, display: "grid", gridTemplateColumns: STOCK_GRID, padding: "0 16px" }}>
          <div style={TH} />
          <div style={{ ...TH, cursor: "pointer" }} onClick={() => handleSort("name")}>Товар <Arrow col="name" /></div>
          <div style={{ ...TH, cursor: "pointer" }} onClick={() => handleSort("cat")}>Категория <Arrow col="cat" /></div>
          <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("stock")}>Остаток <Arrow col="stock" /></div>
          <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("cost")}>Себест. <Arrow col="cost" /></div>
          <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("value")}>Стоим. <Arrow col="value" /></div>
          <div style={{ ...TH, textAlign: "right" }}>+30 дн.</div>
          <div style={{ ...TH, textAlign: "right" }}>−30 дн.</div>
        </div>
      </div>

      {/* Table body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ minWidth: 900 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
              <div style={{ fontSize: 15, color: "var(--color-text-tertiary)" }}>Нет товаров по фильтру</div>
            </div>
          )}
          {filtered.map((p) => {
            const [avatarBg, avatarColor] = avatarStyle(p.name || "?");
            const isEmpty = p.stock <= 0;
            const isLow   = !isEmpty && p.minStock > 0 && p.stock <= p.minStock;
            return (
              <div key={p.id}
                style={{ display: "grid", gridTemplateColumns: STOCK_GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "center", position: "relative", borderLeft: isEmpty ? "2px solid #A32D2D" : isLow ? "2px solid #854F0B" : "2px solid transparent", transition: "background 0.1s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; e.currentTarget.querySelector(".row-act-stock").style.opacity = "1"; e.currentTarget.style.paddingRight = "80px"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector(".row-act-stock").style.opacity = "0"; e.currentTarget.style.paddingRight = "16px"; }}
              >
                <div style={{ padding: "10px 0" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>{initials(p.name)}</div>
                </div>
                <div style={{ padding: "10px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Арт: {p.sku}</div>}
                </div>
                <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.category || "—"}
                </div>
                <div style={{ padding: "10px 8px", textAlign: "right" }}>
                  <StockBadge stock={p.stock} minStock={p.minStock} unit={p.unit} />
                </div>
                <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {p.costPrice > 0 ? fmt(p.costPrice) : "—"}
                </div>
                <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
                  {p.stockValue > 0 ? fmtK(p.stockValue) : "—"}
                </div>
                <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 12, color: p.in30 > 0 ? "#0F6E56" : "var(--color-text-tertiary)" }}>
                  {p.in30 > 0 ? `+${fmtInt(p.in30)}` : "—"}
                </div>
                <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 12, color: p.out30 > 0 ? "#A32D2D" : "var(--color-text-tertiary)" }}>
                  {p.out30 > 0 ? `−${fmtInt(p.out30)}` : "—"}
                </div>
                {/* Row actions */}
                <div className="row-act-stock" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <button title="Приход" onClick={(e) => { e.stopPropagation(); onEdit(p, "in"); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>📥</button>
                  <button title="Расход" onClick={(e) => { e.stopPropagation(); onEdit(p, "out"); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>📤</button>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, fontSize: 13, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
              <span>Позиций: <strong>{filtered.length}</strong></span>
              <span>Стоимость: <strong style={{ color: "#0F6E56" }}>{fmt(filtered.reduce((s, p) => s + p.stockValue, 0))}</strong></span>
              {cntEmpty > 0 && <span style={{ color: "#A32D2D" }}>⚠ Нет в наличии: <strong>{cntEmpty}</strong></span>}
              {cntLow  > 0 && <span style={{ color: "#854F0B" }}>↓ Мало: <strong>{cntLow}</strong></span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ДВИЖЕНИЕ TAB
// ═══════════════════════════════════════════════════════════════════════════════
const MOV_GRID = "36px 100px 110px 1fr 90px 80px 80px 90px 1fr";

function MovementsTab({ movements, products, onEdit, onNew }) {
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [prodFilter,   setProdFilter]   = useState("");

  const productOptions = useMemo(() => [...new Set(movements.map((m) => m.productName).filter(Boolean))].sort(), [movements]);

  const filtered = useMemo(() => movements.filter((m) => {
    if (typeFilter   !== "all" && m.type       !== typeFilter)   return false;
    if (sourceFilter !== "all" && m.sourceType !== sourceFilter) return false;
    if (prodFilter   && m.productName !== prodFilter)            return false;
    if (dateFrom     && (m._isoDate || "") < dateFrom)           return false;
    if (dateTo       && (m._isoDate || "") > dateTo)             return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(m.productName?.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [movements, typeFilter, sourceFilter, prodFilter, dateFrom, dateTo, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      const k = m._isoDate || "1970-01-01";
      if (!map[k]) map[k] = [];
      map[k].push(m);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalIn  = filtered.filter((m) => m.type === "in").reduce((s, m) => s + Math.abs(parseFloat(m.qty)||0) * (parseFloat(m.costPrice)||0), 0);
  const totalOut = filtered.filter((m) => m.type === "out").reduce((s, m) => s + Math.abs(parseFloat(m.qty)||0) * (parseFloat(m.costPrice)||0), 0);

  const inp = { padding: "7px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Filters */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 8, alignItems: "center", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…"
            style={{ ...inp, paddingLeft: 28, width: "100%" }} />
        </div>

        {/* Type */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["all","Все"],["in","Приход"],["out","Расход"],["adjust","Корр."]].map(([key, label]) => (
            <button key={key} onClick={() => setTypeFilter(key)}
              style={{ padding: "5px 10px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer", fontWeight: typeFilter === key ? 500 : 400, background: typeFilter === key ? (MOV_MAP[key]?.bg || "var(--color-background-info)") : "var(--color-background-secondary)", color: typeFilter === key ? (MOV_MAP[key]?.color || "var(--color-text-info)") : "var(--color-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Source */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["all","Все источники"],["purchase","Закупка"],["sale","Продажа"],["manual","Ручные"]].map(([key, label]) => (
            <button key={key} onClick={() => setSourceFilter(key)}
              style={{ padding: "5px 10px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer", fontWeight: sourceFilter === key ? 500 : 400, background: sourceFilter === key ? "var(--color-background-info)" : "var(--color-background-secondary)", color: sourceFilter === key ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Dates */}
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inp, width: 136 }} />
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>—</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inp, width: 136 }} />

        <div style={{ flex: 1 }} />
        <button onClick={() => exportMovementsCSV(filtered)}
          style={{ padding: "6px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
          CSV
        </button>
        <button onClick={onNew}
          style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          + Проводка
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: "8px 24px", display: "flex", gap: 8, borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        {[
          { label: "Проводок",     val: filtered.length, plain: true,  color: "var(--color-text-primary)" },
          { label: "Приход (₽)",   val: totalIn,         plain: false, color: "#0F6E56" },
          { label: "Расход (₽)",   val: totalOut,        plain: false, color: "#A32D2D" },
          { label: "Баланс (₽)",   val: totalIn - totalOut, plain: false, color: (totalIn - totalOut) >= 0 ? "#0F6E56" : "#A32D2D" },
        ].map(({ label, val, plain, color }) => (
          <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 14px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
            </div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <div style={{ minWidth: 980, display: "grid", gridTemplateColumns: MOV_GRID, padding: "0 16px" }}>
          <div style={TH} />
          <div style={TH}>Дата</div>
          <div style={TH}>Тип</div>
          <div style={TH}>Товар</div>
          <div style={{ ...TH, textAlign: "right" }}>Кол-во</div>
          <div style={{ ...TH, textAlign: "right" }}>Ед.</div>
          <div style={{ ...TH, textAlign: "right" }}>Себест.</div>
          <div style={{ ...TH, textAlign: "right" }}>Сумма</div>
          <div style={TH}>Источник / Примечание</div>
        </div>
      </div>

      {/* Table body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ minWidth: 980 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 15, color: "var(--color-text-tertiary)" }}>Нет движений по фильтру</div>
            </div>
          )}
          {grouped.map(([date, rows]) => (
            <div key={date}>
              <div style={{ padding: "5px 16px 5px 68px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                <span>{longDate(date)}</span>
                <span>{rows.length} проводок</span>
              </div>
              {rows.map((m) => {
                const t = MOV_MAP[m.type] || { color: "var(--color-text-secondary)", bg: "var(--color-background-secondary)", icon: "•", label: m.type };
                const qty  = Math.abs(parseFloat(m.qty) || 0);
                const cost = parseFloat(m.costPrice) || 0;
                const total = qty * cost;
                const reason = REASONS[m.reason] || { label: m.reason, icon: "•" };
                const [avatarBg, avatarColor] = avatarStyle(m.productName || "?");
                const isManual = m.sourceType === "manual";
                return (
                  <div key={m.id}
                    style={{ display: "grid", gridTemplateColumns: MOV_GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "center", position: "relative", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; if (isManual) { e.currentTarget.querySelector(".mov-act").style.opacity = "1"; e.currentTarget.style.paddingRight = "80px"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; if (isManual) { e.currentTarget.querySelector(".mov-act").style.opacity = "0"; e.currentTarget.style.paddingRight = "16px"; } }}
                  >
                    {/* Type icon */}
                    <div style={{ padding: "10px 0" }}>
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                    </div>

                    {/* Date */}
                    <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {shortDate(m._isoDate)}
                    </div>

                    {/* Type badge */}
                    <div style={{ padding: "10px 8px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500, background: t.bg, color: t.color, border: `0.5px solid ${t.color}22`, whiteSpace: "nowrap" }}>{t.label}</span>
                    </div>

                    {/* Product */}
                    <div style={{ padding: "10px 8px", display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 600, flexShrink: 0 }}>{initials(m.productName)}</div>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.productName || "—"}</span>
                    </div>

                    {/* Qty */}
                    <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 14, fontWeight: 700, color: m.type === "in" ? "#0F6E56" : m.type === "out" ? "#A32D2D" : "#854F0B" }}>
                      {m.type === "in" ? "+" : m.type === "out" ? "−" : "⚖"}{fmtInt(qty)}
                    </div>

                    {/* Unit */}
                    <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)" }}>{m.unit || "шт"}</div>

                    {/* Cost */}
                    <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 12, color: "var(--color-text-secondary)" }}>{cost > 0 ? fmt(cost) : "—"}</div>

                    {/* Total */}
                    <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: m.type === "in" ? "#0F6E56" : m.type === "out" ? "#A32D2D" : "#854F0B" }}>
                      {total > 0 ? fmtK(total) : "—"}
                    </div>

                    {/* Source */}
                    <div style={{ padding: "10px 8px", overflow: "hidden" }}>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                        <span>{reason.icon}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reason.label}</span>
                        {m.sourceDocNumber && <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>· {m.sourceDocNumber}</span>}
                      </div>
                      {m.notes && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{m.notes}</div>}
                    </div>

                    {/* Row actions (only manual) */}
                    <div className="mov-act" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      {isManual && <>
                        <button title="Редактировать" onClick={(e) => { e.stopPropagation(); onEdit(m); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>✏️</button>
                      </>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Footer */}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, fontSize: 13, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
              <span>Проводок: <strong>{filtered.length}</strong></span>
              <span style={{ color: "#0F6E56" }}>Приход: <strong>{fmt(totalIn)}</strong></span>
              <span style={{ color: "#A32D2D" }}>Расход: <strong>{fmt(totalOut)}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// АНАЛИТИКА TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ products, movements }) {
  const [period, setPeriod] = useState("3m");

  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === "1m") d.setMonth(d.getMonth() - 1);
    else if (period === "3m") d.setMonth(d.getMonth() - 3);
    else if (period === "6m") d.setMonth(d.getMonth() - 6);
    else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
    else return null;
    return d.toISOString().slice(0, 10);
  }, [period]);

  const periodMov = useMemo(() =>
    periodStart ? movements.filter((m) => (m._isoDate || "") >= periodStart) : movements,
    [movements, periodStart]
  );

  const stats = useMemo(() => {
    const goods     = products.filter((p) => p.type === "product");
    const totalVal  = goods.reduce((s, p) => s + (parseFloat(p.stock)||0) * (parseFloat(p.costPrice)||0), 0);
    const totalSkus = goods.length;
    const empty     = goods.filter((p) => (parseFloat(p.stock)||0) <= 0).length;
    const low       = goods.filter((p) => { const s = parseFloat(p.stock)||0; const m = parseFloat(p.minStock)||0; return s > 0 && m > 0 && s <= m; }).length;

    const inAmt  = periodMov.filter((m) => m.type === "in").reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0)*(parseFloat(m.costPrice)||0), 0);
    const outAmt = periodMov.filter((m) => m.type === "out").reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0)*(parseFloat(m.costPrice)||0), 0);

    // По категориям
    const catMap = {};
    goods.forEach((p) => {
      const c = p.category || "Без категории";
      if (!catMap[c]) catMap[c] = { name: c, count: 0, value: 0 };
      catMap[c].count++;
      catMap[c].value += (parseFloat(p.stock)||0) * (parseFloat(p.costPrice)||0);
    });
    const byCategory = Object.values(catMap).sort((a, b) => b.value - a.value);

    // Топ по движению
    const pMap = {};
    periodMov.forEach((m) => {
      if (!m.productId) return;
      if (!pMap[m.productId]) pMap[m.productId] = { id: m.productId, name: m.productName || "—", unit: m.unit || "шт", in: 0, out: 0, inAmt: 0, outAmt: 0 };
      const qty = Math.abs(parseFloat(m.qty)||0);
      const amt = qty * (parseFloat(m.costPrice)||0);
      if (m.type === "in")  { pMap[m.productId].in  += qty; pMap[m.productId].inAmt  += amt; }
      if (m.type === "out") { pMap[m.productId].out += qty; pMap[m.productId].outAmt += amt; }
    });
    const topByMovement = Object.values(pMap).sort((a, b) => (b.in + b.out) - (a.in + a.out)).slice(0, 10);

    // Оборачиваемость (грубо: расход/средний остаток за период)
    const turnover = topByMovement.map((p) => {
      const prod = goods.find((g) => g.id === p.id);
      const avgStock = parseFloat(prod?.stock) || 0;
      const rate = avgStock > 0 ? p.out / avgStock : null;
      return { ...p, avgStock, turnover: rate };
    }).filter((p) => p.out > 0).sort((a, b) => (b.turnover || 0) - (a.turnover || 0));

    // Monthly totals
    const monthCount = period === "1m" ? 4 : period === "3m" ? 3 : period === "6m" ? 6 : period === "1y" ? 12 : 12;
    const months = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mMov = periodMov.filter((m) => m._isoDate?.startsWith(key));
      months.push({
        label: MONTHS[d.getMonth()],
        in:  mMov.filter((m) => m.type === "in").reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0)*(parseFloat(m.costPrice)||0), 0),
        out: mMov.filter((m) => m.type === "out").reduce((s,m) => s + Math.abs(parseFloat(m.qty)||0)*(parseFloat(m.costPrice)||0), 0),
      });
    }

    return { totalVal, totalSkus, empty, low, inAmt, outAmt, byCategory, topByMovement, turnover, months };
  }, [products, periodMov, period]);

  const maxCatVal  = Math.max(...stats.byCategory.map((c) => c.value), 1);
  const maxMonthIn = Math.max(...stats.months.map((m) => Math.max(m.in, m.out)), 1);
  const maxTurn    = Math.max(...stats.turnover.map((p) => p.turnover || 0), 1);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* Period */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", alignSelf: "center", marginRight: 4 }}>Период движения:</span>
        {[["1m","1 мес."],["3m","3 мес."],["6m","6 мес."],["1y","1 год"],["all","Всё время"]].map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", background: period === key ? "#E1F5EE" : "var(--color-background-secondary)", color: period === key ? "#0F6E56" : "var(--color-text-secondary)", fontWeight: period === key ? 500 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Стоим. склада",   val: stats.totalVal, color: "#0F6E56", plain: false },
          { label: "SKU товаров",     val: stats.totalSkus, color: "var(--color-text-primary)", plain: true },
          { label: "Нет в наличии",   val: stats.empty, color: stats.empty > 0 ? "#A32D2D" : "var(--color-text-tertiary)", plain: true },
          { label: "Приход за период",val: stats.inAmt,  color: "#0F6E56", plain: false },
          { label: "Расход за период",val: stats.outAmt, color: "#A32D2D", plain: false },
        ].map(({ label, val, color, plain }) => (
          <div key={label} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Monthly bar */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Движение по месяцам</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#0F6E56" }}>
              <span style={{ width: 10, height: 10, background: "#0F6E56", borderRadius: 2, display: "inline-block" }} /> Приход
            </span>
            <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#A32D2D" }}>
              <span style={{ width: 10, height: 10, background: "#A32D2D", borderRadius: 2, display: "inline-block" }} /> Расход
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {stats.months.map((m, i) => {
              const hIn  = Math.max((m.in  / maxMonthIn) * 85, m.in  > 0 ? 4 : 1);
              const hOut = Math.max((m.out / maxMonthIn) * 85, m.out > 0 ? 4 : 1);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
                    <div style={{ width: "45%", height: hIn,  background: "#0F6E56", borderRadius: "2px 2px 0 0", opacity: 0.8 }} />
                    <div style={{ width: "45%", height: hOut, background: "#A32D2D", borderRadius: "2px 2px 0 0", opacity: 0.8 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By category */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Склад по категориям</div>
          {stats.byCategory.filter((c) => c.value > 0).length === 0
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>Нет данных</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.byCategory.filter((c) => c.value > 0).map((cat, i) => {
                  const [, clr] = AV_COLORS[i % AV_COLORS.length];
                  return (
                    <div key={cat.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.name} <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({cat.count})</span></span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtK(cat.value)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(cat.value / maxCatVal) * 100}%`, background: clr, borderRadius: 3, opacity: 0.75, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top by movement */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Топ по движению (кол-во)</div>
          {stats.topByMovement.length === 0
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>Нет данных</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.topByMovement.map((p, i) => {
                  const maxM = Math.max(...stats.topByMovement.map((x) => x.in + x.out), 1);
                  const [avatarBg, avatarColor] = avatarStyle(p.name);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: 11, flexShrink: 0, marginLeft: 6 }}>
                            <span style={{ color: "#0F6E56" }}>+{fmtInt(p.in)}</span>
                            <span style={{ color: "var(--color-text-tertiary)" }}> / </span>
                            <span style={{ color: "#A32D2D" }}>−{fmtInt(p.out)}</span>
                          </span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${((p.in + p.out) / maxM) * 100}%`, background: "#0F6E56", borderRadius: 2, opacity: 0.6 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Turnover */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Оборачиваемость</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 14 }}>расход / текущий остаток за период</div>
          {stats.turnover.length === 0
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>Нет данных</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.turnover.slice(0, 8).map((p, i) => {
                  const rate = p.turnover || 0;
                  const color = rate >= 2 ? "#0F6E56" : rate >= 1 ? "#854F0B" : "#A32D2D";
                  const [avatarBg, avatarColor] = avatarStyle(p.name);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, marginLeft: 6 }}>×{rate.toFixed(1)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min((rate / maxTurn) * 100, 100)}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", flexShrink: 0 }}>ост. {fmtInt(p.avgStock)} {p.unit}</span>
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
export default function WarehousePage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products,        setProducts]        = useState([]);
  const [manualMovements, setManualMovements] = useState([]);
  const [purchaseDocs,    setPurchaseDocs]    = useState([]);
  const [saleDocs,        setSaleDocs]        = useState([]);
  const [loadingProds,    setLoadingProds]    = useState(true);
  const [loadingMov,      setLoadingMov]      = useState(true);
  const [localError,      setLocalError]      = useState("");

  const [activeTab,       setActiveTab]       = useState("stock");
  const [movModal,        setMovModal]        = useState(null);  // null | { movement } | { prefill }
  const [showInventory,   setShowInventory]   = useState(false);

  // ── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingProds(true);
    const unsub = onSnapshot(userCol("products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, _docId: d.id, ...d.data() })));
      setLoadingProds(false);
    }, (e) => { setLocalError(e.message); setLoadingProds(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingMov(true);
    const unsub = onSnapshot(userCol("warehouse_movements"), (snap) => {
      setManualMovements(snap.docs.map((d) => ({ id: d.id, _docId: d.id, ...d.data(), _isoDate: normalizeDate(d.data().date || "") })));
      setLoadingMov(false);
    }, (e) => { setLocalError(e.message); setLoadingMov(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const u1 = onSnapshot(userCol("purchase_documents"), (snap) => {
      setPurchaseDocs(snap.docs.map((d) => ({ id: d.id, ...d.data(), _isoDate: normalizeDate(d.data().date || "") })));
    }, () => {});
    const u2 = onSnapshot(userCol("sale_documents"), (snap) => {
      setSaleDocs(snap.docs.map((d) => ({ id: d.id, ...d.data(), _isoDate: normalizeDate(d.data().date || "") })));
    }, () => {});
    return () => { u1(); u2(); };
  }, []);

  // ── Синтез движений из закупок и продаж ────────────────────────────────────
  const derivedMovements = useMemo(() => {
    const result = [];

    // Из закупок: тип receipt/act, статус delivered или paid
    purchaseDocs
      .filter((d) => ["receipt","act"].includes(d.type) && ["delivered","paid"].includes(d.status))
      .forEach((d) => {
        (d.items || []).forEach((item) => {
          if (!item.productId || !item.name || item.type !== "product") return;
          result.push({
            id: `pur_${d.id}_${item.productId}`,
            _isoDate: d._isoDate,
            type: "in",
            productId: item.productId,
            productName: item.name,
            unit: item.unit || "шт",
            qty: parseFloat(item.qty) || 0,
            costPrice: parseFloat(item.price) || 0,
            reason: "purchase",
            sourceType: "purchase",
            sourceId: d.id,
            sourceDocNumber: d.number,
            notes: d.supplierName ? `Поставщик: ${d.supplierName}` : "",
          });
        });
      });

    // Из продаж: тип shipment/act, статус shipped/paid
    saleDocs
      .filter((d) => ["shipment","act"].includes(d.type) && ["shipped","paid"].includes(d.status))
      .forEach((d) => {
        (d.items || []).forEach((item) => {
          if (!item.productId || !item.name || item.type !== "product") return;
          result.push({
            id: `sale_${d.id}_${item.productId}`,
            _isoDate: d._isoDate,
            type: "out",
            productId: item.productId,
            productName: item.name,
            unit: item.unit || "шт",
            qty: parseFloat(item.qty) || 0,
            costPrice: parseFloat(item.costPrice) || item.price || 0,
            reason: "sale",
            sourceType: "sale",
            sourceId: d.id,
            sourceDocNumber: d.number,
            notes: d.clientName ? `Клиент: ${d.clientName}` : "",
          });
        });
      });

    return result;
  }, [purchaseDocs, saleDocs]);

  // Все движения = derived + manual, сортировка по дате
  const allMovements = useMemo(() => {
    const combined = [
      ...derivedMovements,
      ...manualMovements.map((m) => ({ ...m, sourceType: m.sourceType || "manual" })),
    ].sort((a, b) => (b._isoDate || "").localeCompare(a._isoDate || ""));
    return combined;
  }, [derivedMovements, manualMovements]);

  // ── Hotkey N ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !movModal && !showInventory) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        setMovModal({ movement: null });
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [movModal, showInventory]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSaveMovement = async (form) => {
    try {
      const qty = parseFloat(form.qty) || 0;

      // Вычисляем изменение остатка для продукта
      let stockDelta = 0;
      if (form.type === "in")     stockDelta = qty;
      if (form.type === "out")    stockDelta = -qty;
      if (form.type === "adjust") {
        const prod = products.find((p) => p.id === form.productId);
        stockDelta = qty - (parseFloat(prod?.stock) || 0);
      }

      const data = {
        date:        form._isoDate,
        type:        form.type,
        productId:   form.productId,
        productName: form.productName,
        unit:        form.unit || "шт",
        qty:         qty,
        costPrice:   parseFloat(form.costPrice) || 0,
        reason:      form.reason,
        sourceType:  "manual",
        notes:       form.notes || "",
        updatedAt:   serverTimestamp(),
      };

      const batch = writeBatch(db);

      if (form._docId) {
        batch.update(userDoc("warehouse_movements", form._docId), data);
      } else {
        const movRef = doc(userCol("warehouse_movements"));
        batch.set(movRef, { ...data, createdAt: serverTimestamp() });
      }

      // Обновляем остаток в products
      if (form.productId && stockDelta !== 0) {
        const prod = products.find((p) => p.id === form.productId);
        if (prod?._docId) {
          const newStock = Math.max(0, (parseFloat(prod.stock) || 0) + stockDelta);
          batch.update(userDoc("products", prod._docId), { stock: newStock, updatedAt: serverTimestamp() });
        }
      }

      await batch.commit();

// 👇 добавь сюда
if (form.productId && stockDelta !== 0) {
  const prod = products.find((p) => p.id === form.productId);
  if (prod) {
    const newStock = Math.max(0, (parseFloat(prod.stock) || 0) + stockDelta);
    const minStock = parseFloat(prod.minStock) || 0;
    if (newStock <= 0) {
      await notifyNoStock(prod.name);
    } else if (minStock > 0 && newStock <= minStock) {
      await notifyLowStock(prod.name, newStock, minStock);
    }
  }
}

    } catch (e) { setLocalError("Ошибка: " + e.message); }
    setMovModal(null);
  };

  const handleDeleteMovement = async (docId) => {
    if (!window.confirm("Удалить проводку? Остаток товара не будет скорректирован автоматически.")) return;
    try { await deleteDoc(userDoc("warehouse_movements", docId)); }
    catch (e) { setLocalError("Ошибка: " + e.message); }
    setMovModal(null);
  };

  // Инвентаризация — сохраняем корректировки пачкой
  const handleInventorySave = async (changed, date, notes) => {
    try {
      const batch = writeBatch(db);
      for (const row of changed) {
        const fact = parseFloat(row.fact);
        if (isNaN(fact)) continue;
        const delta = fact - row.current;

        // Проводка
        const movRef = doc(userCol("warehouse_movements"));
        batch.set(movRef, {
          date, type: "adjust",
          productId: row.productId, productName: row.name, unit: row.unit,
          qty: fact, costPrice: row.costPrice,
          reason: "inventory", sourceType: "manual",
          notes: notes || "Инвентаризация",
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });

        // Остаток
        const prod = products.find((p) => p.id === row.productId);
        if (prod?._docId) {
          batch.update(userDoc("products", prod._docId), { stock: Math.max(0, fact), updatedAt: serverTimestamp() });
        }
      }
      await batch.commit();

// 👇 добавь сюда
for (const row of changed) {
  const fact = parseFloat(row.fact);
  if (isNaN(fact)) continue;
  if (fact <= 0) {
    await notifyNoStock(row.name);
  } else if (row.minStock > 0 && fact <= row.minStock) {
    await notifyLowStock(row.name, fact, row.minStock);
  }
}

    } catch (e) { setLocalError("Ошибка инвентаризации: " + e.message); }
    setShowInventory(false);
  };

  const loading = loadingProds || loadingMov;
  const TABS = [["stock","Остатки"],["movements","Движение"],["inventory_tab","Инвентаризация"],["analytics","Аналитика"]];

  const goodsCount = products.filter((p) => p.type === "product").length;
  const totalStockVal = products.filter((p) => p.type === "product").reduce((s, p) => s + (parseFloat(p.stock)||0) * (parseFloat(p.costPrice)||0), 0);

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "100%", overflow: "hidden", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", display: "flex", flexDirection: "column" }}>

      {/* ── Modals ── */}
      {movModal && (
        <MovementModal
          movement={movModal.movement || null}
          products={products}
          onSave={handleSaveMovement}
          onDelete={handleDeleteMovement}
          onClose={() => setMovModal(null)}
        />
      )}
      {showInventory && (
        <InventoryModal
          products={products}
          onSave={handleInventorySave}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, zIndex: 200, background: "var(--color-background-primary)" }}>
        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Склад</h1>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "2px 9px" }}>
                {goodsCount} товаров
              </span>
              <span style={{ fontSize: 12, color: "#0F6E56", background: "#E1F5EE", border: "0.5px solid #0F6E5622", borderRadius: 10, padding: "2px 9px", fontWeight: 500 }}>
                {fmtK(totalStockVal)} ₽
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setShowInventory(true)}
                style={{ padding: "7px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                📋 Инвентаризация
              </button>
              <button onClick={() => setMovModal({ movement: null })}
                style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                + Проводка
              </button>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }} title="N — новая проводка">N</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(([key, label]) => (
              <div key={key} onClick={() => setActiveTab(key)}
                style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer", borderBottom: activeTab === key ? "2px solid #0F6E56" : "2px solid transparent", color: activeTab === key ? "#0F6E56" : "var(--color-text-secondary)", fontWeight: activeTab === key ? 500 : 400, userSelect: "none" }}>
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
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>
        {loading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
        )}

        {/* ОСТАТКИ */}
        {!loading && activeTab === "stock" && (
          <StockTab
            products={products}
            allMovements={allMovements}
            onEdit={(prod, type) => setMovModal({ movement: { productId: prod.id, productName: prod.name, unit: prod.unit || "шт", costPrice: prod.costPrice || 0, type: type || "in", _isoDate: todayISO(), qty: "", reason: type === "in" ? "manual_in" : "manual_out", notes: "" } })}
            onNewMovement={() => setMovModal({ movement: null })}
          />
        )}

        {/* ДВИЖЕНИЕ */}
        {!loading && activeTab === "movements" && (
          <MovementsTab
            movements={allMovements}
            products={products}
            onEdit={(m) => setMovModal({ movement: m })}
            onNew={() => setMovModal({ movement: null })}
          />
        )}

        {/* ИНВЕНТАРИЗАЦИЯ (вкладка) */}
        {!loading && activeTab === "inventory_tab" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Info cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { title: "Что такое инвентаризация?", icon: "📋", text: "Сверка фактических остатков с учётными. Вводите фактическое количество по каждому товару — система зафиксирует расхождения как корректировки и обновит остатки.", color: "#E1F5EE", border: "#0F6E5633" },
                  { title: "Когда проводить?", icon: "📅", text: "Рекомендуется ежемесячно или при подозрении на расхождения. Также проводите перед закрытием отчётного периода.", color: "#E6F1FB", border: "#185FA533" },
                  { title: "Что происходит с данными?", icon: "⚖", text: "Каждое расхождение создаёт проводку типа «Корректировка» с причиной «Инвентаризация». Все изменения видны во вкладке «Движение».", color: "#FAEEDA", border: "#854F0B33" },
                ].map(({ title, icon, text, color, border }) => (
                  <div key={title} style={{ background: color, borderRadius: "var(--border-radius-lg)", border: `0.5px solid ${border}`, padding: "16px 20px" }}>
                    <div style={{ fontSize: 16, marginBottom: 6 }}>{icon} <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span></div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{text}</div>
                  </div>
                ))}
              </div>

              {/* Recent inventory movements */}
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>История инвентаризаций</div>
                  <button onClick={() => setShowInventory(true)}
                    style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    📋 Начать инвентаризацию
                  </button>
                </div>
                {(() => {
                  const invMov = allMovements.filter((m) => m.reason === "inventory").slice(0, 20);
                  if (invMov.length === 0) return (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                      Инвентаризаций ещё не проводилось
                    </div>
                  );
                  return (
                    <div>
                      {/* Group by date */}
                      {(() => {
                        const byDate = {};
                        invMov.forEach((m) => {
                          const k = m._isoDate || "?";
                          if (!byDate[k]) byDate[k] = [];
                          byDate[k].push(m);
                        });
                        return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, rows]) => (
                          <div key={date} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, paddingBottom: 4, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                              {longDate(date)} · {rows.length} позиций
                            </div>
                            {rows.map((m) => {
                              const delta = m.type === "adjust" ? null : m.qty;
                              return (
                                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                                  <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.productName}</span>
                                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{m.unit || "шт"}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: "right", color: "var(--color-text-secondary)" }}>→ {fmtInt(m.qty)}</span>
                                  {m.notes && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.notes}</span>}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* АНАЛИТИКА */}
        {!loading && activeTab === "analytics" && (
          <AnalyticsTab products={products} movements={allMovements} />
        )}
      </div>
    </div>
  );
}

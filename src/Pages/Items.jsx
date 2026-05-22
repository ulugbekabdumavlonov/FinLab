/**
 * ProductsPage.jsx — v1.0
 *
 * ТОЛЬКО ТОВАРЫ И УСЛУГИ.
 * Каталог продуктов — единственный источник правды по номенклатуре.
 * SalesPage читает отсюда данные (только чтение).
 *
 * ВКЛАДКИ:
 *   Каталог     — список всех товаров и услуг с поиском и фильтрами
 *   Категории   — управление деревом категорий
 *   Аналитика   — остатки, оборот, маржинальность, топ
 *
 * СТРУКТУРА ТОВАРА (Firestore: products):
 *   {
 *     name, type,              ← "product" | "service"
 *     sku, barcode,
 *     category,
 *     unit,                   ← единица измерения
 *     salePrice, costPrice,   ← цена продажи и себестоимость
 *     vat,                    ← ставка НДС %
 *     stock,                  ← остаток (только для товаров)
 *     minStock,               ← минимальный остаток (сигнал о нехватке)
 *     description, notes,
 *     images,                 ← массив URL (опц.)
 *     isActive,               ← архив/активный
 *     createdAt, updatedAt
 *   }
 *
 * ЗАВИСИМОСТИ:
 *   - firebase / auth / db
 *   - useAppStore (для согласования с глобальным стором)
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, collection, onSnapshot, writeBatch, getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

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

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Единицы измерения ─────────────────────────────────────────────────────────
const UNITS = [
  "шт", "кг", "г", "т", "л", "мл", "м", "м²", "м³", "км",
  "упак", "коробка", "паллет", "рулон", "лист", "час", "день",
  "месяц", "комплект", "набор", "услуга",
];

// ─── VAT rates ─────────────────────────────────────────────────────────────────
const VAT_RATES = [0, 12, 15, 20];

// ─── Product / Service type ────────────────────────────────────────────────────
const ITEM_TYPES = [
  { id: "product", label: "Товар",   icon: "📦", color: "#185FA5", bg: "#E6F1FB" },
  { id: "service", label: "Услуга",  icon: "🛠",  color: "#0F6E56", bg: "#E1F5EE" },
];
const TYPE_MAP = Object.fromEntries(ITEM_TYPES.map((t) => [t.id, t]));

// ─── Default categories ────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  "Без категории", "Электроника", "Одежда", "Продукты питания",
  "Строительные материалы", "Мебель", "Химия / Бытовая химия",
  "Автозапчасти", "Инструменты", "Медикаменты", "Косметика",
  "Услуги монтажа", "Услуги консалтинга", "Услуги доставки",
];

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(products) {
  const h = [
    "Наименование","Тип","Артикул","Штрихкод","Категория","Ед.","Цена продажи",
    "Себестоимость","НДС%","Маржа%","Остаток","Мин. остаток","Активен","Описание",
  ];
  const rows = products.map((p) => {
    const margin = p.salePrice > 0 ? Math.round((p.salePrice - p.costPrice) / p.salePrice * 100) : 0;
    return [
      p.name, TYPE_MAP[p.type]?.label || p.type, p.sku || "", p.barcode || "",
      p.category || "—", p.unit || "шт",
      p.salePrice || 0, p.costPrice || 0, p.vat || 0, margin,
      p.type === "product" ? (p.stock ?? 0) : "—",
      p.type === "product" ? (p.minStock ?? 0) : "—",
      p.isActive === false ? "Нет" : "Да",
      p.description || "",
    ];
  });
  const csv = [h, ...rows].map((r) =>
    r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `номенклатура_${todayISO()}.csv`; a.click();
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
  const s   = parseFloat(stock) || 0;
  const min = parseFloat(minStock) || 0;
  const isLow  = min > 0 && s <= min;
  const isEmpty = s === 0;

  const color = isEmpty ? "#A32D2D" : isLow ? "#854F0B" : "#3B6D11";
  const bg    = isEmpty ? "#FCEBEB" : isLow ? "#FAEEDA" : "#EAF3DE";
  const icon  = isEmpty ? "⚠" : isLow ? "↓" : "✓";

  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
      background: bg, color, display: "inline-flex", alignItems: "center", gap: 3,
      border: `0.5px solid ${color}22`, whiteSpace: "nowrap",
    }}>
      {icon} {fmtInt(s)} {unit || "шт"}
    </span>
  );
}

// ─── Type badge ────────────────────────────────────────────────────────────────
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

// ─── Margin badge ──────────────────────────────────────────────────────────────
function MarginBadge({ salePrice, costPrice }) {
  const sale = parseFloat(salePrice) || 0;
  const cost = parseFloat(costPrice) || 0;
  if (sale === 0) return <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>—</span>;
  const pct = Math.round((sale - cost) / sale * 100);
  const color = pct >= 30 ? "#3B6D11" : pct >= 15 ? "#854F0B" : pct >= 0 ? "#185FA5" : "#A32D2D";
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
  );
}

// ─── Generic Dropdown ──────────────────────────────────────────────────────────
function Dropdown({ options, value, onChange, placeholder = "Выбрать", zIndex = 500, getLabel, getValue, allowCustom }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);

  const getL = getLabel || ((o) => String(o));
  const getV = getValue || ((o) => o);

  const filtered = options.filter((o) => getL(o).toLowerCase().includes(q.toLowerCase()));
  const selLabel = value
    ? (getL(options.find((o) => getV(o) === value) ?? value) || value)
    : "";

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
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)", cursor: "pointer",
          background: "var(--color-background-secondary)", fontSize: 14,
          color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selLabel || placeholder}
        </span>
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
            <div
              onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >— Не выбрано</div>
            {filtered.map((opt, i) => {
              const label   = getL(opt);
              const val     = getV(opt);
              const isActive = val === value;
              return (
                <div key={i}
                  onClick={() => { onChange(val, opt); setOpen(false); setQ(""); }}
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
            {allowCustom && q && !filtered.some((o) => getL(o).toLowerCase() === q.toLowerCase()) && (
              <div
                onClick={() => { onChange(q); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "#185FA5", fontStyle: "italic" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >+ Создать «{q}»</div>
            )}
            {!filtered.length && !allowCustom && (
              <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function ProductModal({ product, categories, onSave, onDelete, onClose }) {
  const isEdit  = Boolean(product?._docId);
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState("main");

  const [form, setForm] = useState(() =>
    product
      ? { ...product }
      : {
          name: "", type: "product", sku: "", barcode: "", category: "Без категории",
          unit: "шт", salePrice: "", costPrice: "", vat: 0,
          stock: 0, minStock: 0,
          description: "", notes: "", isActive: true,
        }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const margin = useMemo(() => {
    const s = parseFloat(form.salePrice) || 0;
    const c = parseFloat(form.costPrice) || 0;
    return s > 0 ? ((s - c) / s * 100).toFixed(1) : 0;
  }, [form.salePrice, form.costPrice]);

  const marginColor = margin >= 30 ? "#3B6D11" : margin >= 15 ? "#854F0B" : margin >= 0 ? "#185FA5" : "#A32D2D";

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
    if (saving || !form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  const TABS = [
    ["main",    "Основное"],
    ["pricing", "Цены и НДС"],
    form.type === "product" ? ["stock", "Склад / Остатки"] : null,
    ["extra",   "Описание"],
  ].filter(Boolean);

  const allCats = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort((a, b) =>
    a === "Без категории" ? -1 : b === "Без категории" ? 1 : a.localeCompare(b)
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500,
    }}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)", width: 640, maxWidth: "97vw",
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>
                {isEdit ? form.name || "Редактировать" : "Новая позиция"}
              </h2>
              {isEdit && (
                <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
                  <TypeBadge typeId={form.type} small />
                  {form.category && (
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", borderRadius: 20, padding: "2px 8px", border: "0.5px solid var(--color-border-secondary)" }}>
                      {form.category}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: form.isActive ? "#3B6D11" : "var(--color-text-tertiary)" }}>
                    {form.isActive ? "✓ Активен" : "Архив"}
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {ITEM_TYPES.map((t) => (
              <button key={t.id} onClick={() => set("type", t.id)}
                style={{
                  flex: 1, padding: "9px", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
                  fontSize: 13, fontWeight: form.type === t.id ? 600 : 400,
                  background: form.type === t.id ? t.bg : "var(--color-background-secondary)",
                  color: form.type === t.id ? t.color : "var(--color-text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {TABS.map(([key, label]) => (
              <div key={key} onClick={() => setTab(key)}
                style={{
                  padding: "8px 16px", fontSize: 14, cursor: "pointer",
                  borderBottom: tab === key ? "2px solid #3b62d6" : "2px solid transparent",
                  color: tab === key ? "#3b62d6" : "var(--color-text-secondary)",
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
              <div>
                <div style={lbl}>Наименование *</div>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Название товара или услуги…"
                  autoFocus
                  style={{ ...inp, fontSize: 15, fontWeight: 500 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Категория</div>
                  <Dropdown
                    options={allCats}
                    value={form.category}
                    onChange={(v) => set("category", v)}
                    placeholder="Без категории"
                    allowCustom
                    zIndex={600}
                  />
                </div>
                <div>
                  <div style={lbl}>Единица измерения</div>
                  <Dropdown
                    options={UNITS}
                    value={form.unit}
                    onChange={(v) => set("unit", v)}
                    placeholder="шт"
                    allowCustom
                    zIndex={600}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Артикул / SKU</div>
                  <input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="A-001…" style={inp} />
                </div>
                <div>
                  <div style={lbl}>Штрихкод / Barcode</div>
                  <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="4601234567890…" style={inp} />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                padding: "12px 16px", border: "0.5px solid var(--color-border-tertiary)",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Активная позиция</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    Архивные позиции не отображаются при создании продаж
                  </div>
                </div>
                <div
                  onClick={() => set("isActive", !form.isActive)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: form.isActive ? "#3b62d6" : "var(--color-border-secondary)",
                    cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 2,
                    left: form.isActive ? 22 : 2,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#fff", transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* ── PRICING ── */}
          {tab === "pricing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Цена продажи</div>
                  <input
                    type="number" min={0} value={form.salePrice}
                    onChange={(e) => set("salePrice", e.target.value)}
                    placeholder="0.00" style={{ ...inp, fontSize: 16, fontWeight: 600 }}
                  />
                </div>
                <div>
                  <div style={lbl}>Себестоимость</div>
                  <input
                    type="number" min={0} value={form.costPrice}
                    onChange={(e) => set("costPrice", e.target.value)}
                    placeholder="0.00" style={inp}
                  />
                </div>
              </div>

              {/* Margin display */}
              <div style={{
                background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                padding: "14px 18px", border: "0.5px solid var(--color-border-tertiary)",
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12,
              }}>
                {[
                  ["Цена продажи",    fmt(parseFloat(form.salePrice) || 0), "#185FA5"],
                  ["Себестоимость",   fmt(parseFloat(form.costPrice) || 0), "var(--color-text-secondary)"],
                  ["Маржа (сумма)",   fmt((parseFloat(form.salePrice) || 0) - (parseFloat(form.costPrice) || 0)), marginColor],
                  ["Маржа %",         `${margin}%`, marginColor],
                ].map(([label, val, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* VAT */}
              <div>
                <div style={lbl}>Ставка НДС</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {VAT_RATES.map((r) => (
                    <button key={r} onClick={() => set("vat", r)}
                      style={{
                        flex: 1, padding: "9px", borderRadius: "var(--border-radius-md)",
                        border: form.vat === r ? "1.5px solid #3b62d6" : "0.5px solid var(--color-border-secondary)",
                        background: form.vat === r ? "var(--color-background-info)" : "var(--color-background-secondary)",
                        color: form.vat === r ? "var(--color-text-info)" : "var(--color-text-secondary)",
                        fontSize: 14, fontWeight: form.vat === r ? 600 : 400, cursor: "pointer",
                      }}>
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Price incl. VAT info */}
              {parseFloat(form.salePrice) > 0 && (
                <div style={{
                  background: "#E6F1FB", borderRadius: "var(--border-radius-md)",
                  padding: "10px 16px", border: "0.5px solid #185FA533", fontSize: 13, color: "#185FA5",
                }}>
                  💡 Цена с НДС ({form.vat}%): <strong>{fmt((parseFloat(form.salePrice) || 0) * (1 + (form.vat || 0) / 100))}</strong>
                </div>
              )}
            </div>
          )}

          {/* ── STOCK ── */}
          {tab === "stock" && form.type === "product" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={lbl}>Текущий остаток</div>
                  <input
                    type="number" min={0} value={form.stock}
                    onChange={(e) => set("stock", e.target.value)}
                    placeholder="0" style={{ ...inp, fontSize: 16, fontWeight: 600 }}
                  />
                </div>
                <div>
                  <div style={lbl}>Минимальный остаток</div>
                  <input
                    type="number" min={0} value={form.minStock}
                    onChange={(e) => set("minStock", e.target.value)}
                    placeholder="0"
                    style={inp}
                  />
                </div>
              </div>

              {/* Stock status */}
              {(() => {
                const s   = parseFloat(form.stock) || 0;
                const min = parseFloat(form.minStock) || 0;
                const isEmpty = s === 0;
                const isLow   = min > 0 && s <= min && !isEmpty;
                const isOk    = !isEmpty && !isLow;
                return (
                  <div style={{
                    borderRadius: "var(--border-radius-md)", padding: "14px 18px",
                    background: isEmpty ? "#FCEBEB" : isLow ? "#FAEEDA" : "#EAF3DE",
                    border: `0.5px solid ${isEmpty ? "#A32D2D" : isLow ? "#854F0B" : "#3B6D11"}33`,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isEmpty ? "#A32D2D" : isLow ? "#854F0B" : "#3B6D11" }}>
                      {isEmpty ? "⚠ Нет в наличии" : isLow ? "↓ Мало на складе" : "✓ В наличии"}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, color: "var(--color-text-secondary)" }}>
                      Остаток: <strong>{fmtInt(s)} {form.unit || "шт"}</strong>
                      {min > 0 && ` · Минимум: ${fmtInt(min)} ${form.unit || "шт"}`}
                      {isOk && min > 0 && ` · Запас: ${fmtInt(s - min)} ${form.unit || "шт"}`}
                    </div>
                    {isOk && parseFloat(form.costPrice) > 0 && (
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                        Стоимость остатка: {fmt(s * (parseFloat(form.costPrice) || 0))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{
                background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                padding: "10px 16px", fontSize: 12, color: "var(--color-text-tertiary)",
                border: "0.5px solid var(--color-border-tertiary)",
              }}>
                💡 Остатки обновляйте вручную или настройте интеграцию со складской программой.
                При минимальном остатке система сигнализирует о необходимости пополнения.
              </div>
            </div>
          )}

          {/* ── EXTRA ── */}
          {tab === "extra" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={lbl}>Описание товара / услуги</div>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Подробное описание, характеристики, состав…"
                  style={{ ...inp, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
              <div>
                <div style={lbl}>Внутренние заметки (не видны клиентам)</div>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Поставщик, условия хранения, напоминания…"
                  style={{ ...inp, minHeight: 72, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            style={{
              flex: 1, padding: "10px 0",
              background: (saving || !form.name.trim()) ? "#8ea4ea" : "#3b62d6",
              color: "#fff", border: "none", borderRadius: "var(--border-radius-md)",
              fontSize: 14, fontWeight: 500,
              cursor: (saving || !form.name.trim()) ? "not-allowed" : "pointer",
              opacity: (saving || !form.name.trim()) ? 0.75 : 1,
            }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить изменения" : "Добавить позицию"}
          </button>
          <button onClick={onClose} style={{
            padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)",
          }}>Отмена</button>
          {isEdit && (
            <button onClick={() => onDelete(product._docId)} style={{
              padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)",
              borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)",
            }}>Удалить</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES MODAL (quick-add / rename / delete)
// ═══════════════════════════════════════════════════════════════════════════════
function CategoriesTab({ products, onEditProduct }) {
  const categoryStats = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const cat = p.category || "Без категории";
      if (!map[cat]) map[cat] = { name: cat, count: 0, active: 0, products: 0, services: 0, totalStock: 0, totalValue: 0, avgMargin: [] };
      map[cat].count++;
      if (p.isActive !== false) map[cat].active++;
      if (p.type === "product") {
        map[cat].products++;
        map[cat].totalStock += parseFloat(p.stock) || 0;
        map[cat].totalValue += (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0);
      } else {
        map[cat].services++;
      }
      if (parseFloat(p.salePrice) > 0) {
        const m = (p.salePrice - p.costPrice) / p.salePrice * 100;
        map[cat].avgMargin.push(m);
      }
    });
    return Object.values(map).map((c) => ({
      ...c,
      avgMarginPct: c.avgMargin.length
        ? Math.round(c.avgMargin.reduce((s, v) => s + v, 0) / c.avgMargin.length)
        : null,
    })).sort((a, b) => b.count - a.count);
  }, [products]);

  const [expanded, setExpanded] = useState(new Set());
  const toggle = (name) => setExpanded((p) => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Категорий",         val: categoryStats.length,                            color: "var(--color-text-primary)" },
          { label: "Всего позиций",     val: products.length,                                  color: "#185FA5" },
          { label: "Активных",          val: products.filter((p) => p.isActive !== false).length, color: "#3B6D11" },
          { label: "В архиве",          val: products.filter((p) => p.isActive === false).length, color: "var(--color-text-tertiary)" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "14px 18px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {categoryStats.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-tertiary)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
          Добавьте товары или услуги, чтобы увидеть категории
        </div>
      )}

      {/* Category cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {categoryStats.map((cat) => {
          const isOpen = expanded.has(cat.name);
          const catProducts = products.filter((p) => (p.category || "Без категории") === cat.name);
          const mColor = cat.avgMarginPct == null ? "var(--color-text-tertiary)"
            : cat.avgMarginPct >= 30 ? "#3B6D11"
            : cat.avgMarginPct >= 15 ? "#854F0B" : "#A32D2D";

          return (
            <div key={cat.name} style={{
              background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
              border: "0.5px solid var(--color-border-secondary)", overflow: "hidden",
            }}>
              <div
                onClick={() => toggle(cat.name)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>📂</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2, display: "flex", gap: 12 }}>
                    {cat.products > 0 && <span>📦 {cat.products} тов.</span>}
                    {cat.services > 0 && <span>🛠 {cat.services} усл.</span>}
                    {cat.active < cat.count && <span style={{ color: "var(--color-text-tertiary)" }}>({cat.count - cat.active} в архиве)</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {cat.products > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Стоим. остатков</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#185FA5" }}>{fmtK(cat.totalValue)}</div>
                    </div>
                  )}
                  {cat.avgMarginPct !== null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Ср. маржа</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: mColor }}>{cat.avgMarginPct}%</div>
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>{isOpen ? "▴" : "▾"}</div>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  {catProducts.map((p) => (
                    <div key={p.id}
                      onClick={() => onEditProduct(p)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 18px 9px 54px",
                        borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer",
                        opacity: p.isActive === false ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <TypeBadge typeId={p.type} small />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                      {p.sku && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.sku}</span>}
                      {p.type === "product" && (
                        <StockBadge stock={p.stock} minStock={p.minStock} unit={p.unit} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#185FA5", minWidth: 80, textAlign: "right" }}>
                        {fmt(p.salePrice || 0)}
                      </span>
                      <MarginBadge salePrice={p.salePrice} costPrice={p.costPrice} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ products }) {
  const [sortBy, setSortBy] = useState("revenue"); // revenue | margin | stock | price

  const stats = useMemo(() => {
    const active      = products.filter((p) => p.isActive !== false);
    const goods       = active.filter((p) => p.type === "product");
    const services    = active.filter((p) => p.type === "service");
    const totalValue  = goods.reduce((s, p) => s + (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0), 0);
    const lowStock    = goods.filter((p) => {
      const s = parseFloat(p.stock) || 0;
      const m = parseFloat(p.minStock) || 0;
      return m > 0 && s <= m;
    });
    const outOfStock  = goods.filter((p) => (parseFloat(p.stock) || 0) === 0);
    const avgMargins  = active.filter((p) => parseFloat(p.salePrice) > 0).map((p) =>
      (p.salePrice - p.costPrice) / p.salePrice * 100
    );
    const avgMargin   = avgMargins.length ? avgMargins.reduce((s, v) => s + v, 0) / avgMargins.length : 0;

    // By category
    const catMap = {};
    active.forEach((p) => {
      const cat = p.category || "Без категории";
      if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, value: 0, margins: [] };
      catMap[cat].count++;
      catMap[cat].value += (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0);
      if (parseFloat(p.salePrice) > 0)
        catMap[cat].margins.push((p.salePrice - p.costPrice) / p.salePrice * 100);
    });
    const byCategory = Object.values(catMap)
      .map((c) => ({ ...c, avgMargin: c.margins.length ? c.margins.reduce((s, v) => s + v, 0) / c.margins.length : 0 }))
      .sort((a, b) => b.value - a.value);

    return { active, goods, services, totalValue, lowStock, outOfStock, avgMargin, byCategory };
  }, [products]);

  const sorted = useMemo(() => {
    const list = [...products.filter((p) => p.isActive !== false)];
    if (sortBy === "margin") {
      return list.filter((p) => parseFloat(p.salePrice) > 0)
        .sort((a, b) => ((b.salePrice - b.costPrice) / b.salePrice) - ((a.salePrice - a.costPrice) / a.salePrice))
        .slice(0, 15);
    }
    if (sortBy === "stock") {
      return list.filter((p) => p.type === "product" && parseFloat(p.stock) > 0)
        .sort((a, b) => (parseFloat(b.stock) || 0) * (parseFloat(b.costPrice) || 0) - (parseFloat(a.stock) || 0) * (parseFloat(a.costPrice) || 0))
        .slice(0, 15);
    }
    if (sortBy === "price") {
      return list.sort((a, b) => (parseFloat(b.salePrice) || 0) - (parseFloat(a.salePrice) || 0)).slice(0, 15);
    }
    // revenue = salePrice * stock for products
    return list.filter((p) => parseFloat(p.salePrice) > 0)
      .sort((a, b) => {
        const aV = (parseFloat(a.salePrice) || 0) * (parseFloat(a.stock) || 1);
        const bV = (parseFloat(b.salePrice) || 0) * (parseFloat(b.stock) || 1);
        return bV - aV;
      })
      .slice(0, 15);
  }, [products, sortBy]);

  const maxSorted = Math.max(...sorted.map((p) => {
    if (sortBy === "margin") return (p.salePrice - p.costPrice) / p.salePrice * 100;
    if (sortBy === "stock")  return (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0);
    if (sortBy === "price")  return parseFloat(p.salePrice) || 0;
    return (parseFloat(p.salePrice) || 0) * (parseFloat(p.stock) || 1);
  }), 1);

  const maxCatVal = Math.max(...stats.byCategory.map((c) => c.value), 1);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Активных позиций",  val: stats.active.length,         color: "#185FA5",                         plain: true },
          { label: "Товаров",           val: stats.goods.length,           color: "#185FA5",                         plain: true },
          { label: "Услуг",             val: stats.services.length,        color: "#0F6E56",                         plain: true },
          { label: "Стоим. остатков",   val: stats.totalValue,             color: "#3B6D11",                         plain: false },
          { label: "Ср. маржа",         val: `${Math.round(stats.avgMargin)}%`,  color: stats.avgMargin >= 20 ? "#3B6D11" : stats.avgMargin >= 0 ? "#854F0B" : "#A32D2D", plain: true },
        ].map(({ label, val, color, plain }) => (
          <div key={label} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts row */}
      {(stats.lowStock.length > 0 || stats.outOfStock.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {stats.outOfStock.length > 0 && (
            <div style={{ background: "#FCEBEB", borderRadius: "var(--border-radius-lg)", border: "0.5px solid #A32D2D33", padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#A32D2D", marginBottom: 8 }}>⚠ Нет в наличии ({stats.outOfStock.length})</div>
              {stats.outOfStock.slice(0, 5).map((p) => (
                <div key={p.id} style={{ fontSize: 12, color: "#A32D2D", padding: "3px 0", borderTop: "0.5px solid #A32D2D22" }}>
                  {p.name}
                </div>
              ))}
              {stats.outOfStock.length > 5 && <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 4 }}>+ ещё {stats.outOfStock.length - 5}</div>}
            </div>
          )}
          {stats.lowStock.length > 0 && (
            <div style={{ background: "#FAEEDA", borderRadius: "var(--border-radius-lg)", border: "0.5px solid #854F0B33", padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#854F0B", marginBottom: 8 }}>↓ Мало на складе ({stats.lowStock.length})</div>
              {stats.lowStock.slice(0, 5).map((p) => (
                <div key={p.id} style={{ fontSize: 12, color: "#854F0B", padding: "3px 0", borderTop: "0.5px solid #854F0B22", display: "flex", justifyContent: "space-between" }}>
                  <span>{p.name}</span>
                  <span style={{ fontWeight: 600 }}>{fmtInt(p.stock)} / {fmtInt(p.minStock)} {p.unit || "шт"}</span>
                </div>
              ))}
              {stats.lowStock.length > 5 && <div style={{ fontSize: 11, color: "#854F0B", marginTop: 4 }}>+ ещё {stats.lowStock.length - 5}</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* By category */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>По категориям (стоимость остатков)</div>
          {stats.byCategory.filter((c) => c.value > 0).length === 0
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>Нет данных по остаткам</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.byCategory.filter((c) => c.value > 0).map((cat, i) => {
                  const AV = AV_COLORS[i % AV_COLORS.length];
                  return (
                    <div key={cat.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{cat.name} <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>({cat.count})</span></span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtK(cat.value)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(cat.value / maxCatVal) * 100}%`, background: AV[1], borderRadius: 3, opacity: 0.7, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>

        {/* Margin distribution */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Распределение маржи</div>
          {(() => {
            const buckets = [
              { label: "Убыточные (< 0%)",   min: -Infinity, max: 0,  color: "#A32D2D" },
              { label: "Низкая (0–15%)",      min: 0,         max: 15, color: "#854F0B" },
              { label: "Средняя (15–30%)",    min: 15,        max: 30, color: "#185FA5" },
              { label: "Высокая (30%+)",      min: 30,        max: Infinity, color: "#3B6D11" },
            ];
            const priced = products.filter((p) => p.isActive !== false && parseFloat(p.salePrice) > 0);
            const bucketed = buckets.map((b) => {
              const items = priced.filter((p) => {
                const m = (p.salePrice - p.costPrice) / p.salePrice * 100;
                return m >= b.min && m < b.max;
              });
              return { ...b, count: items.length, pct: priced.length ? Math.round(items.length / priced.length * 100) : 0 };
            });
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {bucketed.map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: b.color, fontWeight: 500 }}>{b.label}</span>
                      <span style={{ fontSize: 12 }}>{b.count} поз. ({b.pct}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 3, opacity: 0.75, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Top products */}
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Топ позиций</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["revenue", "По потенц. выручке"],
              ["margin",  "По марже %"],
              ["stock",   "По стоим. остатка"],
              ["price",   "По цене"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                style={{
                  padding: "4px 12px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)",
                  fontSize: 12, cursor: "pointer",
                  background: sortBy === key ? "var(--color-background-info)" : "var(--color-background-secondary)",
                  color: sortBy === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                  fontWeight: sortBy === key ? 500 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0
          ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>Нет данных</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sorted.map((p, i) => {
                const barVal = sortBy === "margin"  ? (p.salePrice - p.costPrice) / p.salePrice * 100
                             : sortBy === "stock"   ? (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0)
                             : sortBy === "price"   ? parseFloat(p.salePrice) || 0
                             : (parseFloat(p.salePrice) || 0) * (parseFloat(p.stock) || 1);
                const label = sortBy === "margin" ? `${Math.round(barVal)}%`
                            : sortBy === "stock"  ? fmtK(barVal) + " (себ.)"
                            : fmtK(barVal);
                const [avatarBg, avatarColor] = avatarStyle(p.name);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <TypeBadge typeId={p.type} small />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#185FA5", flexShrink: 0, marginLeft: 8 }}>{label}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--color-background-secondary)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(barVal / maxSorted) * 100}%`, background: "#3b62d6", borderRadius: 2, opacity: 0.6 }} />
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
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const EMPTY_FILTERS = {
  type: "all", category: "", isActive: "all",
  priceFrom: "", priceTo: "", marginFrom: "", marginTo: "",
  hasLowStock: false, hasNoStock: false,
};

function FilterModal({ filters, categories, onApply, onClose }) {
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

  const allCats = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)", width: 480, maxWidth: "95vw",
        maxHeight: "92vh", overflowY: "auto", padding: "24px 28px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 500 }}>Фильтр</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {/* Type */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Тип</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "all", label: "Все" }, ...ITEM_TYPES].map((t) => (
              <button key={t.id} onClick={() => set("type", t.id)}
                style={{
                  flex: 1, padding: "7px", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
                  fontSize: 13, fontWeight: f.type === t.id ? 500 : 400,
                  background: f.type === t.id ? (TYPE_MAP[t.id]?.bg || "var(--color-background-info)") : "var(--color-background-secondary)",
                  color: f.type === t.id ? (TYPE_MAP[t.id]?.color || "var(--color-text-info)") : "var(--color-text-secondary)",
                }}>
                {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Статус</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all", "Все"], ["active", "Активные"], ["archive", "Архив"]].map(([key, label]) => (
              <button key={key} onClick={() => set("isActive", key)}
                style={{
                  flex: 1, padding: "7px", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
                  fontSize: 13, fontWeight: f.isActive === key ? 500 : 400,
                  background: f.isActive === key ? "var(--color-background-info)" : "var(--color-background-secondary)",
                  color: f.isActive === key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Категория</div>
          <Dropdown options={allCats} value={f.category} onChange={(v) => set("category", v)} placeholder="Все категории" zIndex={600} />
        </div>

        {/* Price range */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Цена продажи</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="От" value={f.priceFrom} onChange={(e) => set("priceFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="number" placeholder="До" value={f.priceTo} onChange={(e) => set("priceTo", e.target.value)} style={inp} />
          </div>
        </div>

        {/* Margin range */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Маржа % (от — до)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="От" value={f.marginFrom} onChange={(e) => set("marginFrom", e.target.value)} style={inp} />
            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <input type="number" placeholder="До" value={f.marginTo} onChange={(e) => set("marginTo", e.target.value)} style={inp} />
          </div>
        </div>

        {/* Stock flags */}
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["hasLowStock", "Только с малым остатком (≤ мин.)"],
            ["hasNoStock",  "Только без остатка (= 0)"],
          ].map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id={key} checked={f[key]} onChange={(e) => set(key, e.target.checked)}
                style={{ cursor: "pointer", width: 16, height: 16 }} />
              <label htmlFor={key} style={{ fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>{label}</label>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onApply(f)} style={{ padding: "10px 24px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Применить</button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Закрыть</button>
          <button onClick={() => onApply({ ...EMPTY_FILTERS })} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Очистить</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK PRICE EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function BulkPriceModal({ products, selectedIds, onSave, onClose }) {
  const [mode, setMode]   = useState("pct");   // pct | abs
  const [field, setField] = useState("sale");  // sale | cost
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const v = parseFloat(value);
    if (!v) return [];
    return products
      .filter((p) => selectedIds.has(p.id))
      .map((p) => {
        const orig = field === "sale" ? parseFloat(p.salePrice) || 0 : parseFloat(p.costPrice) || 0;
        const next = mode === "pct" ? orig * (1 + v / 100) : orig + v;
        return { ...p, orig, next: Math.max(0, next) };
      });
  }, [products, selectedIds, mode, field, value]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(preview, field); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 560, maxWidth: "97vw", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Массовое изменение цен ({selectedIds.size} поз.)</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Field */}
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Изменить</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["sale", "Цену продажи"], ["cost", "Себестоимость"]].map(([key, label]) => (
                <button key={key} onClick={() => setField(key)}
                  style={{ flex: 1, padding: "8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: field === key ? 500 : 400, background: field === key ? "var(--color-background-info)" : "var(--color-background-secondary)", color: field === key ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode + value */}
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Способ</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setMode("pct")}
                style={{ padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: mode === "pct" ? 500 : 400, background: mode === "pct" ? "var(--color-background-info)" : "var(--color-background-secondary)", color: mode === "pct" ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>На %</button>
              <button onClick={() => setMode("abs")}
                style={{ padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: mode === "abs" ? 500 : 400, background: mode === "abs" ? "var(--color-background-info)" : "var(--color-background-secondary)", color: mode === "abs" ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>На сумму</button>
              <input
                type="number" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={mode === "pct" ? "напр. 10 или -5" : "напр. 500 или -100"}
                style={{ flex: 1, padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-sans)" }}
              />
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)", flexShrink: 0 }}>{mode === "pct" ? "%" : "₽"}</span>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)", fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "grid", gridTemplateColumns: "1fr 80px 80px 60px" }}>
                <div>Наименование</div><div style={{ textAlign: "right" }}>Было</div><div style={{ textAlign: "right" }}>Станет</div><div style={{ textAlign: "right" }}>Δ</div>
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {preview.map((p) => {
                  const delta = p.next - p.orig;
                  return (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 60px", padding: "8px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 13, alignItems: "center" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <span style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>{fmt(p.orig)}</span>
                      <span style={{ textAlign: "right", fontWeight: 600, color: "#185FA5" }}>{fmt(p.next)}</span>
                      <span style={{ textAlign: "right", fontSize: 11, color: delta >= 0 ? "#3B6D11" : "#A32D2D", fontWeight: 600 }}>
                        {delta >= 0 ? "+" : ""}{mode === "pct" ? `${parseFloat(value)}%` : fmt(delta)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !preview.length}
            style={{ flex: 1, padding: "10px", background: (!preview.length || saving) ? "#8ea4ea" : "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: (!preview.length || saving) ? "not-allowed" : "pointer", opacity: (!preview.length || saving) ? 0.75 : 1 }}>
            {saving ? "Сохранение…" : `Применить к ${preview.length} позициям`}
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW MODES
// ═══════════════════════════════════════════════════════════════════════════════
const PROD_GRID = "28px 28px 120px 1fr 90px 80px 90px 90px 72px 70px 28px";
const TH = { padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProductsPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products,     setProducts]     = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [localError,   setLocalError]   = useState("");

  const [activeTab,     setActiveTab]     = useState("catalog");   // catalog | categories | analytics
  const [viewMode,      setViewMode]      = useState("table");     // table | grid
  const [prodModal,     setProdModal]     = useState(null);        // null | { product }
  const [showFilter,    setShowFilter]    = useState(false);
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [filters,       setFilters]       = useState({ ...EMPTY_FILTERS });
  const [search,        setSearch]        = useState("");
  const [sortCol,       setSortCol]       = useState("name");      // name | salePrice | costPrice | margin | stock | category
  const [sortDir,       setSortDir]       = useState("asc");
  const [selected,      setSelected]      = useState(new Set());

  // ── Firestore: products ────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingProds(true);
    const unsub = onSnapshot(userCol("products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, _docId: d.id, ...d.data() })));
      setLoadingProds(false);
    }, (e) => { setLocalError("Ошибка загрузки: " + e.message); setLoadingProds(false); });
    return () => unsub();
  }, []);

  // ── Hotkey N ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !prodModal && !showFilter && !showBulkPrice) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        setProdModal({ product: null });
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [prodModal, showFilter, showBulkPrice]);

  // ── Categories (derived from products) ────────────────────────────────────
  const categories = useMemo(() =>
    [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filters.type !== "all" && p.type !== filters.type) return false;
      if (filters.isActive === "active"  && p.isActive === false) return false;
      if (filters.isActive === "archive" && p.isActive !== false) return false;
      if (filters.category && (p.category || "Без категории") !== filters.category) return false;
      if (filters.priceFrom && (parseFloat(p.salePrice) || 0) < parseFloat(filters.priceFrom)) return false;
      if (filters.priceTo   && (parseFloat(p.salePrice) || 0) > parseFloat(filters.priceTo)) return false;
      if (filters.marginFrom || filters.marginTo) {
        const s = parseFloat(p.salePrice) || 0;
        if (s === 0) return false;
        const m = (s - (parseFloat(p.costPrice) || 0)) / s * 100;
        if (filters.marginFrom && m < parseFloat(filters.marginFrom)) return false;
        if (filters.marginTo   && m > parseFloat(filters.marginTo))   return false;
      }
      if (filters.hasNoStock  && p.type === "product" && (parseFloat(p.stock) || 0) !== 0) return false;
      if (filters.hasLowStock && p.type === "product") {
        const s = parseFloat(p.stock) || 0;
        const m = parseFloat(p.minStock) || 0;
        if (!(m > 0 && s <= m)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const match = [p.name, p.sku, p.barcode, p.category, p.description, p.notes]
          .some((f) => f?.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    // Sort
    list.sort((a, b) => {
      let va, vb;
      if (sortCol === "salePrice")  { va = parseFloat(a.salePrice) || 0;  vb = parseFloat(b.salePrice) || 0; }
      else if (sortCol === "costPrice") { va = parseFloat(a.costPrice) || 0; vb = parseFloat(b.costPrice) || 0; }
      else if (sortCol === "margin") {
        const sa = parseFloat(a.salePrice) || 0; const sb = parseFloat(b.salePrice) || 0;
        va = sa > 0 ? (sa - (parseFloat(a.costPrice) || 0)) / sa : -Infinity;
        vb = sb > 0 ? (sb - (parseFloat(b.costPrice) || 0)) / sb : -Infinity;
      }
      else if (sortCol === "stock")    { va = parseFloat(a.stock) || 0;    vb = parseFloat(b.stock) || 0; }
      else if (sortCol === "category") { va = a.category || ""; vb = b.category || ""; }
      else { va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); }

      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [products, filters, search, sortCol, sortDir]);

  const hasFilters = Object.entries(filters).some(([k, v]) =>
    k === "type" ? v !== "all" : k === "isActive" ? v !== "all" : k === "hasLowStock" || k === "hasNoStock" ? v : Boolean(v)
  );

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const active   = products.filter((p) => p.isActive !== false);
    const goods    = active.filter((p) => p.type === "product");
    const services = active.filter((p) => p.type === "service");
    const stockVal = goods.reduce((s, p) => s + (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0), 0);
    const lowStock = goods.filter((p) => { const s = parseFloat(p.stock) || 0; const m = parseFloat(p.minStock) || 0; return m > 0 && s <= m; }).length;
    const margins  = active.filter((p) => parseFloat(p.salePrice) > 0).map((p) => (p.salePrice - p.costPrice) / p.salePrice * 100);
    const avgMargin = margins.length ? margins.reduce((s, v) => s + v, 0) / margins.length : 0;
    return { total: active.length, goods: goods.length, services: services.length, stockVal, lowStock, avgMargin };
  }, [products]);

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const allFilteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const toggleAll      = () => allSelected ? setSelected(new Set()) : setSelected(new Set(allFilteredIds));
  const toggleOne      = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const SortArrow = ({ col }) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    try {
      const data = {
        name:        form.name?.trim()         || "",
        type:        form.type                 || "product",
        sku:         form.sku?.trim()          || "",
        barcode:     form.barcode?.trim()      || "",
        category:    form.category             || "Без категории",
        unit:        form.unit                 || "шт",
        salePrice:   parseFloat(form.salePrice) || 0,
        costPrice:   parseFloat(form.costPrice) || 0,
        vat:         parseFloat(form.vat)       || 0,
        stock:       form.type === "product" ? (parseFloat(form.stock) || 0) : null,
        minStock:    form.type === "product" ? (parseFloat(form.minStock) || 0) : null,
        description: form.description?.trim()  || "",
        notes:       form.notes?.trim()        || "",
        isActive:    form.isActive !== false,
        updatedAt:   serverTimestamp(),
      };
      if (form._docId) {
        await updateDoc(userDoc("products", form._docId), data);
      } else {
        await addDoc(userCol("products"), { ...data, createdAt: serverTimestamp() });
      }
    } catch (e) { setLocalError("Ошибка сохранения: " + e.message); }
    setProdModal(null);
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Удалить позицию?")) return;
    try { await deleteDoc(userDoc("products", docId)); }
    catch (e) { setLocalError("Ошибка удаления: " + e.message); }
    setProdModal(null);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Удалить ${selected.size} позиций?`)) return;
    const batch = writeBatch(db);
    for (const id of [...selected]) {
      const p = products.find((x) => x.id === id);
      if (p?._docId) batch.delete(userDoc("products", p._docId));
    }
    try { await batch.commit(); } catch (e) { setLocalError("Ошибка: " + e.message); }
    setSelected(new Set());
  };

  const handleBulkArchive = async (archive) => {
    const batch = writeBatch(db);
    for (const id of [...selected]) {
      const p = products.find((x) => x.id === id);
      if (p?._docId) batch.update(userDoc("products", p._docId), { isActive: !archive, updatedAt: serverTimestamp() });
    }
    try { await batch.commit(); } catch (e) { setLocalError("Ошибка: " + e.message); }
    setSelected(new Set());
  };

  const handleBulkPriceSave = async (preview, field) => {
    const batch = writeBatch(db);
    for (const p of preview) {
      if (!p._docId) continue;
      const upd = field === "sale"
        ? { salePrice: Math.round(p.next * 100) / 100, updatedAt: serverTimestamp() }
        : { costPrice: Math.round(p.next * 100) / 100, updatedAt: serverTimestamp() };
      batch.update(userDoc("products", p._docId), upd);
    }
    try { await batch.commit(); } catch (e) { setLocalError("Ошибка: " + e.message); }
    setShowBulkPrice(false);
    setSelected(new Set());
  };

  const TABS = [["catalog", "Каталог"], ["categories", "Категории"], ["analytics", "Аналитика"]];

  return (
    <div style={{
      fontFamily: "var(--font-sans)", height: "100%", overflow: "hidden",
      background: "var(--color-background-tertiary)", color: "var(--color-text-primary)",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Modals ── */}
      {prodModal && (
        <ProductModal
          product={prodModal.product || null}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setProdModal(null)}
        />
      )}
      {showFilter && (
        <FilterModal
          filters={filters}
          categories={categories}
          onApply={(f) => { setFilters(f); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}
      {showBulkPrice && (
        <BulkPriceModal
          products={products}
          selectedIds={selected}
          onSave={handleBulkPriceSave}
          onClose={() => setShowBulkPrice(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, zIndex: 200, background: "var(--color-background-primary)" }}>
        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Товары и услуги</h1>
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "2px 9px" }}>
                {products.length} позиций
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, артикулу…"
                  style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 220, fontFamily: "var(--font-sans)" }} />
              </div>

              {/* View mode */}
              <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
                {[["table", "☰"], ["grid", "⊞"]].map(([key, icon]) => (
                  <button key={key} onClick={() => setViewMode(key)}
                    style={{ padding: "6px 10px", border: "none", cursor: "pointer", fontSize: 14, background: viewMode === key ? "var(--color-background-info)" : "var(--color-background-secondary)", color: viewMode === key ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
                    {icon}
                  </button>
                ))}
              </div>

              {/* Filter */}
              <button onClick={() => setShowFilter(true)}
                style={{ padding: "6px 12px", border: hasFilters ? "1px solid #3b62d6" : "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: hasFilters ? "var(--color-background-info)" : "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: hasFilters ? "var(--color-text-info)" : "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
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
              <button onClick={() => setProdModal({ product: null })}
                style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#3b62d6", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                + Позиция
              </button>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }} title="N — новая позиция">N</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(([key, label]) => (
              <div key={key} onClick={() => setActiveTab(key)}
                style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer", borderBottom: activeTab === key ? "2px solid #3b62d6" : "2px solid transparent", color: activeTab === key ? "#3b62d6" : "var(--color-text-secondary)", fontWeight: activeTab === key ? 500 : 400, userSelect: "none" }}>
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
            { label: "Активных позиций",  val: kpi.total,     color: "#185FA5",                         plain: true  },
            { label: "Товаров",           val: kpi.goods,     color: "#185FA5",                         plain: true  },
            { label: "Услуг",             val: kpi.services,  color: "#0F6E56",                         plain: true  },
            { label: "Стоим. остатков",   val: kpi.stockVal,  color: "#3B6D11",                         plain: false },
            { label: "Мало на складе",    val: kpi.lowStock,  color: kpi.lowStock > 0 ? "#A32D2D" : "var(--color-text-tertiary)", plain: true },
            { label: "Ср. маржа",         val: `${Math.round(kpi.avgMargin)}%`, color: kpi.avgMargin >= 20 ? "#3B6D11" : kpi.avgMargin >= 0 ? "#854F0B" : "#A32D2D", plain: true },
          ].map(({ label, val, color, plain }) => (
            <div key={label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {plain ? <span style={{ color }}>{val}</span> : <AnimNum value={val} color={color} />}
              </div>
            </div>
          ))}
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div style={{ background: "#3b62d6", padding: "8px 24px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Выбрано: {selected.size}</span>
            <button onClick={() => setShowBulkPrice(true)}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              💲 Изменить цены
            </button>
            <button onClick={() => handleBulkArchive(true)}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              📦 В архив
            </button>
            <button onClick={() => handleBulkArchive(false)}
              style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              ✅ Активировать
            </button>
            <button onClick={handleBulkDelete}
              style={{ padding: "5px 12px", background: "rgba(255,80,80,0.3)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 13, cursor: "pointer" }}>
              Удалить
            </button>
            <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>
              Снять выделение
            </button>
          </div>
        )}

        {/* Table header — Catalog tab, table view */}
        {activeTab === "catalog" && !loadingProds && viewMode === "table" && (
          <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ minWidth: 1000, display: "grid", gridTemplateColumns: PROD_GRID, padding: "0 16px" }}>
              <div style={{ ...TH, display: "flex", alignItems: "center" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
              </div>
              <div style={TH} />
              <div style={{ ...TH, cursor: "pointer" }} onClick={() => handleSort("category")}>Категория<SortArrow col="category" /></div>
              <div style={{ ...TH, cursor: "pointer" }} onClick={() => handleSort("name")}>Наименование<SortArrow col="name" /></div>
              <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("salePrice")}>Цена<SortArrow col="salePrice" /></div>
              <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("margin")}>Маржа<SortArrow col="margin" /></div>
              <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("costPrice")}>Себест.<SortArrow col="costPrice" /></div>
              <div style={{ ...TH, textAlign: "right", cursor: "pointer" }} onClick={() => handleSort("stock")}>Остаток<SortArrow col="stock" /></div>
              <div style={TH}>НДС</div>
              <div style={TH}>Ед.</div>
              <div style={TH} />
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>
        {loadingProds && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
        )}

        {/* ── CATALOG ── */}
        {!loadingProds && activeTab === "catalog" && (
          <div style={{ flex: 1, overflowY: "auto" }}>

            {filtered.length === 0 && (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                  {products.length === 0 ? "Нет позиций. Нажмите + Позиция или клавишу N" : "Ничего не найдено по фильтрам"}
                </div>
                {(hasFilters || search) && (
                  <button onClick={() => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); }}
                    style={{ marginTop: 8, padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>
                    Сбросить фильтры
                  </button>
                )}
              </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === "table" && filtered.length > 0 && (
              <div style={{ minWidth: 1000 }}>
                {filtered.map((p) => {
                  const [avatarBg, avatarColor] = avatarStyle(p.name || "?");
                  const isChecked = selected.has(p.id);
                  const s = parseFloat(p.salePrice) || 0;
                  const c = parseFloat(p.costPrice) || 0;
                  const marginPct = s > 0 ? Math.round((s - c) / s * 100) : null;
                  const marginColor = marginPct === null ? "var(--color-text-tertiary)"
                    : marginPct >= 30 ? "#3B6D11" : marginPct >= 15 ? "#854F0B"
                    : marginPct >= 0 ? "#185FA5" : "#A32D2D";
                  const isArchived = p.isActive === false;

                  return (
                    <div key={p.id}
                      style={{
                        display: "grid", gridTemplateColumns: PROD_GRID, padding: "0 16px",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        background: isChecked ? "var(--color-background-info)" : "transparent",
                        alignItems: "center", position: "relative",
                        opacity: isArchived ? 0.55 : 1,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = "var(--color-background-secondary)"; e.currentTarget.querySelector(".row-act").style.opacity = "1"; e.currentTarget.style.paddingRight = "80px"; }}
                      onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = "transparent"; e.currentTarget.querySelector(".row-act").style.opacity = "0"; e.currentTarget.style.paddingRight = "16px"; }}
                    >
                      {/* Checkbox */}
                      <div style={{ padding: "10px 0", display: "flex", alignItems: "center" }}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleOne(p.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer" }} />
                      </div>

                      {/* Avatar */}
                      <div style={{ padding: "10px 0" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>
                          {initials(p.name)}
                        </div>
                      </div>

                      {/* Category */}
                      <div style={{ padding: "10px 8px", cursor: "pointer" }} onClick={() => setProdModal({ product: p })}>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {p.category || "Без категории"}
                        </span>
                      </div>

                      {/* Name */}
                      <div style={{ padding: "10px 8px", cursor: "pointer", overflow: "hidden" }} onClick={() => setProdModal({ product: p })}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <TypeBadge typeId={p.type} small />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                            {(p.sku || p.barcode) && (
                              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.sku && `Арт: ${p.sku}`}{p.sku && p.barcode && " · "}{p.barcode && `ШК: ${p.barcode}`}
                              </div>
                            )}
                          </div>
                          {isArchived && <span style={{ fontSize: 10, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", borderRadius: 10, padding: "1px 6px", border: "0.5px solid var(--color-border-secondary)", flexShrink: 0 }}>Архив</span>}
                        </div>
                      </div>

                      {/* Sale price */}
                      <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setProdModal({ product: p })}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#185FA5" }}>{fmt(s)}</div>
                        {p.vat > 0 && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>+{p.vat}% НДС</div>}
                      </div>

                      {/* Margin */}
                      <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setProdModal({ product: p })}>
                        {marginPct !== null
                          ? <span style={{ fontSize: 13, fontWeight: 600, color: marginColor }}>{marginPct}%</span>
                          : <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>—</span>}
                      </div>

                      {/* Cost */}
                      <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }} onClick={() => setProdModal({ product: p })}>
                        {c > 0 ? fmt(c) : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                      </div>

                      {/* Stock */}
                      <div style={{ padding: "10px 8px", textAlign: "right", cursor: "pointer" }} onClick={() => setProdModal({ product: p })}>
                        {p.type === "product"
                          ? <StockBadge stock={p.stock} minStock={p.minStock} unit={p.unit} />
                          : <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>услуга</span>}
                      </div>

                      {/* VAT */}
                      <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {p.vat > 0 ? `${p.vat}%` : "—"}
                      </div>

                      {/* Unit */}
                      <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {p.unit || "шт"}
                      </div>

                      {/* Row actions */}
                      <div className="row-act" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                        <button title="Редактировать" onClick={(e) => { e.stopPropagation(); setProdModal({ product: p }); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>✏️</button>
                        <button title="Удалить" onClick={(e) => { e.stopPropagation(); handleDelete(p._docId); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--color-text-danger)" }}>🗑</button>
                      </div>
                    </div>
                  );
                })}

                {/* Footer */}
                {filtered.length > 0 && (
                  <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    <span>Позиций: <strong>{filtered.length}</strong></span>
                    <span>Товаров: <strong>{filtered.filter((p) => p.type === "product").length}</strong></span>
                    <span>Услуг: <strong>{filtered.filter((p) => p.type === "service").length}</strong></span>
                    <span style={{ marginLeft: "auto" }}>
                      Стоим. остатков: <strong style={{ color: "#3B6D11" }}>
                        {fmt(filtered.filter((p) => p.type === "product").reduce((s, p) => s + (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0), 0))}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === "grid" && filtered.length > 0 && (
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {filtered.map((p) => {
                    const [avatarBg, avatarColor] = avatarStyle(p.name || "?");
                    const s = parseFloat(p.salePrice) || 0;
                    const c = parseFloat(p.costPrice) || 0;
                    const marginPct = s > 0 ? Math.round((s - c) / s * 100) : null;
                    const marginColor = marginPct === null ? "var(--color-text-tertiary)"
                      : marginPct >= 30 ? "#3B6D11" : marginPct >= 15 ? "#854F0B"
                      : marginPct >= 0 ? "#185FA5" : "#A32D2D";
                    const isArchived = p.isActive === false;
                    const isChecked  = selected.has(p.id);

                    return (
                      <div key={p.id}
                        onClick={() => setProdModal({ product: p })}
                        style={{
                          background: isChecked ? "var(--color-background-info)" : "var(--color-background-primary)",
                          borderRadius: "var(--border-radius-lg)", border: isChecked ? "1px solid #3b62d6" : "0.5px solid var(--color-border-secondary)",
                          padding: "16px", cursor: "pointer", opacity: isArchived ? 0.6 : 1,
                          transition: "box-shadow 0.15s, border-color 0.15s",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {/* Checkbox top-left */}
                        <div style={{ position: "absolute", top: 10, left: 10 }}
                          onClick={(e) => { e.stopPropagation(); toggleOne(p.id); }}>
                          <input type="checkbox" checked={isChecked} readOnly style={{ cursor: "pointer" }} />
                        </div>

                        {/* Type badge top-right */}
                        <div style={{ position: "absolute", top: 10, right: 10 }}>
                          <TypeBadge typeId={p.type} small />
                        </div>

                        {/* Avatar + name */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 12, paddingTop: 8 }}>
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                            {initials(p.name)}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{p.category || "Без категории"}</div>
                          {p.sku && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Арт: {p.sku}</div>}
                          {isArchived && <span style={{ marginTop: 4, fontSize: 10, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", borderRadius: 10, padding: "1px 8px", border: "0.5px solid var(--color-border-secondary)" }}>Архив</span>}
                        </div>

                        {/* Price row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Цена продажи</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#185FA5" }}>{fmt(s)}</div>
                          </div>
                          {marginPct !== null && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Маржа</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: marginColor }}>{marginPct}%</div>
                            </div>
                          )}
                        </div>

                        {/* Stock */}
                        {p.type === "product" && (
                          <div style={{ paddingTop: 10 }}>
                            <StockBadge stock={p.stock} minStock={p.minStock} unit={p.unit} />
                          </div>
                        )}
                        {p.type === "service" && (
                          <div style={{ paddingTop: 10, fontSize: 12, color: "var(--color-text-tertiary)" }}>
                            {p.unit || "услуга"} · НДС {p.vat || 0}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Grid footer */}
                <div style={{ marginTop: 16, padding: "12px 0", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <span>Показано: <strong>{filtered.length}</strong></span>
                  <span>Товаров: <strong>{filtered.filter((p) => p.type === "product").length}</strong></span>
                  <span>Услуг: <strong>{filtered.filter((p) => p.type === "service").length}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {!loadingProds && activeTab === "categories" && (
          <CategoriesTab products={products} onEditProduct={(p) => setProdModal({ product: p })} />
        )}

        {/* ── ANALYTICS ── */}
        {!loadingProds && activeTab === "analytics" && (
          <AnalyticsTab products={products} />
        )}
      </div>
    </div>
  );
}

/**
 * SettlementsPage.jsx
 *
 * Таблица взаиморасчётов — аналог Excel-таблицы из скриншота.
 *
 * Данные из Firestore:
 *   users/{uid}/legal_entities     → юрлица  (поле: name)
 *   users/{uid}/operation_categories → статьи (поле: name)
 *   users/{uid}/counterparties     → контрагенты (поле: name)
 *   users/{uid}/accruals           → начисления
 *       поля: entityName, counterparty, category, amount, accrualDate (YYYY-MM)
 *   users/{uid}/transactions       → оплаты
 *       поля: counterparty, category, amount, _isoDate / date
 *
 * Начальный остаток — вводится вручную в таблице и сохраняется в
 *   users/{uid}/settlement_balances/{rowKey}  { balance: number }
 *
 * Строки таблицы = уникальные комбинации (entityName × counterparty × category)
 * из начислений. Период (год + набор месяцев) выбирается пользователем.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  collection, doc, getDocs, setDoc, onSnapshot,
  query, orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Firestore helpers ────────────────────────────────────────────────────────
const getCompanyId = () => window.__finlab_user?.companyId || auth.currentUser?.uid;
const userCol = (name) => collection(db, "users", getCompanyId(), name);
const userDoc = (name, id) => doc(db, "users", getCompanyId(), name, id);

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:         "#F0F2F5",
  surface:    "#FFFFFF",
  surfaceAlt: "#F7F8FA",
  border:     "#E2E6EC",
  borderMid:  "#CDD3DC",

  ink:        "#111827",
  inkMid:     "#4B5563",
  inkLight:   "#6B7280",
  inkFaint:   "#9CA3AF",

  blue:       "#2563EB",
  blueBg:     "#EFF6FF",
  blueBorder: "#BFDBFE",

  green:      "#059669",
  greenBg:    "#ECFDF5",
  greenBorder:"#A7F3D0",

  red:        "#DC2626",
  redBg:      "#FEF2F2",
  redBorder:  "#FECACA",

  amber:      "#D97706",
  amberBg:    "#FFFBEB",

  purple:     "#7C3AED",
  purpleBg:   "#F5F3FF",

  headerBg:   "#1E293B",
  headerInk:  "#E2E8F0",
  headerFaint:"#94A3B8",

  accentBg:   "#EEF2FF",
  accentInk:  "#4338CA",
};

// ─── Number helpers ───────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n === null || n === undefined || n === "" || isNaN(Number(n))) return "—";
  return Math.abs(Number(n)).toLocaleString("ru-RU");
};
const fmtSigned = (n) => {
  const v = Number(n);
  if (!v) return "—";
  return (v > 0 ? "" : "−") + Math.abs(v).toLocaleString("ru-RU");
};
const numColor = (n) => {
  const v = Number(n);
  if (!v || isNaN(v)) return T.inkFaint;
  return v > 0 ? T.green : T.red;
};

const MONTH_NAMES = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const MONTH_FULL  = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function isoToYM(dateVal) {
  if (!dateVal) return null;
  if (dateVal?.toDate) return dateVal.toDate().toISOString().slice(0, 7);
  return String(dateVal).slice(0, 7);
}

// ─── Period Selector ──────────────────────────────────────────────────────────
function PeriodSelector({ year, months, onYearChange, onMonthsChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleMonth = (m) => {
    onMonthsChange(
      months.includes(m) ? months.filter((x) => x !== m) : [...months, m].sort((a, b) => a - b)
    );
  };

  const selectAll = () => onMonthsChange([1,2,3,4,5,6,7,8,9,10,11,12]);
  const clearAll  = () => onMonthsChange([]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 8,
          border: `1px solid ${open ? T.blue : T.border}`,
          background: open ? T.blueBg : T.surface,
          color: open ? T.blue : T.inkMid,
          cursor: "pointer", fontSize: 13, fontWeight: 500,
          fontFamily: "inherit",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="12" height="11" rx="2"/>
          <path d="M5 1v4M11 1v4M2 7h12"/>
        </svg>
        {year} · {months.length === 12 ? "Весь год" : months.map(m => MONTH_NAMES[m-1]).join(", ")}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3.5l3 3 3-3"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500,
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          padding: 16, width: 320,
        }}>
          {/* Year */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Год</span>
            <div style={{ display: "flex", gap: 4 }}>
              {years.map(y => (
                <button key={y} onClick={() => onYearChange(y)} style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${y === year ? T.blue : T.border}`,
                  background: y === year ? T.blue : T.surface,
                  color: y === year ? "#fff" : T.inkMid,
                  fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>{y}</button>
              ))}
            </div>
          </div>

          {/* Month grid */}
          <div style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Месяцы</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5, marginBottom: 12 }}>
            {MONTH_NAMES.map((name, i) => {
              const m = i + 1;
              const active = months.includes(m);
              return (
                <button key={m} onClick={() => toggleMonth(m)} style={{
                  padding: "6px 0", borderRadius: 6,
                  border: `1px solid ${active ? T.blue : T.border}`,
                  background: active ? T.blue : T.surface,
                  color: active ? "#fff" : T.inkMid,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{name}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={selectAll} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.inkMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Весь год</button>
            <button onClick={clearAll}  style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.inkMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Сбросить</button>
            <button onClick={() => setOpen(false)} style={{ flex: 2, padding: "7px 0", borderRadius: 6, border: "none", background: T.blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Применить</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editable balance cell ────────────────────────────────────────────────────
function BalanceCell({ value, rowKey, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(value !== 0 ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = async () => {
    const v = parseFloat(draft.replace(/\s/g, "")) || 0;
    await onSave(rowKey, v);
    setEditing(false);
  };

  if (editing) return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      style={{
        width: "100%", border: "none", outline: `2px solid ${T.blue}`,
        borderRadius: 4, padding: "2px 6px", fontSize: 12,
        textAlign: "right", background: T.blueBg, color: T.blue,
        fontFamily: "inherit", fontWeight: 600,
      }}
    />
  );

  return (
    <div
      onClick={startEdit}
      title="Нажмите для редактирования"
      style={{
        cursor: "text", textAlign: "right", fontSize: 12,
        color: value ? numColor(value) : T.inkFaint,
        fontWeight: value ? 600 : 400,
        padding: "2px 6px", borderRadius: 4,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = T.blueBg}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {value ? fmtSigned(value) : <span style={{ opacity: 0.4 }}>0</span>}
    </div>
  );
}

// ─── Number display cell ──────────────────────────────────────────────────────
function NumCell({ value, highlight }) {
  if (!value || value === 0) return (
    <div style={{ textAlign: "right", fontSize: 12, color: T.inkFaint, padding: "2px 6px" }}>—</div>
  );
  return (
    <div style={{
      textAlign: "right", fontSize: 12, fontWeight: 600, padding: "2px 6px",
      color: numColor(value),
      background: highlight ? (value > 0 ? T.greenBg : T.redBg) : "transparent",
      borderRadius: 4,
    }}>
      {fmtSigned(value)}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SettlementsPage() {
  const uid = auth.currentUser?.uid;

  // ── Data from Firestore ───────────────────────────────────────────────────
  const [accruals,   setAccruals]   = useState([]);
  const [txns,       setTxns]       = useState([]);
  const [balances,   setBalances]   = useState({}); // rowKey → number
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // ── Period controls ───────────────────────────────────────────────────────
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  const [year,   setYear]   = useState(curYear);
  const [months, setMonths] = useState(
    Array.from({ length: curMonth }, (_, i) => i + 1)
  );

  // ── Filter / search ───────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterEntity, setFilterEntity] = useState("all");

  // ── Load Firestore data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    let done = 0;
    const finish = () => { done++; if (done === 3) setLoading(false); };

    // accruals
    const unsubA = onSnapshot(userCol("accruals"), snap => {
      setAccruals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      finish();
    }, e => { setError(e.message); finish(); });

    // transactions
    const unsubT = onSnapshot(userCol("transactions"), snap => {
      setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      finish();
    }, e => { setError(e.message); finish(); });

    // settlement_balances
    const unsubB = onSnapshot(userCol("settlement_balances"), snap => {
      const obj = {};
      snap.docs.forEach(d => { obj[d.id] = d.data().balance || 0; });
      setBalances(obj);
      finish();
    }, e => { setError(e.message); finish(); });

    return () => { unsubA(); unsubT(); unsubB(); };
  }, [uid]);

  // ── Save balance ──────────────────────────────────────────────────────────
  const saveBalance = useCallback(async (rowKey, value) => {
    setBalances(prev => ({ ...prev, [rowKey]: value }));
    await setDoc(userDoc("settlement_balances", rowKey), { balance: value });
  }, []);

  // ── Build rows ────────────────────────────────────────────────────────────
  const { rows, entities } = useMemo(() => {
    const rowMap = {};

    accruals.forEach(a => {
      const key = `${a.entityName || "—"}||${a.counterparty || "—"}||${a.category || "—"}`;
      if (!rowMap[key]) {
        rowMap[key] = {
          key,
          entity:       a.entityName   || "—",
          counterparty: a.counterparty || "—",
          category:     a.category     || "—",
          monthlyAccruals: {},  // "YYYY-MM" → amount
          monthlyPayments: {},  // "YYYY-MM" → amount
        };
      }
      const ym = isoToYM(a.accrualDate);
      if (ym) {
        rowMap[key].monthlyAccruals[ym] = (rowMap[key].monthlyAccruals[ym] || 0) + (a.amount || 0);
      }
    });

    txns.forEach(t => {
      const key = `${t.entityName || "—"}||${t.counterparty || "—"}||${t.category || "—"}`;
      if (rowMap[key]) {
        const ym = isoToYM(t.date || t._isoDate);
        if (ym) {
          rowMap[key].monthlyPayments[ym] = (rowMap[key].monthlyPayments[ym] || 0) + Math.abs(t.amount || 0);
        }
      }
    });

    const allRows = Object.values(rowMap);
    const allEntities = [...new Set(allRows.map(r => r.entity))].sort();
    return { rows: allRows, entities: allEntities };
  }, [accruals, txns]);

  // ── Filter rows ───────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterEntity !== "all" && r.entity !== filterEntity) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.counterparty.toLowerCase().includes(q) ||
               r.category.toLowerCase().includes(q) ||
               r.entity.toLowerCase().includes(q);
      }
      return true;
    });
  }, [rows, filterEntity, search]);

  // ── Selected months in year ───────────────────────────────────────────────
  const activeYMs = useMemo(() =>
    months.map(m => `${year}-${String(m).padStart(2, "0")}`),
    [year, months]
  );

  // ── Compute row totals ────────────────────────────────────────────────────
  const computeRow = (row) => {
    const balanceStart = balances[row.key] || 0;

    const totalAccrual = activeYMs.reduce((s, ym) => s + (row.monthlyAccruals[ym] || 0), 0);
    const totalPayment = activeYMs.reduce((s, ym) => s + (row.monthlyPayments[ym] || 0), 0);

    // Остаток на текущий день
    const balanceNow = balanceStart + totalAccrual - totalPayment;

    // Monthly running balance
    const monthlyBalance = {};
    let running = balanceStart;
    activeYMs.forEach(ym => {
      running += (row.monthlyAccruals[ym] || 0);
      running -= (row.monthlyPayments[ym] || 0);
      monthlyBalance[ym] = running;
    });

    return { balanceStart, totalAccrual, totalPayment, balanceNow, monthlyBalance };
  };

  // ── Column widths ─────────────────────────────────────────────────────────
  const fixedCols = 5; // №, Статья, Юрлицо, Контрагент, Остаток нач.
  const perMonthCols = months.length * 2; // начисл + оплата × кол-во месяцев
  const totalCols = fixedCols + perMonthCols + 3; // +3: Σначисл, Σоплата, ОстатокСейчас

  // ── Grand totals ──────────────────────────────────────────────────────────
  const grandTotals = useMemo(() => {
    let totalBalanceStart = 0, totalAccrual = 0, totalPayment = 0, totalBalanceNow = 0;
    const monthlyA = {}, monthlyP = {};

    filteredRows.forEach(row => {
      const c = computeRow(row);
      totalBalanceStart += c.balanceStart;
      totalAccrual      += c.totalAccrual;
      totalPayment      += c.totalPayment;
      totalBalanceNow   += c.balanceNow;
      activeYMs.forEach(ym => {
        monthlyA[ym] = (monthlyA[ym] || 0) + (row.monthlyAccruals[ym] || 0);
        monthlyP[ym] = (monthlyP[ym] || 0) + (row.monthlyPayments[ym] || 0);
      });
    });

    return { totalBalanceStart, totalAccrual, totalPayment, totalBalanceNow, monthlyA, monthlyP };
  }, [filteredRows, balances, activeYMs]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const thStyle = (align = "right") => ({
    padding: "10px 8px",
    fontSize: 10, fontWeight: 600,
    color: T.headerFaint,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: align,
    background: T.headerBg,
    borderRight: `1px solid rgba(255,255,255,0.06)`,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 10,
  });

  const tdStyle = (align = "right", isEven = false) => ({
    padding: "7px 8px",
    borderBottom: `1px solid ${T.border}`,
    borderRight: `1px solid ${T.border}`,
    background: isEven ? T.surfaceAlt : T.surface,
    verticalAlign: "middle",
    textAlign: align,
  });

  const footTd = (align = "right") => ({
    padding: "9px 8px",
    fontWeight: 700,
    fontSize: 12,
    color: T.ink,
    background: "#1E293B",
    borderTop: `2px solid ${T.borderMid}`,
    textAlign: align,
  });

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: T.bg, flexDirection: "column", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `3px solid ${T.blueBorder}`,
        borderTopColor: T.blue,
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 13, color: T.inkFaint }}>Загрузка данных…</div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: "100vh",
      background: T.bg,
      color: T.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.borderMid}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.inkFaint}; }
        .row-hover:hover td { background: ${T.accentBg} !important; }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
            Взаиморасчёты
          </h1>
          <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 2 }}>
            {filteredRows.length} строк · {months.length} мес. · {year}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Поиск */}
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.inkFaint }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск…"
              style={{
                paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                border: `1px solid ${T.border}`, borderRadius: 8,
                background: T.surfaceAlt, color: T.ink, fontSize: 13,
                outline: "none", width: 180, fontFamily: "inherit",
              }}
            />
          </div>

          {/* Entity filter */}
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            style={{
              padding: "7px 12px", border: `1px solid ${T.border}`,
              borderRadius: 8, background: T.surfaceAlt, color: T.inkMid,
              fontSize: 13, cursor: "pointer", fontFamily: "inherit", outline: "none",
            }}
          >
            <option value="all">Все юрлица</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Period selector */}
          <PeriodSelector
            year={year}
            months={months}
            onYearChange={setYear}
            onMonthsChange={setMonths}
          />
        </div>
      </div>

      {error && (
        <div style={{ margin: "12px 24px", padding: "10px 16px", background: T.redBg, color: T.red, borderRadius: 8, fontSize: 13, border: `1px solid ${T.redBorder}`, display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.red }}>✕</button>
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12, padding: "16px 24px 0",
      }}>
        {[
          { label: "Начальный остаток", value: grandTotals.totalBalanceStart, color: T.inkMid },
          { label: "Всего начислено",   value: grandTotals.totalAccrual,      color: T.blue },
          { label: "Всего оплачено",    value: grandTotals.totalPayment,      color: T.green },
          { label: "Текущий остаток",   value: grandTotals.totalBalanceNow,   color: grandTotals.totalBalanceNow >= 0 ? T.green : T.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: T.surface, borderRadius: 10,
            border: `1px solid ${T.border}`,
            padding: "14px 18px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: T.inkFaint, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
              {fmt(Math.abs(value))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 24px 40px", overflowX: "auto", WebkitOverflowScrolling:"touch"}}>
        <div style={{
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          minWidth: totalCols*120,
        }}>
          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "auto" }}>
            <thead>
              {/* ── Row 1: group headers ───────────────────────────────── */}
              <tr>
                <th colSpan={5} style={{ ...thStyle("left"), borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
                  <span style={{ color: T.headerInk }}>Контрагент</span>
                </th>
                {/* Per-month headers */}
                {months.map(m => (
                  <th key={m} colSpan={2} style={{
                    ...thStyle("center"),
                    borderBottom: `1px solid rgba(255,255,255,0.08)`,
                    background: m % 2 === 0 ? "#263347" : T.headerBg,
                  }}>
                    <span style={{ color: T.headerInk }}>{MONTH_FULL[m - 1]}</span>
                  </th>
                ))}
                <th colSpan={3} style={{ ...thStyle("center"), borderBottom: `1px solid rgba(255,255,255,0.08)`, background: "#131e2e" }}>
                  <span style={{ color: T.headerInk }}>Итого {year}</span>
                </th>
              </tr>

              {/* ── Row 2: column headers ──────────────────────────────── */}
              <tr>
                <th style={{ ...thStyle("center"), width: 36, top: 41 }}>№</th>
                <th style={{ ...thStyle("left"), minWidth: 100, top: 41 }}>Статья</th>
                <th style={{ ...thStyle("left"), minWidth: 90, top: 41 }}>Юрлицо</th>
                <th style={{ ...thStyle("left"), minWidth: 140, top: 41 }}>Контрагент</th>
                <th style={{ ...thStyle("right"), minWidth: 110, top: 41 }}>
                  <span title="Начальный остаток" style={{ cursor: "help" }}>Ост. нач. ✎</span>
                </th>

                {months.map(m => {
                  const bg = m % 2 === 0 ? "#263347" : T.headerBg;
                  return [
                    <th key={`${m}-a`} style={{ ...thStyle("right"), minWidth: 100, top: 41, background: bg }}>Нач.</th>,
                    <th key={`${m}-p`} style={{ ...thStyle("right"), minWidth: 100, top: 41, background: bg }}>Опл.</th>,
                  ];
                })}

                <th style={{ ...thStyle("right"), minWidth: 110, top: 41, background: "#131e2e" }}>Σ Нач.</th>
                <th style={{ ...thStyle("right"), minWidth: 110, top: 41, background: "#131e2e" }}>Σ Опл.</th>
                <th style={{ ...thStyle("right"), minWidth: 110, top: 41, background: "#131e2e" }}>Ост. сейчас</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={100} style={{ padding: "60px 24px", textAlign: "center", color: T.inkFaint, fontSize: 14, background: T.surface }}>
                    {rows.length === 0
                      ? "Нет начислений. Добавьте записи в разделе «Начисления»."
                      : "Нет строк по выбранным фильтрам."}
                  </td>
                </tr>
              )}

              {filteredRows.map((row, idx) => {
                const { balanceStart, totalAccrual, totalPayment, balanceNow } = computeRow(row);
                const isEven = idx % 2 === 0;

                return (
                  <tr key={row.key} className="row-hover" style={{ transition: "background 0.1s" }}>
                    {/* № */}
                    <td style={{ ...tdStyle("center", isEven), width: 36 }}>
                      <span style={{ fontSize: 11, color: T.inkFaint, fontFamily: "'DM Mono', monospace" }}>{idx + 1}</span>
                    </td>

                    {/* Статья */}
                    <td style={{ ...tdStyle("left", isEven), maxWidth: 130 }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px", borderRadius: 4,
                        fontSize: 11, fontWeight: 500,
                        background: T.accentBg, color: T.accentInk,
                        maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={row.category}>
                        {row.category}
                      </span>
                    </td>

                    {/* Юрлицо */}
                    <td style={{ ...tdStyle("left", isEven) }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.inkMid, whiteSpace: "nowrap" }}>
                        {row.entity}
                      </span>
                    </td>

                    {/* Контрагент */}
                    <td style={{ ...tdStyle("left", isEven), maxWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          background: T.accentBg, color: T.accentInk,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700,
                        }}>
                          {row.counterparty.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.counterparty}>
                          {row.counterparty}
                        </span>
                      </div>
                    </td>

                    {/* Начальный остаток (редактируемый) */}
                    <td style={{ ...tdStyle("right", isEven), minWidth: 110 }}>
                      <BalanceCell value={balanceStart} rowKey={row.key} onSave={saveBalance} />
                    </td>

                    {/* Per-month columns */}
                    {months.map(m => {
                      const ym = `${year}-${String(m).padStart(2, "0")}`;
                      const acc = row.monthlyAccruals[ym] || 0;
                      const pay = row.monthlyPayments[ym] || 0;
                      const bg  = m % 2 === 0 ? "#F4F6F9" : (isEven ? T.surfaceAlt : T.surface);
                      return [
                        <td key={`${row.key}-${m}-a`} style={{ ...tdStyle("right", isEven), background: bg, minWidth: 100 }}>
                          <NumCell value={acc} />
                        </td>,
                        <td key={`${row.key}-${m}-p`} style={{ ...tdStyle("right", isEven), background: bg, minWidth: 100 }}>
                          <NumCell value={pay} />
                        </td>,
                      ];
                    })}

                    {/* Σ Начислено */}
                    <td style={{ ...tdStyle("right", isEven), background: isEven ? "#EBF0FA" : "#F0F4FC", minWidth: 110 }}>
                      <NumCell value={totalAccrual} highlight />
                    </td>

                    {/* Σ Оплачено */}
                    <td style={{ ...tdStyle("right", isEven), background: isEven ? "#EBF0FA" : "#F0F4FC", minWidth: 110 }}>
                      <NumCell value={totalPayment} highlight />
                    </td>

                    {/* Остаток сейчас */}
                    <td style={{ ...tdStyle("right", isEven), background: isEven ? "#E8F5EE" : "#EEF8F3", minWidth: 110 }}>
                      <div style={{
                        textAlign: "right", fontSize: 12, fontWeight: 700,
                        padding: "2px 6px", borderRadius: 4,
                        color: balanceNow > 0 ? T.green : balanceNow < 0 ? T.red : T.inkFaint,
                      }}>
                        {balanceNow !== 0 ? fmtSigned(balanceNow) : <span style={{ opacity: 0.4 }}>0</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── Footer totals ────────────────────────────────────────────── */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...footTd("center"), color: T.headerFaint, fontSize: 10 }}></td>
                  <td colSpan={3} style={{ ...footTd("left"), color: T.headerFaint }}>
                    ИТОГО ({filteredRows.length} строк)
                  </td>

                  {/* Σ балансов начало */}
                  <td style={{ ...footTd("right"), color: grandTotals.totalBalanceStart > 0 ? "#86EFAC" : "#FCA5A5" }}>
                    {fmtSigned(grandTotals.totalBalanceStart)}
                  </td>

                  {months.map(m => {
                    const ym = `${year}-${String(m).padStart(2, "0")}`;
                    const a = grandTotals.monthlyA[ym] || 0;
                    const p = grandTotals.monthlyP[ym] || 0;
                    return [
                      <td key={`ft-${m}-a`} style={{ ...footTd("right"), color: a ? "#93C5FD" : T.headerFaint }}>{a ? fmt(a) : "—"}</td>,
                      <td key={`ft-${m}-p`} style={{ ...footTd("right"), color: p ? "#86EFAC" : T.headerFaint }}>{p ? fmt(p) : "—"}</td>,
                    ];
                  })}

                  <td style={{ ...footTd("right"), color: "#93C5FD" }}>{fmt(grandTotals.totalAccrual)}</td>
                  <td style={{ ...footTd("right"), color: "#86EFAC" }}>{fmt(grandTotals.totalPayment)}</td>
                  <td style={{ ...footTd("right"), color: grandTotals.totalBalanceNow >= 0 ? "#86EFAC" : "#FCA5A5", fontSize: 13 }}>
                    {fmtSigned(grandTotals.totalBalanceNow)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 11, color: T.inkFaint }}>
          <span>✎ — нажмите на ячейку остатка чтобы ввести вручную</span>
          <span style={{ color: T.green }}>Зелёный</span><span>= положительный</span>
          <span style={{ color: T.red   }}>Красный</span><span>= отрицательный</span>
        </div>
      </div>
    </div>
  );
}

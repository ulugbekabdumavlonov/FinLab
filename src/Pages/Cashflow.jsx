import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCurrency } from "./useCurrency";

// ─── Firestore ────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtSigned = (n, symbol) =>
  (n >= 0 ? "+" : "−") + " " + fmt(n) + " " + symbol;

function normalizeDate(raw) {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// ─── getSection теперь использует динамический map из Firestore ───────────────
function normalize(str) {
  return (str || "").trim().toLowerCase();
}

const getSection = (tx, map) => {
  const cat = normalize(tx.Category || tx.category || "");
  const type = map[cat];

  if (type === "op" || type === "inv" || type === "fin") {
    return type;
  }

  console.warn("❌ NO MATCH CATEGORY:", tx.Category || tx.category);

  // ⚠️ fallback ТОЛЬКО безопасный
  return "fin"; // или "unknown"
};

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:        "#111827",
  inkMid:     "#374151",
  inkLight:   "#9ca3af",
  inkFaint:   "#d1d5db",
  surface:    "#ffffff",
  surfaceAlt: "#f9fafb",
  border:     "#e5e7eb",
  borderMid:  "#d1d5db",
  pos:        "#15803d",
  posBg:      "#f0fdf4",
  neg:        "#b91c1c",
  negBg:      "#fef2f2",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
};

// ─── Pill ─────────────────────────────────────────────────────────────────────
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, pos }) {
  return (
    <div style={{ background: C.surface, padding: "20px 24px", borderRight: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, color: C.inkLight, fontWeight: 400, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 400, color: pos ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Table header ─────────────────────────────────────────────────────────────
function TableHeader() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 160px 130px 110px", padding: "8px 20px", borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
      {["Дата","Контрагент / Детали","Статья","Проект","Сумма"].map((h, i) => (
        <div key={h} style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight, textAlign: i === 4 ? "right" : "left" }}>
          {h}
        </div>
      ))}
    </div>
  );
}

// ─── Entry row ────────────────────────────────────────────────────────────────
function EntryRow({ tx }) {
  const sum   = Number(tx.Sum ?? tx.amount ?? 0);
  const isPos = sum >= 0;
  const date  = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
  const txCurrency = tx._accountCurrency || "UZS";

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "96px 1fr 160px 130px 110px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 14, cursor: "default", transition: "background 0.1s" }}
      onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ color: C.inkLight, fontSize: 13 }}>{date}</div>
      <div style={{ overflow: "hidden" }}>
        <div style={{ fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.Counterparty || tx.counterparty || "—"}
        </div>
        <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.Details || tx.description || ""}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: C.surfaceAlt, color: C.inkMid, border: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
          {tx.Category || tx.category || "—"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: C.inkMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {tx.Project || tx.direction || "—"}
      </div>
      <div style={{ textAlign: "right", fontWeight: 500, color: isPos ? C.pos : C.neg, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        {isPos ? "+" : "−"}{fmt(sum)} {txCurrency}
      </div>
    </div>
  );
}

// ─── Category breakdown row ───────────────────────────────────────────────────
function CategoryBar({ name, inflow, outflow, maxAbs, symbol }) {
  const net   = inflow - outflow;
  const barW  = maxAbs > 0 ? Math.round((Math.abs(net) / maxAbs) * 100) : 0;
  const isPos = net >= 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 120px 120px 120px", alignItems: "center", gap: 12, padding: "7px 20px", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 13, color: C.inkMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      <div style={{ height: 4, background: C.surfaceAlt, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: barW + "%", height: "100%", background: isPos ? C.pos : C.neg, borderRadius: 2, opacity: 0.5, transition: "width 0.4s" }} />
      </div>
      <div style={{ textAlign: "right", fontSize: 13, color: C.pos, fontVariantNumeric: "tabular-nums" }}>
        {inflow > 0 ? "+" + fmt(inflow) + " " + symbol : "—"}
      </div>
      <div style={{ textAlign: "right", fontSize: 13, color: C.neg, fontVariantNumeric: "tabular-nums" }}>
        {outflow > 0 ? "−" + fmt(outflow) + " " + symbol : "—"}
      </div>
      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: isPos ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
        {isPos ? "+" : "−"}{fmt(Math.abs(net))} {symbol}
      </div>
    </div>
  );
}

// ─── Section summary ──────────────────────────────────────────────────────────
function SectionSummary({ transactions, symbol }) {
  const inflow  = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) >= 0).reduce((s, t) => s + Number(t._converted ?? t.Sum ?? t.amount ?? 0), 0);
  const outflow = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(Number(t._converted ?? t.Sum ?? t.amount ?? 0)), 0);

  const catMap = {};
  for (const tx of transactions) {
    const cat = tx.Category || tx.category || "Без категории";
    const sum = Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0);
    if (!catMap[cat]) catMap[cat] = { inflow: 0, outflow: 0 };
    if (sum >= 0) catMap[cat].inflow  += sum;
    else          catMap[cat].outflow += Math.abs(sum);
  }
  const cats   = Object.entries(catMap).sort((a, b) => (b[1].inflow + b[1].outflow) - (a[1].inflow + a[1].outflow));
  const maxAbs = Math.max(...cats.map(([, v]) => Math.abs(v.inflow - v.outflow)), 1);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ padding: "14px 24px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 6 }}>Поступления</div>
          <div style={{ fontSize: 18, fontWeight: 400, color: C.pos, fontVariantNumeric: "tabular-nums" }}>+{fmt(inflow)} {symbol}</div>
        </div>
        <div style={{ padding: "14px 24px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 6 }}>Списания</div>
          <div style={{ fontSize: 18, fontWeight: 400, color: outflow > 0 ? C.neg : C.inkLight, fontVariantNumeric: "tabular-nums" }}>
            {outflow > 0 ? "−" + fmt(outflow) + " " + symbol : "—"}
          </div>
        </div>
        <div style={{ padding: "14px 24px" }}>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 6 }}>Сальдо</div>
          <div style={{ fontSize: 18, fontWeight: 400, color: (inflow - outflow) >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
            {(inflow - outflow) >= 0 ? "+" : "−"}{fmt(Math.abs(inflow - outflow))} {symbol}
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 120px 120px 120px", gap: 12, padding: "6px 20px", background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
            {["Статья", "", "Поступления", "Списания", "Нетто"].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight, textAlign: i >= 2 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {cats.map(([name, vals]) => (
            <CategoryBar key={name} name={name} inflow={vals.inflow} outflow={vals.outflow} maxAbs={maxAbs} symbol={symbol} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, total, transactions, symbol }) {
  const [open,     setOpen]     = useState(true);
  const [showRows, setShowRows] = useState(false);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", cursor: "pointer", borderBottom: open ? `1px solid ${C.border}` : "none", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: C.ink }}>
          {title}
          <span style={{ fontWeight: 400, color: C.inkLight, fontSize: 13 }}>({transactions.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: total >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
            {fmtSigned(total, symbol)}
          </span>
          <span style={{ fontSize: 10, color: C.inkFaint, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
        </div>
      </div>

      {open && (
        <>
          <SectionSummary transactions={transactions} symbol={symbol} />
          <div onClick={() => setShowRows(!showRows)} style={{ padding: "9px 20px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", borderTop: `1px solid ${C.border}`, background: C.surfaceAlt }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 500 }}>
              {showRows ? "Скрыть транзакции" : `Показать все транзакции (${transactions.length})`}
            </span>
            <span style={{ fontSize: 9, color: C.accent, display: "inline-block", transition: "transform 0.2s", transform: showRows ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </div>
          {showRows && (
            <>
              <TableHeader />
              {transactions.length === 0
                ? <div style={{ padding: "28px 20px", textAlign: "center", color: C.inkLight, fontSize: 14 }}>Нет транзакций</div>
                : transactions.map((tx, i) => <EntryRow key={tx.id || i} tx={tx} />)
              }
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Waterfall ────────────────────────────────────────────────────────────────
function Waterfall({ op, inv, fin, symbol }) {
  const net    = op + inv + fin;
  const maxVal = Math.max(Math.abs(op), Math.abs(inv), Math.abs(fin), Math.abs(net), 1);
  const pct    = (v) => Math.round((Math.abs(v) / maxVal) * 84);

  const rows = [
    { label: "Операционный",   val: op  },
    { label: "Инвестиционный", val: inv },
    { label: "Финансовый",     val: fin },
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: C.inkLight, fontWeight: 500, marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Структура потоков
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, width: 150, flexShrink: 0, color: C.inkMid }}>{r.label}</div>
          <div style={{ flex: 1, height: 20, background: C.surfaceAlt, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{
              width: pct(r.val) + "%", height: "100%",
              background: r.val >= 0 ? C.posBg : C.negBg,
              borderRight: `2px solid ${r.val >= 0 ? C.pos : C.neg}`,
              borderRadius: "4px 0 0 4px",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
              transition: "width 0.4s",
            }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: r.val >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {fmtSigned(r.val, symbol)}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 0", marginTop: 6, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 14, color: C.inkMid }}>Чистое изменение за период</span>
        <span style={{ fontSize: 18, fontWeight: 500, color: net >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
          {fmtSigned(net, symbol)}
        </span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const [transactions,     setTransactions]     = useState([]);
  const [categoryTypeMap,  setCategoryTypeMap]  = useState({}); // ← новый стейт
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [period,   setPeriod]   = useState("all");
  const [project,  setProject]  = useState("all");
  const [category, setCategory] = useState("all");
  const [account,  setAccount]  = useState("all");

  // ── Хук валюты ──────────────────────────────────────────────────────────────
  const { targetCurrency, convert, symbol, loading: currencyLoading } = useCurrency();

  const applyPeriod = (p) => {
    setPeriod(p);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n) => String(n).padStart(2, "0");
    const lastDay = (yr, mo) => new Date(yr, mo + 1, 0).getDate();
    if (p === "month") { setDateFrom(`${y}-${pad(m+1)}-01`); setDateTo(`${y}-${pad(m+1)}-${lastDay(y,m)}`); }
    if (p === "q1")    { setDateFrom(`${y}-01-01`); setDateTo(`${y}-03-31`); }
    if (p === "q2")    { setDateFrom(`${y}-04-01`); setDateTo(`${y}-06-30`); }
    if (p === "q3")    { setDateFrom(`${y}-07-01`); setDateTo(`${y}-09-30`); }
    if (p === "q4")    { setDateFrom(`${y}-10-01`); setDateTo(`${y}-12-31`); }
    if (p === "year")  { setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); }
    if (p === "all")   { setDateFrom(""); setDateTo(""); }
  };

  useEffect(() => {
    (async () => {
      try {
        // ── Загружаем транзакции, счета и категории параллельно ────────────
        const [txSnap, accSnap, catSnap] = await Promise.all([
          getDocs(userCol("transactions")),
          getDocs(userCol("accounts")),
          getDocs(userCol("operation_categories")), // ← загружаем категории
        ]);

        // Строим map: accountName → currency
        const accountCurrencyMap = {};
        accSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.name) accountCurrencyMap[data.name] = data.currency || "UZS";
        });

        // ── Строим map: categoryName → type ("op" | "inv" | "fin") ────────
        const catTypeMap = {};
        catSnap.docs.forEach((d) => {
          const data = d.data();

          if (data.name && data.type) {
             const key = normalize(data.name);
             catTypeMap[key] = data.type;
          }
        });
        setCategoryTypeMap(catTypeMap);

        const txs = txSnap.docs.map((d) => {
          const data = d.data();
          const accountName     = data.Account || data.walletName || "";
          const accountCurrency = accountCurrencyMap[accountName] || "UZS";
          return {
            ...data,
            id: d.id,
            _isoDate:         normalizeDate(data.Date || data.date || ""),
            _accountCurrency: accountCurrency,
          };
        });

        setTransactions(txs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Добавляем _converted к каждой транзакции ─────────────────────────────
  const transactionsWithConversion = useMemo(() => {
    return transactions.map((tx) => ({
      ...tx,
      _converted: convert(
        Number(tx.Sum ?? tx.amount ?? 0),
        tx._accountCurrency || "UZS"
      ),
    }));
  }, [transactions, convert]);

  const projectNames = useMemo(() =>
    ["all", ...[...new Set(transactionsWithConversion.map((t) => t.Project || t.direction).filter(Boolean))].sort()],
    [transactionsWithConversion]
  );
  const accountNames = useMemo(() =>
    ["all", ...[...new Set(transactionsWithConversion.map((t) => t.Account || t.walletName).filter(Boolean))].sort()],
    [transactionsWithConversion]
  );

  const filtered = useMemo(() => transactionsWithConversion.filter((tx) => {
    if (dateFrom && tx._isoDate && tx._isoDate < dateFrom) return false;
    if (dateTo   && tx._isoDate && tx._isoDate > dateTo)   return false;
    if (project !== "all" && (tx.Project || tx.direction || "") !== project) return false;
    if (account !== "all" && (tx.Account || tx.walletName || "") !== account) return false;
    // ── Фильтр по деятельности теперь использует динамический map ──────
    if (category !== "all" && getSection(tx, categoryTypeMap) !== category) return false;
    return true;
  }), [transactionsWithConversion, dateFrom, dateTo, project, account, category, categoryTypeMap]);

  // ── Итоги считаем по _converted ──────────────────────────────────────────
  const sumArr  = (arr) => arr.reduce((s, t) => s + Number(t._converted ?? 0), 0);
  // ── Секции используют динамический map ───────────────────────────────────
  const opTxs   = filtered.filter((t) => getSection(t, categoryTypeMap) === "op");
  const invTxs  = filtered.filter((t) => getSection(t, categoryTypeMap) === "inv");
  const finTxs  = filtered.filter((t) => getSection(t, categoryTypeMap) === "fin");
  const opTotal  = sumArr(opTxs);
  const invTotal = sumArr(invTxs);
  const finTotal = sumArr(finTxs);
  const netTotal = opTotal + invTotal + finTotal;

  const SECTIONS = [
    { key: "op",  title: "Операционная деятельность",  total: opTotal,  txs: opTxs  },
    { key: "inv", title: "Инвестиционная деятельность", total: invTotal, txs: invTxs },
    { key: "fin", title: "Финансовая деятельность",     total: finTotal, txs: finTxs },
  ];

  const visibleSections = category === "all" ? SECTIONS : SECTIONS.filter((s) => s.key === category);

  const inputStyle = {
    fontFamily: "inherit", fontSize: 12, padding: "5px 9px",
    border: `0.5px solid ${C.borderMid}`, borderRadius: 4,
    background: C.surface, color: C.ink, outline: "none", width: 130,
  };

  const isLoading = loading || currencyLoading;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 1100, padding: "2rem 1rem", color: C.ink, background: C.surfaceAlt, minHeight: "100vh" }}>

      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: C.ink }}>
          Движение денежных средств
        </h1>
        <p>
          < span style={{ marginLeft: -1, padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Итоги в {targetCurrency}
          </span>
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Период</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPeriod(""); }} style={inputStyle} />
              <span style={{ fontSize: 11, color: C.inkLight }}>—</span>
              <input type="date" value={dateTo}   onChange={(e) => { setDateTo(e.target.value); setPeriod(""); }} style={inputStyle} />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setPeriod("all"); }}
                  style={{ fontSize: 12, color: C.inkLight, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Быстро</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["month","Месяц"],["q1","Q1"],["q2","Q2"],["q3","Q3"],["q4","Q4"],["year","Год"]].map(([val, lbl]) => (
                <Pill key={val} label={lbl} active={period === val} onClick={() => applyPeriod(val)} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Деятельность</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["op","Операционная"],["inv","Инвестиционная"],["fin","Финансовая"]].map(([val, lbl]) => (
                <Pill key={val} label={lbl} active={category === val} onClick={() => setCategory(val)} />
              ))}
            </div>
          </div>

          {projectNames.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Проект</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {projectNames.map((p) => (
                  <Pill key={p} label={p === "all" ? "Все" : p} active={project === p} onClick={() => setProject(p)} />
                ))}
              </div>
            </div>
          )}

          {accountNames.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Счёт</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {accountNames.map((a) => (
                  <Pill key={a} label={a === "all" ? "Все" : a} active={account === a} onClick={() => setAccount(a)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: C.border, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        <KpiCard label="Операционный поток"   value={fmtSigned(opTotal, symbol)}  pos={opTotal  >= 0} />
        <KpiCard label="Инвестиционный поток"  value={fmtSigned(invTotal, symbol)} pos={invTotal >= 0} />
        <KpiCard label="Финансовый поток"      value={fmtSigned(finTotal, symbol)} pos={finTotal >= 0} />
        <KpiCard label="Чистый поток"          value={fmtSigned(netTotal, symbol)} pos={netTotal >= 0} />
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: C.negBg, border: `0.5px solid ${C.neg}`, borderRadius: 6, color: C.neg, fontSize: 13, marginBottom: 14 }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.inkLight, fontSize: 13 }}>
          Загрузка данных…
        </div>
      )}

      {!isLoading && visibleSections.map((sec) => (
        <Section key={sec.key} title={sec.title} total={sec.total} transactions={sec.txs} symbol={symbol} />
      ))}

      {!isLoading && <Waterfall op={opTotal} inv={invTotal} fin={finTotal} symbol={symbol} />}
    </div>
  );
}
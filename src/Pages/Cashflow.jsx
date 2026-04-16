import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCurrency } from "./useCurrency";

const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);

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

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

const getSection = (tx, map) => {
  const cat = normalize(tx.Category || tx.category || "");
  const type = map[cat];
  if (type === "op" || type === "inv" || type === "fin") return type;
  return "fin";
};

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

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

function KpiCard({ label, value, pos }) {
  return (
    <div style={{
      background: C.surface,
      padding: "12px 16px",
      borderRight: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 400, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: 16,
        fontWeight: 400,
        color: pos ? C.pos : C.neg,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.5px",
      }}>
        {value}
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "90px 1fr 150px 120px 110px",
      padding: "6px 16px",
      borderBottom: `1px solid ${C.border}`,
      background: C.surfaceAlt,
    }}>
      {["Дата", "Контрагент / Детали", "Статья", "Проект", "Сумма"].map((h, i) => (
        <div key={h} style={{
          fontSize: 10, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: C.inkLight, textAlign: i === 4 ? "right" : "left",
        }}>
          {h}
        </div>
      ))}
    </div>
  );
}

function EntryRowDesktop({ tx }) {
  const sum   = Number(tx.Sum ?? tx.amount ?? 0);
  const isPos = sum >= 0;
  const date  = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
  const txCurrency = tx._accountCurrency || "UZS";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr 150px 120px 110px",
        padding: "8px 16px",
        borderBottom: `1px solid ${C.border}`,
        alignItems: "center",
        fontSize: 13,
        cursor: "default",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ color: C.inkLight, fontSize: 12 }}>{date}</div>
      <div style={{ overflow: "hidden" }}>
        <div style={{ fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.Counterparty || tx.counterparty || "—"}
        </div>
        <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.Details || tx.description || ""}
        </div>
      </div>
      <div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.inkMid, border: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
          {tx.Category || tx.category || "—"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: C.inkMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {tx.Project || tx.direction || "—"}
      </div>
      <div style={{ textAlign: "right", fontWeight: 500, color: isPos ? C.pos : C.neg, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        {isPos ? "+" : "−"}{fmt(sum)} {txCurrency}
      </div>
    </div>
  );
}

function EntryCardMobile({ tx }) {
  const sum   = Number(tx.Sum ?? tx.amount ?? 0);
  const isPos = sum >= 0;
  const date  = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
  const txCurrency = tx._accountCurrency || "UZS";

  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontWeight: 500, color: C.ink, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tx.Counterparty || tx.counterparty || "—"}
        </div>
        <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
          {date} · {tx.Category || tx.category || "—"}
        </div>
      </div>
      <div style={{ fontWeight: 600, color: isPos ? C.pos : C.neg, fontSize: 13, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        {isPos ? "+" : "−"}{fmt(sum)} {txCurrency}
      </div>
    </div>
  );
}

function EntryRow({ tx }) {
  const isMobile = useIsMobile();
  return isMobile ? <EntryCardMobile tx={tx} /> : <EntryRowDesktop tx={tx} />;
}

// ─── SubGroup: "Поступления" или "Выплаты" внутри секции ─────────────────────
function SubGroup({ label, transactions, symbol, isPos }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [showRows, setShowRows] = useState(false);

  const total = transactions.reduce((s, t) => s + Math.abs(Number(t._converted ?? t.Sum ?? t.amount ?? 0)), 0);

  // Группировка по категориям
  const catMap = {};
  for (const tx of transactions) {
    const cat = tx.Category || tx.category || "Без категории";
    const sum = Math.abs(Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0));
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat] += sum;
  }
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...cats.map(([, v]) => v), 1);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      {/* Заголовок подгруппы */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "8px 14px" : "8px 16px",
          cursor: "pointer", userSelect: "none",
          background: C.surfaceAlt,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 11, width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.borderMid}`, borderRadius: 3, color: C.inkLight, flexShrink: 0,
            transition: "transform 0.2s",
          }}>
            {open ? "−" : "+"}
          </span>
          <span style={{ fontSize: 13, color: C.inkMid, fontWeight: 400 }}>{label}</span>
          <span style={{ fontSize: 11, color: C.inkLight }}>({transactions.length})</span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: total === 0 ? C.inkLight : (isPos ? C.pos : C.neg),
          fontVariantNumeric: "tabular-nums",
        }}>
          {total === 0 ? "—" : (isPos ? "+" : "−") + fmt(total) + " " + symbol}
        </span>
      </div>

      {/* Категории */}
      {open && (
        <div>
          {cats.map(([name, val]) => {
            const barW = Math.round((val / maxVal) * 80);
            return (
              <div key={name} style={{
                display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
                padding: isMobile ? "6px 14px 6px 36px" : "6px 16px 6px 38px",
                borderTop: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 12, color: C.inkMid, width: isMobile ? 100 : 160, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name}
                </div>
                <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: barW + "%", height: "100%",
                    background: isPos ? C.pos : C.neg,
                    borderRadius: 2, opacity: 0.45,
                    transition: "width 0.35s",
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: isPos ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {isPos ? "+" : "−"}{fmt(val)} {symbol}
                </div>
              </div>
            );
          })}

          {/* Показать транзакции */}
          <div
            onClick={() => setShowRows(!showRows)}
            style={{
              padding: "7px 16px 7px 38px", display: "flex", alignItems: "center", gap: 5,
              cursor: "pointer", borderTop: `1px solid ${C.border}`, background: C.surface,
            }}
          >
            <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>
              {showRows ? "Скрыть транзакции" : `Показать транзакции (${transactions.length})`}
            </span>
            <span style={{ fontSize: 9, color: C.accent, display: "inline-block", transition: "transform 0.2s", transform: showRows ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </div>

          {showRows && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {!isMobile && <TableHeader />}
              {transactions.length === 0
                ? <div style={{ padding: "20px", textAlign: "center", color: C.inkLight, fontSize: 13 }}>Нет транзакций</div>
                : transactions.map((tx, i) => <EntryRow key={tx.id || i} tx={tx} />)
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, total, transactions, symbol }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);

  const inflowTxs  = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) >= 0);
  const outflowTxs = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) < 0);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      {/* Заголовок секции */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: isMobile ? "10px 14px" : "11px 16px",
          cursor: "pointer", borderBottom: open ? `1px solid ${C.border}` : "none", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.ink }}>
          {title}
          <span style={{ fontWeight: 400, color: C.inkLight, fontSize: 11 }}>({transactions.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: total >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
            {fmtSigned(total, symbol)}
          </span>
          <span style={{ fontSize: 10, color: C.inkFaint, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
        </div>
      </div>

      {open && (
        <>
          <SubGroup label="Поступления" transactions={inflowTxs}  symbol={symbol} isPos={true}  />
          <SubGroup label="Выплаты"     transactions={outflowTxs} symbol={symbol} isPos={false} />
        </>
      )}
    </div>
  );
}

// ─── Waterfall ────────────────────────────────────────────────────────────────
function Waterfall({ op, inv, fin, symbol }) {
  const isMobile = useIsMobile();
  const net    = op + inv + fin;
  const maxVal = Math.max(Math.abs(op), Math.abs(inv), Math.abs(fin), Math.abs(net), 1);
  const pct    = (v) => Math.round((Math.abs(v) / maxVal) * 84);

  const rows = [
    { label: "Операционный",   val: op  },
    { label: "Инвестиционный", val: inv },
    { label: "Финансовый",     val: fin },
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: isMobile ? "14px" : "16px 20px", marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 500, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Структура потоков
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, marginBottom: 8 }}>
          <div style={{ fontSize: 12, width: isMobile ? 110 : 140, flexShrink: 0, color: C.inkMid }}>{r.label}</div>
          <div style={{ flex: 1, height: 18, background: C.surfaceAlt, borderRadius: 3, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{
              width: pct(r.val) + "%", height: "100%",
              background: r.val >= 0 ? C.posBg : C.negBg,
              borderRight: `2px solid ${r.val >= 0 ? C.pos : C.neg}`,
              borderRadius: "3px 0 0 3px",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6,
              transition: "width 0.4s",
            }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: r.val >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {fmtSigned(r.val, symbol)}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", marginTop: 4, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: isMobile ? 12 : 13, color: C.inkMid }}>Чистое изменение за период</span>
        <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 500, color: net >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
          {fmtSigned(net, symbol)}
        </span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const isMobile = useIsMobile();

  const [transactions,     setTransactions]     = useState([]);
  const [categoryTypeMap,  setCategoryTypeMap]  = useState({});
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [period,   setPeriod]   = useState("all");
  const [project,  setProject]  = useState("all");
  const [category, setCategory] = useState("all");
  const [account,  setAccount]  = useState("all");

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
        const [txSnap, accSnap, catSnap] = await Promise.all([
          getDocs(userCol("transactions")),
          getDocs(userCol("accounts")),
          getDocs(userCol("operation_categories")),
        ]);

        const accountCurrencyMap = {};
        accSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.name) accountCurrencyMap[data.name] = data.currency || "UZS";
        });

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
    if (category !== "all" && getSection(tx, categoryTypeMap) !== category) return false;
    return true;
  }), [transactionsWithConversion, dateFrom, dateTo, project, account, category, categoryTypeMap]);

  const sumArr  = (arr) => arr.reduce((s, t) => s + Number(t._converted ?? 0), 0);
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
    background: C.surface, color: C.ink, outline: "none",
    width: isMobile ? "100%" : 130,
  };

  const isLoading = loading || currencyLoading;

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 1100,
      padding: isMobile ? "0.75rem" : "1.5rem 1rem",
      color: C.ink,
      background: C.surfaceAlt,
      minHeight: "100vh",
    }}>

      {/* Title */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: C.ink }}>
          Движение денежных средств
        </h1>
        <p style={{ margin: "4px 0 0" }}>
          <span style={{ padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
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
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        background: C.border,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 10,
      }}>
        <KpiCard label="Операционный поток"   value={fmtSigned(opTotal, symbol)}  pos={opTotal  >= 0} />
        <KpiCard label="Инвестиционный поток"  value={fmtSigned(invTotal, symbol)} pos={invTotal >= 0} />
        <KpiCard label="Финансовый поток"      value={fmtSigned(finTotal, symbol)} pos={finTotal >= 0} />
        <KpiCard label="Чистый поток"          value={fmtSigned(netTotal, symbol)} pos={netTotal >= 0} />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: C.negBg, border: `0.5px solid ${C.neg}`, borderRadius: 6, color: C.neg, fontSize: 13, marginBottom: 10 }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.inkLight, fontSize: 13 }}>
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

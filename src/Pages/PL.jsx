import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCurrency } from "./useCurrency";

const userCol    = (name)     => collection(db, "users", auth.currentUser.uid, name);
const userDocRef = (col, id)  => doc(db, "users", auth.currentUser.uid, col, id);

// ─── Formatters ───────────────────────────────────────────────────────────────
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

// ─── P&L Structure ────────────────────────────────────────────────────────────
// sign: +1 = revenue/positive, -1 = cost/deduction
// computed: true = derived from formula, false = bucket of transactions
const PL_LINES = [
  { key: "revenue",     label: "1. Revenue",               indent: 0, bold: true,  computed: false, sign:  1 },
  { key: "cogs",        label: "2. COGS",                  indent: 0, bold: true,  computed: false, sign: -1 },
  { key: "cogs_direct", label: "2.1 Direct Costs",         indent: 1, bold: false, computed: false, sign: -1 },
  { key: "cogs_var",    label: "2.2 Variable Costs",       indent: 1, bold: false, computed: false, sign: -1 },
  { key: "gross",       label: "3. Gross Profit",          indent: 0, bold: true,  computed: true,  sign:  1 },
  { key: "opex",        label: "4. OPEX",                  indent: 0, bold: true,  computed: false, sign: -1 },
  { key: "ebitda",      label: "5. EBITDA",                indent: 0, bold: true,  computed: true,  sign:  1 },
  { key: "da",          label: "6. Depreciation / Amort.", indent: 0, bold: false, computed: false, sign: -1 },
  { key: "ebit",        label: "7. EBIT",                  indent: 0, bold: true,  computed: true,  sign:  1 },
  { key: "fin_result",  label: "8. Financial Result",      indent: 0, bold: false, computed: false, sign:  1 },
  { key: "taxes",       label: "9. Taxes",                 indent: 0, bold: false, computed: false, sign: -1 },
  { key: "net",         label: "10. Net Profit",           indent: 0, bold: true,  computed: true,  sign:  1 },
];

// Computed line formulas (use absolute bucket values)
const COMPUTE = {
  gross:  (v) => v.revenue - v.cogs - v.cogs_direct - v.cogs_var,
  ebitda: (v) => v.revenue - v.cogs - v.cogs_direct - v.cogs_var - v.opex,
  ebit:   (v) => v.revenue - v.cogs - v.cogs_direct - v.cogs_var - v.opex - v.da,
  net:    (v) => v.revenue - v.cogs - v.cogs_direct - v.cogs_var - v.opex - v.da + v.fin_result - v.taxes,
};

// ─── Colors (identical to CashFlow) ──────────────────────────────────────────
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

// ─── useIsMobile ──────────────────────────────────────────────────────────────
function useIsMobile() {
  const [v, set] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => set(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
}

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

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, pos }) {
  return (
    <div style={{ background: C.surface, padding: "12px 16px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkLight, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 400, color: pos ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Transaction list ─────────────────────────────────────────────────────────
function TxList({ transactions, symbol, isMobile }) {
  if (isMobile) {
    return transactions.map((tx, i) => {
      const sum = Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0);
      const isPos = sum >= 0;
      const date = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
      const cur  = tx._accountCurrency || "UZS";
      return (
        <div key={tx.id || i} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 500, color: C.ink, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {tx.Counterparty || tx.counterparty || "—"}
            </div>
            <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
              {date} · {tx.Category || tx.category || "—"}
            </div>
          </div>
          <div style={{ fontWeight: 600, color: isPos ? C.pos : C.neg, fontSize: 13, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {isPos ? "+" : "−"}{fmt(sum)} {cur}
          </div>
        </div>
      );
    });
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 150px 110px", padding: "6px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
        {["Дата", "Контрагент / Детали", "Статья", "Сумма"].map((h, i) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight, textAlign: i === 3 ? "right" : "left" }}>{h}</div>
        ))}
      </div>
      {transactions.map((tx, i) => {
        const sum = Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0);
        const isPos = sum >= 0;
        const date = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
        const cur  = tx._accountCurrency || "UZS";
        return (
          <div key={tx.id || i}
            style={{ display: "grid", gridTemplateColumns: "90px 1fr 150px 110px", padding: "8px 16px", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 13 }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ color: C.inkLight, fontSize: 12 }}>{date}</div>
            <div>
              <div style={{ fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tx.Counterparty || tx.counterparty || "—"}
              </div>
              <div style={{ fontSize: 11, color: C.inkLight }}>{tx.Details || tx.description || ""}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.inkMid, border: `1px solid ${C.border}` }}>
                {tx.Category || tx.category || "—"}
              </span>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500, color: isPos ? C.pos : C.neg, fontVariantNumeric: "tabular-nums" }}>
              {isPos ? "+" : "−"}{fmt(sum)} {cur}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── PLRow ────────────────────────────────────────────────────────────────────
function PLRow({ line, value, transactions, symbol, revenue, isMobile }) {
  const [open,   setOpen]   = useState(false);
  const [showTx, setShowTx] = useState(false);

  const canExpand = !line.computed && transactions.length > 0;
  const indentPx  = line.indent * (isMobile ? 14 : 20);

  // Category breakdown
  const catMap = {};
  for (const tx of transactions) {
    const cat = tx.Category || tx.category || "Без категории";
    const sum = Math.abs(Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0));
    catMap[cat] = (catMap[cat] || 0) + sum;
  }
  const cats   = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxBar = Math.max(...cats.map(([, v]) => v), 1);

  const isZero = value === 0;
  const isPos  = value >= 0;
  const valueColor = line.computed
    ? (isZero ? C.inkLight : isPos ? C.pos : C.neg)
    : (isZero ? C.inkLight : C.inkMid);

  const pct = line.computed && revenue > 0
    ? ((Math.abs(value) / revenue) * 100).toFixed(1) + "%"
    : null;

  const rowBg = line.computed
    ? (line.key === "net"
        ? (isZero ? C.surfaceAlt : isPos ? C.posBg : C.negBg)
        : C.surfaceAlt)
    : "transparent";

  return (
    <>
      {/* Row */}
      <div
        onClick={() => canExpand && setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: isMobile ? "9px 14px" : "10px 20px",
          paddingLeft: isMobile ? 14 + indentPx : 20 + indentPx,
          borderBottom: `1px solid ${C.border}`,
          background: rowBg,
          cursor: canExpand ? "pointer" : "default",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => { if (!line.computed) e.currentTarget.style.background = C.surfaceAlt; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
      >
        {/* +/− toggle */}
        <span style={{
          fontSize: 9, width: 15, height: 15, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${canExpand ? C.borderMid : "transparent"}`,
          borderRadius: 3, color: C.inkLight,
          visibility: canExpand ? "visible" : "hidden",
        }}>
          {open ? "−" : "+"}
        </span>

        {/* Label */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: line.bold ? 600 : 400, color: line.bold ? C.ink : C.inkMid }}>
          {line.label}
          {canExpand && (
            <span style={{ fontSize: 11, color: C.inkLight, marginLeft: 6 }}>({transactions.length})</span>
          )}
        </span>

        {/* % of revenue */}
        {!isMobile && (
          <span style={{ fontSize: 11, color: C.inkLight, width: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {pct ?? ""}
          </span>
        )}

        {/* Amount */}
        <span style={{
          fontSize: 13, fontWeight: line.bold ? 600 : 400,
          color: valueColor, fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap", minWidth: isMobile ? 90 : 130, textAlign: "right",
        }}>
          {isZero ? "—" : fmtSigned(value, symbol)}
        </span>
      </div>

      {/* Expanded */}
      {open && canExpand && (
        <div style={{ borderBottom: `1px solid ${C.border}` }}>

          {/* Category bars */}
          {cats.map(([name, val]) => (
            <div key={name} style={{
              display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
              padding: isMobile ? "6px 14px 6px 44px" : "6px 20px 6px 56px",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 12, color: C.inkMid, width: isMobile ? 90 : 160, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: Math.round((val / maxBar) * 80) + "%", height: "100%",
                  background: line.sign >= 0 ? C.pos : C.neg,
                  borderRadius: 2, opacity: 0.4, transition: "width 0.35s",
                }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: line.sign >= 0 ? C.pos : C.neg, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {fmt(val)} {symbol}
              </div>
            </div>
          ))}

          {/* Toggle tx */}
          <div
            onClick={() => setShowTx(!showTx)}
            style={{ padding: "7px 20px 7px 56px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
          >
            <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>
              {showTx ? "Скрыть транзакции" : `Показать транзакции (${transactions.length})`}
            </span>
            <span style={{ fontSize: 9, color: C.accent, display: "inline-block", transition: "transform 0.2s", transform: showTx ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </div>

          {showTx && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <TxList transactions={transactions} symbol={symbol} isMobile={isMobile} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── CategoryMapper ───────────────────────────────────────────────────────────
function CategoryMapper({ categories, mapping, onChange, isMobile }) {
  const [open, setOpen] = useState(false);
  const INPUT_LINES = PL_LINES.filter((l) => !l.computed);
  const mapped = categories.filter((c) => mapping[normalize(c.name)]).length;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
      {/* Toggle header */}
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15 }}>⚙️</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Настройка статей P&L</span>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.accentBg, color: C.accent, fontWeight: 500 }}>
            {mapped} / {categories.length} привязано
          </span>
        </div>
        <span style={{ fontSize: 10, color: C.inkFaint, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "200px 1fr 220px",
            padding: "8px 20px", background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`,
          }}>
            {(isMobile ? ["Категория", "P&L строка"] : ["Категория", "Тип / Описание", "P&L строка"]).map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight }}>{h}</div>
            ))}
          </div>

          {categories.length === 0 && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: C.inkLight, fontSize: 13 }}>
              Категории не найдены. Добавьте их в разделе «Категории».
            </div>
          )}

          {categories.map((cat) => {
            const key     = normalize(cat.name);
            const current = mapping[key] || "";
            return (
              <div
                key={cat.id}
                style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "200px 1fr 220px", padding: "9px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{cat.name}</div>
                {!isMobile && (
                  <div style={{ fontSize: 11, color: C.inkLight, overflow: "hidden" }}>
                    {cat.type && (
                      <span style={{ padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.surfaceAlt, marginRight: 6, fontSize: 11 }}>
                        {cat.type}
                      </span>
                    )}
                    {cat.description || ""}
                  </div>
                )}
                <select
                  value={current}
                  onChange={(e) => onChange(key, e.target.value)}
                  style={{
                    fontFamily: "inherit", fontSize: 12, padding: "5px 8px",
                    border: `1px solid ${current ? C.accent : C.borderMid}`,
                    borderRadius: 5,
                    background: current ? C.accentBg : C.surface,
                    color: current ? C.accent : C.inkMid,
                    cursor: "pointer", outline: "none", width: "100%",
                  }}
                >
                  <option value="">— не привязана —</option>
                  {INPUT_LINES.map((line) => (
                    <option key={line.key} value={line.key}>{line.label}</option>
                  ))}
                </select>
              </div>
            );
          })}

          <div style={{ padding: "10px 20px", background: C.surfaceAlt, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.inkLight }}>
            Привязка автоматически сохраняется в Firestore →{" "}
            <code style={{ fontFamily: "monospace" }}>users/{"{uid}"}/settings/pl_mapping</code>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfitLoss() {
  const isMobile = useIsMobile();

  const [transactions, setTransactions] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [plMapping,    setPlMapping]    = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [period,   setPeriod]   = useState("all");
  const [project,  setProject]  = useState("all");
  const [account,  setAccount]  = useState("all");

  const { targetCurrency, convert, symbol, loading: currencyLoading } = useCurrency();

  const applyPeriod = (p) => {
    setPeriod(p);
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const pad  = (n) => String(n).padStart(2, "0");
    const last = (yr, mo) => new Date(yr, mo + 1, 0).getDate();
    if (p === "month") { setDateFrom(`${y}-${pad(m+1)}-01`); setDateTo(`${y}-${pad(m+1)}-${last(y,m)}`); }
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
        const [txSnap, accSnap, catSnap, mapDoc] = await Promise.all([
          getDocs(userCol("transactions")),
          getDocs(userCol("accounts")),
          getDocs(userCol("operation_categories")),
          getDoc(userDocRef("settings", "pl_mapping")),
        ]);

        const accCurMap = {};
        accSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.name) accCurMap[data.name] = data.currency || "UZS";
        });

        setCategories(catSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPlMapping(mapDoc.exists() ? mapDoc.data() : {});

        setTransactions(txSnap.docs.map((d) => {
          const data = d.data();
          const acc = data.Account || data.walletName || "";
          return {
            ...data,
            id: d.id,
            _isoDate:         normalizeDate(data.Date || data.date || ""),
            _accountCurrency: accCurMap[acc] || "UZS",
          };
        }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleMappingChange = async (catKey, plKey) => {
    const next = { ...plMapping };
    if (plKey) { next[catKey] = plKey; } else { delete next[catKey]; }
    setPlMapping(next);
    try { await setDoc(userDocRef("settings", "pl_mapping"), next); }
    catch (e) { console.error("save mapping failed:", e); }
  };

  // With currency conversion
  const txConverted = useMemo(() =>
    transactions.map((tx) => ({
      ...tx,
      _converted: convert(Number(tx.Sum ?? tx.amount ?? 0), tx._accountCurrency || "UZS"),
    })),
    [transactions, convert]
  );

  // Distinct filter options
  const projectNames = useMemo(() =>
    ["all", ...[...new Set(txConverted.map((t) => t.Project || t.direction).filter(Boolean))].sort()],
    [txConverted]
  );
  const accountNames = useMemo(() =>
    ["all", ...[...new Set(txConverted.map((t) => t.Account || t.walletName).filter(Boolean))].sort()],
    [txConverted]
  );

  // Filtered transactions
  const filtered = useMemo(() => txConverted.filter((tx) => {
    if (dateFrom && tx._isoDate && tx._isoDate < dateFrom) return false;
    if (dateTo   && tx._isoDate && tx._isoDate > dateTo)   return false;
    if (project !== "all" && (tx.Project || tx.direction || "") !== project) return false;
    if (account !== "all" && (tx.Account || tx.walletName || "") !== account) return false;
    return true;
  }), [txConverted, dateFrom, dateTo, project, account]);

  // Build transaction buckets per P&L line
  const buckets = useMemo(() => {
    const b = {};
    PL_LINES.filter((l) => !l.computed).forEach((l) => { b[l.key] = []; });
    for (const tx of filtered) {
      const cat = normalize(tx.Category || tx.category || "");
      const lk  = plMapping[cat];
      if (lk && b[lk] !== undefined) b[lk].push(tx);
    }
    return b;
  }, [filtered, plMapping]);

  // Absolute sums + computed lines
  const vals = useMemo(() => {
    const v = {};
    PL_LINES.filter((l) => !l.computed).forEach((l) => {
      v[l.key] = (buckets[l.key] || []).reduce((s, t) => s + Math.abs(Number(t._converted ?? 0)), 0);
    });
    Object.entries(COMPUTE).forEach(([k, fn]) => { v[k] = fn(v); });
    return v;
  }, [buckets]);

  // Display value: for computed lines keep as-is, for input lines multiply by sign
  const displayVal = (line) => line.computed ? vals[line.key] : vals[line.key] * line.sign;

  const revenue   = vals["revenue"] || 0;
  const isLoading = loading || currencyLoading;

  const inputStyle = {
    fontFamily: "inherit", fontSize: 12, padding: "5px 9px",
    border: `0.5px solid ${C.borderMid}`, borderRadius: 4,
    background: C.surface, color: C.ink, outline: "none",
    width: isMobile ? "100%" : 130,
  };

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
          Отчёт о прибылях и убытках (P&amp;L)
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
              <input type="date" value={dateTo}   onChange={(e) => { setDateTo(e.target.value);   setPeriod(""); }} style={inputStyle} />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); setPeriod("all"); }}
                  style={{ fontSize: 12, color: C.inkLight, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Быстро</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[["all","Все"],["month","Месяц"],["q1","Q1"],["q2","Q2"],["q3","Q3"],["q4","Q4"],["year","Год"]].map(([val, lbl]) => (
                <Pill key={val} label={lbl} active={period === val} onClick={() => applyPeriod(val)} />
              ))}
            </div>
          </div>

          {projectNames.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Проект</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {projectNames.map((p) => <Pill key={p} label={p === "all" ? "Все" : p} active={project === p} onClick={() => setProject(p)} />)}
              </div>
            </div>
          )}

          {accountNames.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Счёт</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {accountNames.map((a) => <Pill key={a} label={a === "all" ? "Все" : a} active={account === a} onClick={() => setAccount(a)} />)}
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
        marginBottom: 14,
      }}>
        <KpiCard label="Валовая прибыль" value={fmtSigned(vals["gross"]  ?? 0, symbol)} pos={(vals["gross"]  ?? 0) >= 0} />
        <KpiCard label="EBITDA"          value={fmtSigned(vals["ebitda"] ?? 0, symbol)} pos={(vals["ebitda"] ?? 0) >= 0} />
        <KpiCard label="EBIT"            value={fmtSigned(vals["ebit"]   ?? 0, symbol)} pos={(vals["ebit"]   ?? 0) >= 0} />
        <KpiCard label="Чистая прибыль"  value={fmtSigned(vals["net"]    ?? 0, symbol)} pos={(vals["net"]    ?? 0) >= 0} />
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

      {/* P&L Table */}
      {!isLoading && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          {/* Table header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "8px 14px" : "8px 20px", background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight }}>Статья P&amp;L</div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              {!isMobile && (
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight, width: 56, textAlign: "right" }}>
                  % Rev.
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: C.inkLight, minWidth: isMobile ? 90 : 130, textAlign: "right" }}>
                Сумма
              </div>
            </div>
          </div>

          {PL_LINES.map((line) => (
            <PLRow
              key={line.key}
              line={line}
              value={displayVal(line)}
              transactions={buckets[line.key] || []}
              symbol={symbol}
              revenue={revenue}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* Category mapper (bottom, collapsible) */}
      {!isLoading && (
        <CategoryMapper
          categories={categories}
          mapping={plMapping}
          onChange={handleMappingChange}
          isMobile={isMobile}
        />
      )}

    </div>
  );
}

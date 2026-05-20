import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../useAppStore";
import { useCurrency } from "./useCurrency";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtSigned = (n, symbol) =>
  (n >= 0 ? "+" : "−") + " " + fmt(n);

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
  const cat  = normalize(tx.Category || tx.category || "");
  const type = map[cat];
  if (type === "op" || type === "inv" || type === "fin") return type;
  return "fin";
};

const MONTH_NAMES_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function getMonthsInRange(from, to) {
  if (!from || !to) return [];
  const result = [];
  const start = new Date(from.slice(0, 7) + "-01");
  const end   = new Date(to.slice(0, 7)   + "-01");
  const cur   = new Date(start);
  while (cur <= end) {
    result.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

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
  warn:       "#a16207",
  warnBg:     "#fef9c3",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
};

// ширина прилипающего первого столбца
const LABEL_COL_W = 220;

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
        fontSize: 16, fontWeight: 400,
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
  const sum        = Number(tx.Sum ?? tx.amount ?? 0);
  const isPos      = sum >= 0;
  const date       = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
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
  const sum        = Number(tx.Sum ?? tx.amount ?? 0);
  const isPos      = sum >= 0;
  const date       = tx._isoDate ? tx._isoDate.split("-").reverse().join(".") : "—";
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

function SubGroup({ label, transactions, symbol, isPos }) {
  const isMobile = useIsMobile();
  const [open, setOpen]         = useState(false);
  const [showRows, setShowRows] = useState(false);

  const total = transactions.reduce((s, t) => s + Math.abs(Number(t._converted ?? t.Sum ?? t.amount ?? 0)), 0);

  const catMap = {};
  for (const tx of transactions) {
    const cat = tx.Category || tx.category || "Без категории";
    const sum = Math.abs(Number(tx._converted ?? tx.Sum ?? tx.amount ?? 0));
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat] += sum;
  }
  const cats   = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...cats.map(([, v]) => v), 1);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
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
          {total === 0 ? "—" : (isPos ? "+" : "−") + fmt(total)}
        </span>
      </div>

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

function Section({ title, total, transactions, symbol }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);

  const inflowTxs  = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) >= 0);
  const outflowTxs = transactions.filter(t => Number(t._converted ?? t.Sum ?? t.amount ?? 0) < 0);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
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

// ─── MonthlyTable ─────────────────────────────────────────────────────────────
function MonthlyTable({ months, filtered, categoryTypeMap, symbol }) {
  const [openGroups, setOpenGroups] = useState(new Set());

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sumArr = (arr) => arr.reduce((s, t) => s + Number(t._converted ?? 0), 0);

  const getTxs = (secKey, isPos, year, month) =>
    filtered.filter((tx) => {
      if (!tx._isoDate) return false;
      const d = new Date(tx._isoDate + "T00:00:00");
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      const sec = getSection(tx, categoryTypeMap);
      if (sec !== secKey) return false;
      const sum = Number(tx._converted ?? 0);
      return isPos ? sum >= 0 : sum < 0;
    });

  const getCats = (secKey, isPos) => {
    const catSet = new Set();
    filtered.forEach((tx) => {
      const sec = getSection(tx, categoryTypeMap);
      if (sec !== secKey) return;
      const sum = Number(tx._converted ?? 0);
      if (isPos ? sum < 0 : sum >= 0) return;
      catSet.add(tx.Category || tx.category || "Без категории");
    });
    return [...catSet].sort();
  };

  const colW = Math.max(120, Math.floor(700 / months.length));

  // ── Общие стили для ячейки «Вид деятельности» (прилипающий первый столбец) ──
  const labelCellBase = {
    position: "sticky",
    left: 0,
    zIndex: 1,
    width: LABEL_COL_W,
    minWidth: LABEL_COL_W,
    boxSizing: "border-box",
    whiteSpace: "nowrap",          // ← текст в одну строку, не переносится
    borderRight: `1px solid ${C.border}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const SECTIONS = [
    { key: "op",  label: "Операционная деятельность"  },
    { key: "inv", label: "Инвестиционная деятельность" },
    { key: "fin", label: "Финансовая деятельность"     },
  ];

  // ── Строка-заголовок секции / итоговая строка ──
  const renderSectionHeader = (label, monthVals, isNet = false) => (
    <div style={{
      display: "flex",
      borderBottom: `1px solid ${C.border}`,
      background: isNet ? "#eff6ff" : C.surfaceAlt,
    }}>
      {/* Прилипающая ячейка с названием */}
      <div style={{
        ...labelCellBase,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        color: isNet ? C.accent : C.ink,
        background: isNet ? "#eff6ff" : C.surfaceAlt,
      }}>
        {label}
      </div>

      {/* Ячейки с суммами по месяцам */}
      <div style={{ display: "flex" }}>
        {monthVals.map(({ year, month, val }) => {
          const color = val === 0 ? C.inkLight : val > 0 ? C.pos : C.neg;
          return (
            <div key={`${year}-${month}`} style={{
              width: colW,
              minWidth: colW,
              padding: "10px 12px",
              textAlign: "center",           // ← цифры по центру
              fontSize: 13,
              fontWeight: 600,
              color: isNet ? (val >= 0 ? C.pos : C.neg) : color,
              borderLeft: `1px solid ${C.border}`,
              fontVariantNumeric: "tabular-nums",
              boxSizing: "border-box",
            }}>
              {val === 0
                ? <span style={{ color: C.inkFaint }}>—</span>
                : (val > 0 ? "+" : "−") + fmt(val)}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Строка-группа (Поступления / Выплаты) + строки категорий ──
  const renderGroupRow = (groupKey, label, isPos, secKey) => {
    const isOpen = openGroups.has(groupKey);
    const cats   = getCats(secKey, isPos);

    const monthVals = months.map(({ year, month }) => {
      const txs = getTxs(secKey, isPos, year, month);
      return { year, month, val: sumArr(txs) };
    });

    return (
      <div key={groupKey}>
        {/* Строка-заголовок группы (кликабельная) */}
        <div
          onClick={() => toggleGroup(groupKey)}
          style={{
            display: "flex",
            borderBottom: `1px solid ${C.border}`,
            cursor: "pointer",
            background: C.surface,
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
          onMouseLeave={(e) => e.currentTarget.style.background = C.surface}
        >
          {/* Прилипающая ячейка */}
          <div style={{
            ...labelCellBase,
            padding: "8px 16px 8px 20px",
            fontSize: 12,
            fontWeight: 500,
            color: C.inkMid,
            background: C.surface,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{
              display: "inline-block",
              fontSize: 10,
              color: C.inkLight,
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              lineHeight: 1,
              flexShrink: 0,
            }}>▶</span>
            {label}
            <span style={{ fontSize: 11, color: C.inkLight, fontWeight: 400 }}>({cats.length})</span>
          </div>

          {/* Ячейки с суммами */}
          <div style={{ display: "flex" }}>
            {monthVals.map(({ year, month, val }) => {
              const color = val === 0 ? C.inkLight : isPos ? C.pos : C.neg;
              return (
                <div key={`${year}-${month}`} style={{
                  width: colW,
                  minWidth: colW,
                  padding: "8px 12px",
                  textAlign: "center",         // ← цифры по центру
                  fontSize: 12,
                  fontWeight: 500,
                  color,
                  borderLeft: `1px solid ${C.border}`,
                  fontVariantNumeric: "tabular-nums",
                  boxSizing: "border-box",
                }}>
                  {val === 0
                    ? <span style={{ color: C.inkFaint }}>—</span>
                    : (isPos ? "+" : "−") + fmt(Math.abs(val))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Строки категорий (раскрываются) */}
        {isOpen && cats.map((cat) => {
          const catMonthVals = months.map(({ year, month }) => {
            const txs = getTxs(secKey, isPos, year, month).filter(
              (tx) => (tx.Category || tx.category || "Без категории") === cat
            );
            return { year, month, val: sumArr(txs) };
          });

          return (
            <div key={cat} style={{
              display: "flex",
              borderBottom: `1px solid ${C.border}`,
              background: isPos ? C.posBg : C.negBg,
            }}>
              {/* Прилипающая ячейка категории */}
              <div style={{
                ...labelCellBase,
                padding: "7px 16px 7px 36px",
                fontSize: 12,
                color: C.inkMid,
                background: isPos ? C.posBg : C.negBg,
              }}>
                {cat}
              </div>

              {/* Ячейки с суммами */}
              <div style={{ display: "flex" }}>
                {catMonthVals.map(({ year, month, val }) => (
                  <div key={`${year}-${month}`} style={{
                    width: colW,
                    minWidth: colW,
                    padding: "7px 12px",
                    textAlign: "center",       // ← цифры по центру
                    fontSize: 12,
                    color: val === 0 ? C.inkFaint : isPos ? C.pos : C.neg,
                    borderLeft: `1px solid ${C.border}`,
                    fontVariantNumeric: "tabular-nums",
                    boxSizing: "border-box",
                  }}>
                    {val === 0
                      ? "—"
                      : (isPos ? "+" : "−") + fmt(Math.abs(val))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getSectionMonthVals = (secKey) =>
    months.map(({ year, month }) => {
      const txs = filtered.filter((tx) => {
        if (!tx._isoDate) return false;
        const d = new Date(tx._isoDate + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month && getSection(tx, categoryTypeMap) === secKey;
      });
      return { year, month, val: sumArr(txs) };
    });

  const getNetMonthVals = () =>
    months.map(({ year, month }) => {
      const txs = filtered.filter((tx) => {
        if (!tx._isoDate) return false;
        const d = new Date(tx._isoDate + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      });
      return { year, month, val: sumArr(txs) };
    });

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 8,
    }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: LABEL_COL_W + months.length * colW }}>

          {/* Шапка с месяцами */}
          <div style={{
            display: "flex",
            background: C.surfaceAlt,
            borderBottom: `2px solid ${C.border}`,
            position: "sticky",
            top: 0,
            zIndex: 3,
          }}>
            {/* Прилипающая ячейка шапки */}
            <div style={{
              ...labelCellBase,
              padding: "10px 16px",
              fontSize: 10,
              fontWeight: 600,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: C.surfaceAlt,
              zIndex: 3,
            }}>
              Вид деятельности
            </div>

            {/* Заголовки месяцев */}
            <div style={{ display: "flex" }}>
              {months.map(({ year, month }) => (
                <div key={`${year}-${month}`} style={{
                  width: colW,
                  minWidth: colW,
                  padding: "10px 12px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.inkLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textAlign: "center",         // ← заголовки месяцев тоже по центру
                  borderLeft: `1px solid ${C.border}`,
                  boxSizing: "border-box",
                }}>
                  {MONTH_NAMES_RU[month]} {year}
                </div>
              ))}
            </div>
          </div>

          {/* Секции */}
          {SECTIONS.map((sec) => (
            <div key={sec.key}>
              {renderSectionHeader(sec.label, getSectionMonthVals(sec.key))}
              {renderGroupRow(`${sec.key}_in`,  "Поступления", true,  sec.key)}
              {renderGroupRow(`${sec.key}_out`, "Выплаты",     false, sec.key)}
            </div>
          ))}

          {/* Чистый поток */}
          {renderSectionHeader("Чистый поток", getNetMonthVals(), true)}

        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const isMobile = useIsMobile();

  const {
    transactions: rawTransactions,
    accounts,
    categoryTypeMap,
    accountCurrencyMap,
    loading: storeLoading,
    error: storeError,
  } = useAppStore();

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
    const y   = now.getFullYear();
    const m   = now.getMonth();
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

  const transactions = useMemo(() =>
    rawTransactions.map((tx) => ({
      ...tx,
      _isoDate:         tx._isoDate || normalizeDate(tx.Date || tx.date || ""),
      _accountCurrency: accountCurrencyMap[tx.Account || tx.walletName || ""] || tx._accountCurrency || "UZS",
    })),
    [rawTransactions, accountCurrencyMap]
  );

  const transactionsWithConversion = useMemo(() =>
    transactions.map((tx) => ({
      ...tx,
      _converted: convert(
        Number(tx.Sum ?? tx.amount ?? 0),
        tx._accountCurrency || "UZS"
      ),
    })),
    [transactions, convert]
  );

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

  const sumArr   = (arr) => arr.reduce((s, t) => s + Number(t._converted ?? 0), 0);
  const opTxs    = filtered.filter((t) => getSection(t, categoryTypeMap) === "op");
  const invTxs   = filtered.filter((t) => getSection(t, categoryTypeMap) === "inv");
  const finTxs   = filtered.filter((t) => getSection(t, categoryTypeMap) === "fin");
  const opTotal  = sumArr(opTxs);
  const invTotal = sumArr(invTxs);
  const finTotal = sumArr(finTxs);
  const netTotal = opTotal + invTotal + finTotal;

  const months      = useMemo(() => getMonthsInRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const showMonthly = months.length >= 2;

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

  const isLoading = storeLoading || currencyLoading;

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      width: "100%",
      color: C.ink,
    }}>

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
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[["all","Все"],["month","Месяц"],["q1","Q1"],["q2","Q2"],["q3","Q3"],["q4","Q4"],["year","Год"]].map(([val, lbl]) => (
                <Pill key={val} label={lbl} active={period === val} onClick={() => applyPeriod(val)} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Деятельность</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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

      {/* KPI */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        background: C.border,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 10,
      }}>
        <KpiCard label="Операционный поток"   value={fmtSigned(opTotal,  symbol)} pos={opTotal  >= 0} />
        <KpiCard label="Инвестиционный поток"  value={fmtSigned(invTotal, symbol)} pos={invTotal >= 0} />
        <KpiCard label="Финансовый поток"      value={fmtSigned(finTotal, symbol)} pos={finTotal >= 0} />
        <KpiCard label="Чистый поток"          value={fmtSigned(netTotal, symbol)} pos={netTotal >= 0} />
      </div>

      {storeError && (
        <div style={{ padding: "10px 14px", background: C.negBg, border: `0.5px solid ${C.neg}`, borderRadius: 6, color: C.neg, fontSize: 13, marginBottom: 10 }}>
          Ошибка загрузки: {storeError}
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.inkLight, fontSize: 13 }}>
          Загрузка данных…
        </div>
      )}

      {/* Таблица по месяцам */}
      {!isLoading && showMonthly && (
        <MonthlyTable
          months={months}
          filtered={filtered}
          categoryTypeMap={categoryTypeMap}
          symbol={symbol}
        />
      )}

      {/* Обычные секции */}
      {!isLoading && !showMonthly && visibleSections.map((sec) => (
        <Section key={sec.key} title={sec.title} total={sec.total} transactions={sec.txs} symbol={symbol} />
      ))}

      {!isLoading && <Waterfall op={opTotal} inv={invTotal} fin={finTotal} symbol={symbol} />}
    </div>
  );
}

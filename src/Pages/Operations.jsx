/**
 * OperationsPage.jsx — v2.3
 *
 * ИЗМЕНЕНИЯ v2.3:
 *  - Дочерние операции (split) убраны из основного списка
 *  - Accordion: клик на бейдж "разбита ▾" раскрывает дочерние строки прямо под родителем
 *  - Анимация раскрытия через CSS transition
 *  - Исправлен Height -> height: "100%"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, collection,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAppStore, store } from "../Pages/useAppStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

const fmt       = (n) => Math.abs(n).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = (n) => (n >= 0 ? "+ " : "− ") + fmt(n);
const MONTH_NAMES = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const DAY_NAMES   = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function normalizeDate(raw) {
  if (!raw) return "1970-01-01";
  if (raw?.toDate) return raw.toDate().toISOString().slice(0, 10);
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

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportToCSV(transactions) {
  const headers = ["Дата","Тип","Контрагент","Статья","Проект","Счёт","Сумма","Описание"];
  const rows = transactions.map((tx) => [
    tx._isoDate,
    tx.type === "income" ? "Поступление" : tx.type === "expense" ? "Списание" : "Перевод",
    tx.counterparty || "",
    tx.category || "",
    tx.direction || "",
    tx.walletName || "",
    tx.amount,
    tx.description || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `операции_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
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

// ─── Type Icon ────────────────────────────────────────────────────────────────
function TypeIcon({ type, size = 16 }) {
  const configs = {
    income:   { bg: "#EAF3DE", color: "#3B6D11", icon: "↑" },
    expense:  { bg: "#FCEBEB", color: "#A32D2D", icon: "↓" },
    transfer: { bg: "#E6F1FB", color: "#185FA5", icon: "⇄" },
  };
  const c = configs[type] || configs.expense;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size + 8, height: size + 8, borderRadius: "50%",
      background: c.bg, color: c.color, fontSize: size - 2, fontWeight: 700,
      lineHeight: 1,
    }}>
      {c.icon}
    </span>
  );
}

// ─── ProjectPill ──────────────────────────────────────────────────────────────
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

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, color }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end   = value;
    const duration = 400;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * ease);
      if (p < 1) requestAnimationFrame(step);
      else { setDisplay(end); prev.current = end; }
    };
    requestAnimationFrame(step);
  }, [value]);
  if (typeof value === "string") return <span style={{ color }}>{value}</span>;
  return <span style={{ color }}>{fmtSigned(display)}</span>;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ transactions }) {
  const data = useMemo(() => {
    const byDate = {};
    transactions.forEach((tx) => {
      if (!byDate[tx._isoDate]) byDate[tx._isoDate] = { inc: 0, exp: 0 };
      if (tx.amount > 0) byDate[tx._isoDate].inc += tx.amount;
      else byDate[tx._isoDate].exp += Math.abs(tx.amount);
    });
    return Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30);
  }, [transactions]);

  if (data.length < 2) return null;

  const W = 320, H = 48, pad = 4;
  const maxVal = Math.max(...data.map(([, d]) => Math.max(d.inc, d.exp)), 1);
  const xStep  = (W - pad * 2) / (data.length - 1);

  const pts = (key) => data.map(([, d], i) => {
    const x = pad + i * xStep;
    const y = H - pad - ((d[key] / maxVal) * (H - pad * 2));
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>30 дней</span>
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        <polyline points={pts("inc")} fill="none" stroke="#3B6D11" strokeWidth="1.5" strokeOpacity="0.8" />
        <polyline points={pts("exp")} fill="none" stroke="#A32D2D" strokeWidth="1.5" strokeOpacity="0.8" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 10, color: "#3B6D11" }}>● доходы</span>
        <span style={{ fontSize: 10, color: "#A32D2D" }}>● расходы</span>
      </div>
    </div>
  );
}

// ─── Generic Dropdown ─────────────────────────────────────────────────────────
function Dropdown({ options, value, onChange, placeholder = "Выбрать" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState("");
  const ref             = useRef(null);
  const filtered        = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-secondary)", fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 500, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Не выбрано</div>
            {filtered.map((opt) => (
              <div key={opt} onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: opt === value ? "var(--color-background-info)" : "transparent", color: opt === value ? "var(--color-text-info)" : "var(--color-text-primary)", fontWeight: opt === value ? 500 : 400 }}
                onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
              >{opt}</div>
            ))}
            {!filtered.length && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CounterpartyDropdown ─────────────────────────────────────────────────────
function CounterpartyDropdown({ value, onChange, transactions }) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState("");
  const [cpDocs, setCpDocs] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(userCol("counterparties"), (snap) => setCpDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, []);

  const options = useMemo(() => {
    const fromDocs   = cpDocs.map((c) => c.name).filter(Boolean);
    const fromTxSet  = new Set(fromDocs.map((n) => n.toLowerCase()));
    const fromTx     = [...new Set(transactions.map((t) => t.counterparty).filter(Boolean))].filter((n) => !fromTxSet.has(n.toLowerCase()));
    return [...fromDocs, ...fromTx].sort((a, b) => a.localeCompare(b, "ru"));
  }, [cpDocs, transactions]);

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-secondary)", fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "Выбрать контрагента"}</span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 600, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 260, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск или введите вручную…" style={inp}
              onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) { onChange(q.trim()); setOpen(false); setQ(""); } }}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Не выбрано</div>
            {q.trim() && !filtered.some((o) => o.toLowerCase() === q.trim().toLowerCase()) && (
              <div onClick={() => { onChange(q.trim()); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "#3b62d6", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              ><span style={{ fontSize: 15 }}>＋</span> Использовать «{q.trim()}»</div>
            )}
            {filtered.map((opt) => (
              <div key={opt} onClick={() => { onChange(opt); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: opt === value ? "var(--color-background-info)" : "transparent", color: opt === value ? "var(--color-text-info)" : "var(--color-text-primary)", fontWeight: opt === value ? 500 : 400 }}
                onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
              >{opt}</div>
            ))}
            {!filtered.length && !q.trim() && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Нет контрагентов</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────
function DateRangePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(dateFrom || "");
  const [to,   setTo]   = useState(dateTo   || "");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setFrom(dateFrom || ""); }, [dateFrom]);
  useEffect(() => { setTo(dateTo   || ""); }, [dateTo]);

  const apply = (f, t) => { onChange(f, t); setOpen(false); };
  const clear  = ()    => { onChange("", ""); setFrom(""); setTo(""); setOpen(false); };

  const today = new Date();
  const iso   = (d) => d.toISOString().slice(0, 10);
  const firstDay = (y, m) => iso(new Date(y, m, 1));
  const lastDay  = (y, m) => iso(new Date(y, m + 1, 0));

  const presets = [
    { label: "Сегодня",      action: () => apply(iso(today), iso(today)) },
    { label: "Эта неделя",   action: () => { const day = today.getDay() || 7; const mon = new Date(today); mon.setDate(today.getDate() - day + 1); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); apply(iso(mon), iso(sun)); } },
    { label: "Этот месяц",   action: () => apply(firstDay(today.getFullYear(), today.getMonth()), lastDay(today.getFullYear(), today.getMonth())) },
    { label: "Прошлый месяц",action: () => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); apply(firstDay(d.getFullYear(), d.getMonth()), lastDay(d.getFullYear(), d.getMonth())); } },
    { label: "Q1",  action: () => apply(`${today.getFullYear()}-01-01`, `${today.getFullYear()}-03-31`) },
    { label: "Q2",  action: () => apply(`${today.getFullYear()}-04-01`, `${today.getFullYear()}-06-30`) },
    { label: "Q3",  action: () => apply(`${today.getFullYear()}-07-01`, `${today.getFullYear()}-09-30`) },
    { label: "Q4",  action: () => apply(`${today.getFullYear()}-10-01`, `${today.getFullYear()}-12-31`) },
    { label: "Этот год",    action: () => apply(`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`) },
    { label: "Прошлый год", action: () => apply(`${today.getFullYear() - 1}-01-01`, `${today.getFullYear() - 1}-12-31`) },
  ];

  const label = useMemo(() => {
    if (!dateFrom && !dateTo) return "Все время";
    if (dateFrom && dateTo) return `${shortDate(dateFrom)} – ${shortDate(dateTo)}`;
    if (dateFrom) return `с ${shortDate(dateFrom)}`;
    return `до ${shortDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  const hasRange = dateFrom || dateTo;
  const inp = { padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "var(--font-sans)" };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, border: hasRange ? "0.5px solid #3b62d6" : "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "5px 12px", fontSize: 13, color: hasRange ? "#3b62d6" : "var(--color-text-secondary)", background: hasRange ? "var(--color-background-info)" : "var(--color-background-secondary)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 12 }}>❮</span>
        <span style={{ fontWeight: hasRange ? 500 : 400 }}>{label}</span>
        <span style={{ fontSize: 12 }}>❯</span>
        {hasRange && <span onClick={(e) => { e.stopPropagation(); clear(); }} style={{ marginLeft: 2, fontSize: 11, color: "#3b62d6", cursor: "pointer", opacity: 0.7 }} title="Сбросить">✕</span>}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 320, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Быстрый выбор</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {presets.map((p) => (
                <button key={p.label} onClick={p.action}
                  style={{ padding: "4px 10px", borderRadius: 20, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#3b62d6"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#3b62d6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.borderColor = "var(--color-border-secondary)"; }}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Произвольный период</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3 }}>С</div>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
              </div>
              <span style={{ color: "var(--color-text-tertiary)", marginTop: 14 }}>—</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3 }}>По</div>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => apply(from, to)} style={{ flex: 1, padding: "8px 0", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Применить</button>
              <button onClick={clear} style={{ padding: "8px 14px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>Сбросить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WalletDropdown ───────────────────────────────────────────────────────────
function WalletDropdown({ wallets, value, onChange, placeholder = "Выбрать счёт" }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState("");
  const ref             = useRef(null);
  const filtered        = wallets.filter((w) => w.name.toLowerCase().includes(q.toLowerCase()));
  const selected        = wallets.find((w) => w.id === value);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const inp = { width: "100%", boxSizing: "border-box", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", fontSize: 13, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", fontFamily: "var(--font-sans)" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-secondary)", fontSize: 14, color: selected ? "var(--color-text-primary)" : "var(--color-text-tertiary)", minHeight: 36 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.name : placeholder}
        </span>
        <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0, color: "var(--color-text-tertiary)" }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 600, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск счёта…" style={inp} />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <div onClick={() => { onChange(null); setOpen(false); setQ(""); }} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-tertiary)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>— Без счёта</div>
            {filtered.map((w) => (
              <div key={w.id} onClick={() => { onChange(w); setOpen(false); setQ(""); }}
                style={{ padding: "9px 14px", fontSize: 14, cursor: "pointer", background: w.id === value ? "var(--color-background-info)" : "transparent", color: w.id === value ? "var(--color-text-info)" : "var(--color-text-primary)" }}
                onMouseEnter={(e) => { if (w.id !== value) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { if (w.id !== value) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontWeight: 500 }}>{w.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 1 }}>{w.currency || "UZS"}</div>
              </div>
            ))}
            {!filtered.length && <div style={{ padding: "9px 14px", fontSize: 14, color: "var(--color-text-tertiary)" }}>Нет счетов</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BulkCategoryModal ────────────────────────────────────────────────────────
function BulkCategoryModal({ count, categories, onApply, onClose }) {
  const [cat, setCat] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 360, padding: "24px 24px 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Назначить статью ({count} оп.)</div>
        <Dropdown options={categories} value={cat} onChange={setCat} placeholder="Выбрать статью" />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => cat && onApply(cat)} disabled={!cat}
            style={{ flex: 1, padding: "9px 0", background: cat ? "#3b62d6" : "var(--color-background-secondary)", color: cat ? "#fff" : "var(--color-text-tertiary)", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: cat ? "pointer" : "default" }}>
            Применить
          </button>
          <button onClick={onClose} style={{ padding: "9px 16px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── SplitModal ───────────────────────────────────────────────────────────────
function SplitModal({ tx, categories, projects, onSave, onClose }) {
  const totalAbs = Math.abs(tx.amount);
  const isNeg    = tx.amount < 0;

  const [parts, setParts] = useState([
    { id: 1, category: tx.category || "", direction: tx.direction || "", amount: "" },
    { id: 2, category: "",                direction: "",                  amount: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const setPart = (id, k, v) =>
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, [k]: v } : p)));

  const addPart = () =>
    setParts((ps) => [...ps, { id: Date.now(), category: "", direction: "", amount: "" }]);

  const removePart = (id) => {
    if (parts.length <= 2) return;
    setParts((ps) => ps.filter((p) => p.id !== id));
  };

  const allocated = parts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = +(totalAbs - allocated).toFixed(2);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSave = async () => {
    if (parts.some((p) => !(parseFloat(p.amount) > 0))) {
      setErr("У каждой части должна быть сумма больше 0"); return;
    }
    if (Math.abs(remaining) > 0.01) {
      setErr(
        `Сумма частей (${allocated.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}) ` +
        `не равна итогу (${totalAbs.toLocaleString("ru-RU", { minimumFractionDigits: 2 })})`
      ); return;
    }
    setErr("");
    setSaving(true);
    try {
      const children = parts.map((p) => ({
        date:         tx._isoDate,
        amount:       isNeg ? -Math.abs(parseFloat(p.amount)) : Math.abs(parseFloat(p.amount)),
        counterparty: tx.counterparty || "",
        category:     p.category || "",
        direction:    p.direction || "",
        description:  tx.description || "",
        type:         tx.type,
        walletId:     tx.walletId || "",
        walletName:   tx.walletName || "",
        toWalletId:   tx.toWalletId || "",
        toWalletName: tx.toWalletName || "",
        source:       "split",
        parentId:     tx._docId,
        fileName:     "",
      }));
      await onSave(children);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)", fontSize: 13,
    background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
    outline: "none", fontFamily: "var(--font-sans)", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 600, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500 }}>Разбивка операции</div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 3 }}>
              {tx.counterparty || "Без контрагента"}
              {" · "}
              {tx._isoDate?.split("-").reverse().join(".")}
              {tx.walletName ? ` · ${tx.walletName}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid var(--color-border-tertiary)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Общая сумма операции</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Контрагент, счёт и дата наследуются всеми частями
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: isNeg ? "#A32D2D" : "#3B6D11" }}>
            {isNeg ? "−" : "+"} {totalAbs.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {parts.map((p, i) => (
            <div key={p.id} style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px", position: "relative", background: "var(--color-background-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Часть {i + 1}
                </div>
                {parts.length > 2 && (
                  <button onClick={() => removePart(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-text-danger)", padding: "2px 6px", lineHeight: 1 }}>
                    ✕ убрать
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Статья</div>
                  <Dropdown options={categories} value={p.category} onChange={(v) => setPart(p.id, "category", v)} placeholder="Выбрать статью" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Проект</div>
                  <Dropdown options={projects.map((pr) => pr.name)} value={p.direction} onChange={(v) => setPart(p.id, "direction", v)} placeholder="Выбрать проект" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Сумма</div>
                  <input type="number" value={p.amount} onChange={(e) => setPart(p.id, "amount", e.target.value)} placeholder="0.00" style={inp} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={addPart}
            style={{ padding: "7px 16px", border: "0.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "none", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Добавить часть
          </button>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: Math.abs(remaining) < 0.01 ? "#3B6D11" : remaining > 0 ? "#854F0B" : "#A32D2D",
            background: Math.abs(remaining) < 0.01 ? "#EAF3DE" : remaining > 0 ? "#FAEEDA" : "#FCEBEB",
            padding: "6px 12px", borderRadius: "var(--border-radius-md)",
          }}>
            {Math.abs(remaining) < 0.01
              ? "✓ Сумма совпадает"
              : remaining > 0
                ? `Осталось: ${remaining.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}`
                : `Превышение: ${Math.abs(remaining).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}`
            }
          </div>
        </div>

        {err && (
          <div style={{ padding: "8px 12px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, marginBottom: 14 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "10px 0", background: saving ? "#8ea4ea" : "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.75 : 1 }}>
            {saving ? "Сохранение…" : "Разбить операцию"}
          </button>
          <button onClick={onClose}
            style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TransactionModal ─────────────────────────────────────────────────────────
function TransactionModal({ tx, wallets, projects, categories, transactions, onSave, onDelete, onClose }) {
  const isEdit     = Boolean(tx);
  const isImported = tx?._source === "imported";
  const [saving, setSaving] = useState(false);

  // ── НОВОЕ: автоправила ──
  const [autoRules, setAutoRules] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(
      collection(db, "users", auth.currentUser.uid, "autoRules"),
      (snap) => setAutoRules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, []);

  const [form, setForm] = useState(() =>
    tx
      ? { ...tx, amount: Math.abs(tx.amount) }
      : {
          _isoDate: new Date().toISOString().slice(0, 10),
          walletId: "", walletName: "",
          toWalletId: "", toWalletName: "",
          counterparty: "", category: "",
          description: "", direction: "", amount: "", type: "expense",
        }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── НОВОЕ: применяем автоправила ──
  const applyRules = (counterparty, description, rules) => {
  const matched = rules.find((r) => {
    // если matchType не указан — считаем что это контрагент (обратная совместимость)
    const type = r.matchType || "counterparty";
    const val = type === "description"
      ? (description || "")
      : (counterparty || "");
    return r.contains && val.toLowerCase().includes(r.contains.toLowerCase());
  });
  if (matched) {
    if (matched.category) set("category", matched.category);
    if (matched.direction) set("direction", matched.direction);
  }
};

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

  const handleWalletChange = (wallet) => { set("walletId", wallet?.id || ""); set("walletName", wallet?.name || ""); };
  const handleToWalletChange = (wallet) => { set("toWalletId", wallet?.id || ""); set("toWalletName", wallet?.name || ""); };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const amount = parseFloat(form.amount) || 0;
      const signed = form.type === "expense" ? -Math.abs(amount) : Math.abs(amount);
      await onSave({ ...form, amount: signed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 500, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{isEdit ? "Редактировать операцию" : "Новая операция"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {isImported && (
          <div style={{ marginBottom: 14, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
            📄 <strong>{tx.fileName}</strong>{tx.walletName ? ` · Счёт: ${tx.walletName}` : ""}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["expense","↓ Списание"],["income","↑ Поступление"],["transfer","⇄ Перевод"]].map(([t, label]) => (
            <button key={t} onClick={() => set("type", t)}
              style={{ flex: 1, padding: "8px 0", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, fontWeight: form.type === t ? 500 : 400, background: form.type === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: form.type === t ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Дата</div>
          <input type="date" value={form._isoDate} onChange={(e) => set("_isoDate", e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Сумма</div>
          <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" style={inp} />
        </div>

        {/* ── ИЗМЕНЕНО: onChange контрагента ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Контрагент</div>
          <CounterpartyDropdown
            value={form.counterparty}
            onChange={(v) => {
              set("counterparty", v);
              applyRules(v, form.description, autoRules);
            }}
            transactions={transactions}
          />
        </div>

        {form.type === "transfer" ? (
          <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Счёт списания</div>
              {isImported
                ? <div style={{ ...inp, background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", cursor: "not-allowed", display: "flex", alignItems: "center" }}>{tx.walletName || "—"}</div>
                : <WalletDropdown wallets={wallets} value={form.walletId} onChange={handleWalletChange} placeholder="Откуда" />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Счёт зачисления</div>
              <WalletDropdown wallets={wallets} value={form.toWalletId} onChange={handleToWalletChange} placeholder="Куда" />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Счёт</div>
            {isImported
              ? <div style={{ ...inp, background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)", cursor: "not-allowed", display: "flex", alignItems: "center" }}>{tx.walletName || "—"}</div>
              : <WalletDropdown wallets={wallets} value={form.walletId} onChange={handleWalletChange} />
            }
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            Статья
            {categories.length === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "#A32D2D" }}>⚠ нет статей в базе</span>}
          </div>
          <Dropdown options={categories} value={form.category} onChange={(v) => set("category", v)} placeholder="Выбрать статью" />
        </div>

        {/* ── ИЗМЕНЕНО: onChange описания ── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Описание</div>
          <input
            value={form.description}
            onChange={(e) => {
              set("description", e.target.value);
              applyRules(form.counterparty, e.target.value, autoRules);
            }}
            placeholder="Описание"
            style={inp}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Проект</div>
          <Dropdown options={projects.map((p) => p.name)} value={form.direction} onChange={(v) => set("direction", v)} placeholder="Выбрать проект" />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "10px 0", background: saving ? "#8ea4ea" : "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Добавить"}
          </button>
          <button onClick={onClose}
            style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}>
            Отмена
          </button>
          {isEdit && (
            <button onClick={() => onDelete(tx.id)}
              style={{ padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)" }}>
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FilterModal ──────────────────────────────────────────────────────────────
const EMPTY_FILTERS = {
  type: "all", amountFrom: "", amountTo: "", category: "",
  counterparty: "", account: "", direction: "", description: "",
  dateFrom: "", dateTo: "",
};

function FilterModal({ filters, allCounterparties, allAccounts, projects, categories, onApply, onClose }) {
  const [f, setF] = useState(filters);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = { flex: 1, padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-sans)" };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "24px 28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 500 }}>Фильтр</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["all","Все"],["expense","Списания"],["income","Поступления"],["transfer","Переводы"]].map(([t, label]) => (
            <button key={t} onClick={() => set("type", t)}
              style={{ flex: 1, padding: "7px 0", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", fontSize: 13, background: f.type === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: f.type === t ? "var(--color-text-info)" : "var(--color-text-secondary)", fontWeight: f.type === t ? 500 : 400 }}>
              {label}
            </button>
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
          ["Контрагент", <Dropdown key="cp"  options={allCounterparties} value={f.counterparty} onChange={(v) => set("counterparty", v)} placeholder="Выбрать" />],
          ["Счёт",       <Dropdown key="acc" options={allAccounts} value={f.account} onChange={(v) => set("account", v)} placeholder="Выбрать" />],
          ["Проект",     <Dropdown key="dir" options={projects.map((p) => p.name)} value={f.direction} onChange={(v) => set("direction", v)} placeholder="Выбрать проект" />],
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
          <button onClick={() => onApply(f)}
            style={{ padding: "10px 24px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Применить
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Закрыть</button>
          <button onClick={() => { onApply({ ...EMPTY_FILTERS }); }} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)" }}>Очистить</button>
        </div>
      </div>
    </div>
  );
}

function AutoRulesTab({ categories, projects }) {
  const [rules, setRules] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ 
    matchType: "counterparty", // "counterparty" | "description"
    contains: "", category: "", direction: "" 
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(
      collection(db, "users", auth.currentUser.uid, "autoRules"),
      (snap) => setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, []);

  const addRule = async () => {
    if (!draft.contains.trim()) return;
    try {
      await addDoc(
        collection(db, "users", auth.currentUser.uid, "autoRules"),
        { 
          matchType: draft.matchType,
          contains: draft.contains.trim(), 
          category: draft.category || "", 
          direction: draft.direction || "" 
        }
      );
    } catch (e) {
      console.error("Ошибка сохранения правила:", e);
    }
    setDraft({ matchType: "counterparty", contains: "", category: "", direction: "" });
    setAdding(false);
  };

  const removeRule = async (id) => {
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "autoRules", id));
    } catch (e) {
      console.error("Ошибка удаления правила:", e);
    }
  };

  return (
    <div style={{ padding: "24px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Автоправила</div>
          <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 2 }}>
            Автоматически назначают статью и проект по контрагенту или описанию
          </div>
        </div>
        <button onClick={() => setAdding(true)} style={{ padding: "7px 16px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ Добавить правило</button>
      </div>

      {adding && (
        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: 16, marginBottom: 16 }}>
          
          {/* Тип критерия */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 6 }}>Критерий поиска</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["counterparty", "По контрагенту"], ["description", "По описанию"]].map(([val, label]) => (
                <button key={val} onClick={() => setDraft((d) => ({ ...d, matchType: val }))}
                  style={{ padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", fontWeight: draft.matchType === val ? 500 : 400, background: draft.matchType === val ? "var(--color-background-info)" : "var(--color-background-primary)", color: draft.matchType === val ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                {draft.matchType === "counterparty" ? "Если контрагент содержит" : "Если описание содержит"}
              </div>
              <input value={draft.contains} onChange={(e) => setDraft((d) => ({ ...d, contains: e.target.value }))}
                placeholder={draft.matchType === "counterparty" ? "ООО Ромашка…" : "Аренда офиса…"}
                style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Назначить статью</div>
              <Dropdown options={categories} value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} placeholder="Выбрать" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Назначить проект</div>
              <Dropdown options={projects.map((p) => p.name)} value={draft.direction} onChange={(v) => setDraft((d) => ({ ...d, direction: v }))} placeholder="Выбрать" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addRule} style={{ padding: "7px 16px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer" }}>Сохранить</button>
            <button onClick={() => setAdding(false)} style={{ padding: "7px 12px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>Отмена</button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          Нет правил. Добавьте первое правило чтобы автоматически категоризировать операции.
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
          {rules.map((r, i) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr auto", gap: 12, padding: "12px 16px", borderBottom: i < rules.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
              {/* Тип критерия — бейдж */}
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", background: r.matchType === "description" ? "#FAEEDA" : "#E6F1FB", color: r.matchType === "description" ? "#854F0B" : "#185FA5", fontWeight: 500 }}>
                {r.matchType === "description" ? "описание" : "контрагент"}
              </span>
              <div><span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>содержит</span><div style={{ fontSize: 14, fontWeight: 500 }}>«{r.contains}»</div></div>
              <div><span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>статья</span><div style={{ fontSize: 13 }}>{r.category || "—"}</div></div>
              <div><span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>проект</span><div style={{ fontSize: 13 }}>{r.direction || "—"}</div></div>
              <button onClick={() => removeRule(r.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)", fontSize: 14, padding: "4px 8px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column widths ─────────────────────────────────────────────────────────────
const COL_HDR  = { padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" };
const GRID     = "32px 32px 110px 1fr 160px 140px 130px 110px 80px";

// ─── ChildRows — анимированные дочерние строки ────────────────────────────────
function ChildRows({ parentDocId, transactions }) {
  const children = transactions.filter((t) => t.parentId === parentDocId && t._source === "split");
  if (!children.length) return null;

  return (
    <>
      {children.map((child, idx) => {
        const isLast = idx === children.length - 1;
        const isPos  = child.amount >= 0;
        return (
          <div key={child.id}
            style={{
              display: "grid", gridTemplateColumns: GRID, padding: "0 16px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              background: "rgba(59,98,214,0.03)",
              alignItems: "center",
              borderLeft: "2px solid #3b62d6",
            }}
          >
            {/* checkbox пустой */}
            <div />

            {/* иконка ветки */}
            <div style={{ padding: "8px 0", paddingLeft: 2 }}>
              <span style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>
                {isLast ? "└─" : "├─"}
              </span>
            </div>

            {/* дата */}
            <div style={{ padding: "8px 8px", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {child._isoDate?.split("-").reverse().join(".")}
            </div>

            {/* контрагент / детали */}
            <div style={{ padding: "8px 8px" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>⤷ часть разбивки</div>
              {child.description && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>{child.description}</div>
              )}
            </div>

            {/* статья */}
            <div style={{ padding: "8px 8px" }}>
              {child.category
                ? <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{child.category}</span>
                : <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>—</span>
              }
            </div>

            {/* проект */}
            <div style={{ padding: "8px 8px" }}>
              <ProjectPill value={child.direction} />
            </div>

            {/* счёт */}
            <div style={{ padding: "8px 8px", fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {child.walletName || "—"}
            </div>

            {/* сумма */}
            <div style={{ padding: "8px 8px", textAlign: "right", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", color: isPos ? "#3B6D11" : "#A32D2D" }}>
              {fmtSigned(child.amount)}
            </div>

            {/* тип */}
            <div style={{ padding: "8px 8px", textAlign: "center" }}>
              <TypeIcon type={child.type} size={13} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OperationsPage() {
  const {
  transactions, allTransactions, accounts: wallets, projects, categories,
  loading, error: storeError, refresh,
} = useAppStore();

  const [localError,   setLocalError]   = useState("");
  const [filters,      setFilters]      = useState({ ...EMPTY_FILTERS });
  const [activeTab,    setActiveTab]    = useState("all");
  const [activeTopTab, setActiveTopTab] = useState("operations");
  const [showFilter,   setShowFilter]   = useState(false);
  const [modal,        setModal]        = useState(null);
  const [splitModal,   setSplitModal]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState(new Set());
  const [bulkModal,    setBulkModal]    = useState(false);

  // ── НОВОЕ: state для раскрытых accordion-строк ────────────────────────────
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tableRef = useRef(null);
  const error = localError || storeError || "";

  useEffect(() => {
    const h = (e) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !modal && !showFilter && !splitModal) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        setModal({ mode: "add" });
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [modal, showFilter, splitModal]);

  const handleDateRangeChange = (from, to) => {
    setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
  };

  const allCounterparties = useMemo(() =>
    [...new Set(transactions.map((t) => t.counterparty).filter(Boolean))].sort(),
    [transactions]
  );
  const allAccounts = useMemo(() =>
    [...new Set(transactions.map((t) => t.walletName).filter(Boolean))].sort(),
    [transactions]
  );

  const filtered = useMemo(() => transactions.filter((tx) => {
    // ── НОВОЕ: дочерние строки не показываем в основном списке ──
    if (tx._source === "split") return false;
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

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const totalIncome  = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const balance      = totalIncome - totalExpense;
  const hasFilters   = Object.entries(filters).some(([k, v]) => k === "type" ? v !== "all" : Boolean(v));

  const allFilteredIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allFilteredIds));
  };
  const toggleOne = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveTx = async (tx) => {
    try {
      if (tx._docId) {
        await updateDoc(userDoc("transactions", tx._docId), {
          date: tx._isoDate, amount: tx.amount,
          counterparty: tx.counterparty, category: tx.category,
          description: tx.description, direction: tx.direction,
          type: tx.type, walletId: tx.walletId || "", walletName: tx.walletName || "",
          toWalletId: tx.toWalletId || "", toWalletName: tx.toWalletName || "",
        });
        store.updateTransaction(tx.id, { ...tx, _isoDate: normalizeDate(tx._isoDate) });
      } else {
        const docData = {
          date: tx._isoDate, amount: tx.amount,
          counterparty: tx.counterparty, category: tx.category,
          description: tx.description, direction: tx.direction,
          type: tx.type, walletId: tx.walletId || "", walletName: tx.walletName || "",
          toWalletId: tx.toWalletId || "", toWalletName: tx.toWalletName || "",
          source: "manual", fileName: "", createdAt: serverTimestamp(),
        };
        const ref = await addDoc(userCol("transactions"), docData);
        store.addTransaction({ ...docData, id: ref.id, _docId: ref.id, _isoDate: normalizeDate(tx._isoDate), _source: "manual" });
      }
    } catch (e) {
      setLocalError("Ошибка сохранения: " + e.message);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    try {
      await deleteDoc(userDoc("transactions", tx._docId));
      store.deleteTransaction(id);
    } catch (e) {
      setLocalError("Ошибка удаления: " + e.message);
    }
    setModal(null);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Удалить ${selected.size} операций?`)) return;
    const toDelete = [...selected];
    for (const id of toDelete) {
      const tx = transactions.find((t) => t.id === id);
      if (!tx) continue;
      try {
        await deleteDoc(userDoc("transactions", tx._docId));
        store.deleteTransaction(id);
      } catch (e) {
        setLocalError("Ошибка удаления: " + e.message);
      }
    }
    setSelected(new Set());
  };

  const handleBulkCategory = async (category) => {
    const toUpdate = [...selected];
    for (const id of toUpdate) {
      const tx = transactions.find((t) => t.id === id);
      if (!tx?._docId) continue;
      try {
        await updateDoc(userDoc("transactions", tx._docId), { category });
        store.updateTransaction(id, { category });
      } catch (e) {
        setLocalError("Ошибка: " + e.message);
      }
    }
    setBulkModal(false);
    setSelected(new Set());
  };

  const handleDuplicate = async (tx) => {
    const docData = {
      date: tx._isoDate, amount: tx.amount,
      counterparty: tx.counterparty, category: tx.category,
      description: tx.description, direction: tx.direction,
      type: tx.type, walletId: tx.walletId || "", walletName: tx.walletName || "",
      toWalletId: tx.toWalletId || "", toWalletName: tx.toWalletName || "",
      source: "manual", fileName: "", createdAt: serverTimestamp(),
    };
    try {
      const ref = await addDoc(userCol("transactions"), docData);
      store.addTransaction({ ...docData, id: ref.id, _docId: ref.id, _isoDate: normalizeDate(tx._isoDate), _source: "manual" });
    } catch (e) {
      setLocalError("Ошибка дублирования: " + e.message);
    }
  };

  const handleSplit = async (children) => {
    const parent = splitModal;
    try {
      for (const child of children) {
        const docData = { ...child, createdAt: serverTimestamp() };
        const ref = await addDoc(userCol("transactions"), docData);
        store.addTransaction({ ...docData, id: ref.id, _docId: ref.id, _isoDate: normalizeDate(child.date), _source: "split" });
      }
      if (parent?._docId) {
        await updateDoc(userDoc("transactions", parent._docId), { isSplit: true });
        store.updateTransaction(parent.id, { isSplit: true });
      }
      // Автоматически раскрыть после разбивки
      setExpandedRows((prev) => new Set([...prev, parent.id]));
    } catch (e) {
      setLocalError("Ошибка разбивки: " + e.message);
    }
    setSplitModal(null);
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "100%", overflow: "hidden", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", display: "flex", flexDirection: "column" }}>

      {modal && (
        <TransactionModal tx={modal.tx} wallets={wallets} projects={projects} categories={categories} transactions={transactions} onSave={handleSaveTx} onDelete={handleDelete} onClose={() => setModal(null)} />
      )}
      {splitModal && (
        <SplitModal tx={splitModal} categories={categories} projects={projects} onSave={handleSplit} onClose={() => setSplitModal(null)} />
      )}
      {showFilter && (
        <FilterModal filters={filters} allCounterparties={allCounterparties} allAccounts={allAccounts} projects={projects} categories={categories} onApply={(f) => { setFilters(f); setShowFilter(false); }} onClose={() => setShowFilter(false)} />
      )}
      {bulkModal && (
        <BulkCategoryModal count={selected.size} categories={categories} onApply={handleBulkCategory} onClose={() => setBulkModal(false)} />
      )}

      {/* ── HEADER (не sticky — просто flexShrink: 0) ── */}
      <div style={{ flexShrink: 0, zIndex: 200, background: "var(--color-background-primary)" }}>

        <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Операции</h1>
              <button onClick={refresh} title="Обновить" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 15, padding: 4, lineHeight: 1 }}>↻</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg style={{ position: "absolute", left: 8, pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск…"
                  style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180 }} />
              </div>

              <button onClick={() => setShowFilter(true)}
                style={{ padding: "6px 12px", border: hasFilters ? "1px solid #3b62d6" : "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: hasFilters ? "var(--color-background-info)" : "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: hasFilters ? "var(--color-text-info)" : "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M5 8h6M7 12h2"/></svg>
                Фильтр{hasFilters ? " ●" : ""}
              </button>
              {hasFilters && (
                <button onClick={() => setFilters({ ...EMPTY_FILTERS })} style={{ fontSize: 12, color: "var(--color-text-danger)", background: "none", border: "none", cursor: "pointer" }}>✕ Сбросить</button>
              )}

              <button onClick={() => exportToCSV(filtered)}
                style={{ padding: "6px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v8M5 7l3 3 3-3M3 12h10"/></svg>
                CSV
              </button>

              <button onClick={() => setModal({ mode: "add" })}
                style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#3b62d6", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                + Добавить
              </button>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }} title="N — новая операция">N</span>
            </div>
          </div>

          <div style={{ display: "flex" }}>
            {[["operations","Операции"],["autorules","Автоправила"]].map(([key, label]) => (
              <div key={key} onClick={() => setActiveTopTab(key)}
                style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer", borderBottom: activeTopTab === key ? "2px solid #3b62d6" : "2px solid transparent", color: activeTopTab === key ? "#3b62d6" : "var(--color-text-secondary)", fontWeight: activeTopTab === key ? 500 : 400 }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {activeTopTab === "operations" && (
          <>
            {error && (
              <div style={{ margin: "0 24px", padding: "8px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {error}
                <button onClick={() => setLocalError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
              </div>
            )}

            <div style={{ background: "var(--color-background-primary)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <DateRangePicker dateFrom={filters.dateFrom} dateTo={filters.dateTo} onChange={handleDateRangeChange} />
              {[["all","Все"],["expense","Списания"],["income","Поступления"],["transfer","Переводы"]].map(([t, label]) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", background: activeTab === t ? "var(--color-background-info)" : "var(--color-background-secondary)", color: activeTab === t ? "var(--color-text-info)" : "var(--color-text-secondary)", fontWeight: activeTab === t ? 500 : 400 }}>
                  {label}
                </button>
              ))}
              <button style={{ padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
                Без статьи ({transactions.filter((t) => !t.category && t._source !== "split").length})
              </button>
            </div>

            <div style={{ background: "var(--color-background-primary)", padding: "8px 24px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 8 }}>
              {[
                { label: "Поступления", value: totalIncome,  color: "#3B6D11", show: filtered.some(t => t.type === "income") },
                { label: "Списания",    value: totalExpense, color: "#A32D2D", show: filtered.some(t => t.type === "expense") },
                { label: "Сальдо",      value: balance,      color: balance >= 0 ? "#3B6D11" : "#A32D2D", show: filtered.length > 0 },
                { label: "Операций",    value: null,         color: "var(--color-text-secondary)", show: true, plain: filtered.length || "—" },
              ].map(({ label, value, color, show, plain }) => (
                <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "7px 14px", flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    {plain !== undefined
                      ? <span style={{ color }}>{plain}</span>
                      : show
                        ? <AnimatedNumber value={value} color={color} />
                        : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                    }
                  </div>
                </div>
              ))}
            </div>

            {selected.size > 0 && (
              <div style={{ background: "#3b62d6", padding: "8px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Выбрано: {selected.size}</span>
                <button onClick={() => setBulkModal(true)} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 13, cursor: "pointer" }}>Назначить статью</button>
                <button onClick={handleBulkDelete} style={{ padding: "5px 12px", background: "rgba(255,100,100,0.25)", border: "none", borderRadius: "var(--border-radius-md)", color: "#fff", fontSize: 13, cursor: "pointer" }}>Удалить выбранные</button>
                <button onClick={() => setSelected(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>Снять выделение</button>
              </div>
            )}

            <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ minWidth: 960, display: "grid", gridTemplateColumns: GRID, padding: "0 16px" }}>
                <div style={{ ...COL_HDR, display: "flex", alignItems: "center" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </div>
                <div style={COL_HDR} />
                {["Дата","Контрагент / Детали","Статья","Проект","Счёт","Сумма","Тип"].map((h, i) => (
                  <div key={h} style={{ ...COL_HDR, textAlign: i === 5 ? "right" : i === 6 ? "center" : "left" }}>{h}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto" }} ref={tableRef}>
        {activeTopTab === "autorules" ? (
          <AutoRulesTab categories={categories} projects={projects} />
        ) : (
          <div style={{ background: "var(--color-background-primary)" }}>
            <div style={{ minWidth: 960 }}>

              {loading && (
                <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
                  Загрузка операций…
                </div>
              )}

              {!loading && grouped.length === 0 && (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                    {transactions.length === 0 ? "Нет операций. Нажмите + Добавить или клавишу N" : "Нет операций по выбранным фильтрам"}
                  </div>
                  {(hasFilters || search) && (
                    <button onClick={() => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); }}
                      style={{ marginTop: 12, padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}>
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              )}

              {!loading && grouped.map(([date, txs]) => (
                <div key={date}>
                  <div style={{ padding: "5px 16px 5px 88px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                    <span>{formatDateLabel(date)}</span>
                    <span>{txs.length} операций</span>
                  </div>

                  {txs.map((tx) => {
                    const [avatarBg, avatarColor] = getAvatarStyle(tx.counterparty);
                    const isPos      = tx.amount >= 0;
                    const isChecked  = selected.has(tx.id);
                    const isSplit    = tx.isSplit;
                    const isExpanded = expandedRows.has(tx.id);

                    return (
                      <div key={tx.id}>
                        {/* ── Родительская строка ── */}
                        <div
                          className="row-grid"
style={{
  display: "grid", gridTemplateColumns: GRID, padding: "0 16px",
  borderBottom: "0.5px solid var(--color-border-tertiary)",
  background: isChecked ? "var(--color-background-info)" : "transparent",
  alignItems: "center", position: "relative",
  transition: "background 0.1s, padding-right 0.15s",
  borderLeft: isSplit && isExpanded ? "2px solid #3b62d6" : "2px solid transparent",
}}
                          onMouseEnter={(e) => {
  if (!isChecked) e.currentTarget.style.background = "var(--color-background-secondary)";
  e.currentTarget.querySelector(".row-actions").style.opacity = "1";
  e.currentTarget.style.paddingRight = "110px";
}}
onMouseLeave={(e) => {
  if (!isChecked) e.currentTarget.style.background = isSplit && isExpanded ? "var(--color-background-secondary)" : "transparent";
  e.currentTarget.querySelector(".row-actions").style.opacity = "0";
  e.currentTarget.style.paddingRight = "16px";
}}
                        >
                          <div style={{ padding: "10px 0", display: "flex", alignItems: "center" }}>
                            <input type="checkbox" checked={isChecked} onChange={() => toggleOne(tx.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer" }} />
                          </div>

                          <div style={{ padding: "10px 0" }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 500 }}>
                              {initials(tx.counterparty)}
                            </div>
                          </div>

                          <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            {date.split("-").reverse().join(".")}
                          </div>

                          <div style={{ padding: "10px 8px", overflow: "hidden", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: tx.counterparty ? 500 : 400, color: tx.counterparty ? "var(--color-text-primary)" : "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {tx.counterparty || "—"}
                              </span>
                              {/* ── НОВОЕ: кликабельный бейдж "разбита ▾/▴" ── */}
                              {isSplit && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(tx.id); }}
                                  style={{ flexShrink: 0, fontSize: 10, color: "#185FA5", background: "#E6F1FB", borderRadius: 10, padding: "1px 7px", fontWeight: 500, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                                >
                                  разбита {isExpanded ? "▴" : "▾"}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {tx.description || (
                                tx.type === "transfer" ? `${tx.walletName} → ${tx.toWalletName}`
                                : tx._source === "manual" ? "Ручная операция"
                                : tx.fileName ? `📄 ${tx.fileName}`
                                : ""
                              )}
                            </div>
                          </div>

                          <div style={{ padding: "10px 8px", overflow: "hidden", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            {tx.category
                              ? <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.category}</span>
                              : <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>—</span>
                            }
                          </div>

                          <div style={{ padding: "10px 8px", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            <ProjectPill value={tx.direction} />
                          </div>

                          <div style={{ padding: "10px 8px", fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            {tx.walletName || "—"}
                          </div>

                          <div style={{ padding: "10px 8px", textAlign: "right", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", color: tx.type === "transfer" ? "#0C447C" : isPos ? "#3B6D11" : "#A32D2D", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            {tx.type === "transfer" ? fmt(tx.amount) : fmtSigned(tx.amount)}
                          </div>

                          <div style={{ padding: "10px 8px", textAlign: "center", cursor: "pointer" }} onClick={() => setModal({ mode: "edit", tx })}>
                            <TypeIcon type={tx.type} />
                          </div>

                          {/* Row actions */}
                          <div className="row-actions"
                            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "2px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                            <button title="Редактировать" onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", tx }); }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                            <button title="Разбить операцию" onClick={(e) => { e.stopPropagation(); setSplitModal(tx); }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--color-text-secondary)" }}>⊕</button>
                            <button title="Удалить" onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--color-text-danger)" }}>🗑</button>
                          </div>
                        </div>

                        {/* ── НОВОЕ: дочерние строки — показываем только если раскрыто ── */}
                        {isSplit && isExpanded && (
  <ChildRows parentDocId={tx._docId} transactions={allTransactions} />
)}
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
                  <span style={{ marginLeft: "auto", color: "var(--color-text-tertiary)" }}>Всего: {filtered.length} операций</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SalaryStatement.jsx — Расчётные ведомости (токены CashFlow)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useMemo } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, cur = "UZS") =>
  cur === "USD"
    ? "$" + Number(n || 0).toLocaleString("en-US")
    : Number(n || 0).toLocaleString("ru-RU") + " so'm";

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("ru-RU") : "—");

const MONTH_NAMES = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

function workingDays(year, month) {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const w = new Date(year, month - 1, d).getDay();
    if (w !== 0 && w !== 6) count++;
  }
  return count;
}

function calc(emp, input, wdim) {
  const {
    workedDays = wdim, workedHours = 0,
    sickDays = 0, vacationDays = 0, absentDays = 0,
    bonus = 0, premium = 0, allowance = 0,
    penalty = 0, advance = 0, otherDed = 0,
  } = input;

  let salaryPeriod = emp.baseSalary || 0;
  if (emp.salaryType === "salary") {
    const effective = Math.max(0, workedDays + sickDays + vacationDays - absentDays);
    salaryPeriod = wdim > 0 ? (emp.baseSalary / wdim) * effective : 0;
  } else if (emp.salaryType === "hourly") {
    salaryPeriod = (emp.baseSalary || 0) * workedHours;
  }

  const totalEarnings = salaryPeriod + Number(bonus) + Number(premium) + Number(allowance);
  const taxDed = totalEarnings * ((emp.taxRate || 0) / 100);
  const totalDed = taxDed + Number(penalty) + Number(advance) + Number(otherDed);
  const netPay = totalEarnings - totalDed;

  return {
    salaryPeriod: Math.round(salaryPeriod),
    totalEarnings: Math.round(totalEarnings),
    taxDed: Math.round(taxDed),
    totalDed: Math.round(totalDed),
    netPay: Math.round(netPay),
  };
}

// ─── Design tokens (из CashFlow) ──────────────────────────────────────────────
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

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
const baseInp = {
  padding: "5px 8px", border: `0.5px solid ${C.borderMid}`,
  borderRadius: 4, fontSize: 12, width: "100%",
  boxSizing: "border-box", background: C.surface,
  color: C.ink, outline: "none", fontFamily: "inherit",
};
const Inp = (p) => <input style={baseInp} {...p} />;

const Num = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 10, color: C.inkLight, marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    <input type="number" min={0} value={value}
      onChange={(e) => onChange(Number(e.target.value))} style={baseInp} />
  </div>
);

const Btn = ({ children, variant = "primary", small, disabled, ...p }) => {
  const styles = {
    primary:   { bg: C.accent,      color: "#fff",     border: C.accent },
    secondary: { bg: "transparent", color: C.inkMid,   border: C.border },
    danger:    { bg: "transparent", color: C.neg,      border: "#fca5a5" },
    ghost:     { bg: "transparent", color: C.inkLight, border: "transparent" },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button disabled={disabled} style={{
      padding: small ? "4px 10px" : "6px 13px",
      background: disabled ? C.border : s.bg,
      color: disabled ? C.inkLight : s.color,
      border: `1px solid ${disabled ? C.border : s.border}`,
      borderRadius: 5, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? 11 : 12, fontWeight: 500, fontFamily: "inherit",
      whiteSpace: "nowrap",
    }} {...p}>{children}</button>
  );
};

const SumRow = ({ label, value, cur, bold, sign }) => {
  const color = sign === "+" ? C.pos : sign === "-" ? C.neg : C.ink;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.inkLight, fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: bold ? 700 : 400, color, fontVariantNumeric: "tabular-nums" }}>
        {sign === "-" ? "−" : sign === "+" ? "+" : ""}{fmt(value, cur)}
      </span>
    </div>
  );
};

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, pos, neg }) {
  return (
    <div style={{ background: C.surface, padding: "12px 16px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 400, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 400, color: pos ? C.pos : neg ? C.neg : C.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
        {value}
      </div>
    </div>
  );
}

// ─── CalcForm ─────────────────────────────────────────────────────────────────
function CalcForm({ emp, existingRecord, payrollId, wdim, uid, onSaved, onClose }) {
  const ex = existingRecord || {};
  const [d, setD] = useState({
    workedDays: ex.workedDays ?? wdim, workedHours: ex.workedHours ?? 0,
    sickDays: ex.sickDays ?? 0, vacationDays: ex.vacationDays ?? 0, absentDays: ex.absentDays ?? 0,
    bonus: ex.bonus ?? 0, premium: ex.premium ?? 0, allowance: ex.allowance ?? 0,
    penalty: ex.penalty ?? 0, advance: ex.advance ?? 0, otherDed: ex.otherDed ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setD((s) => ({ ...s, [k]: v }));
  const res = calc(emp, d, wdim);

  async function save() {
    if (!uid) return;
    setSaving(true);
    const payload = {
      ...d, ...res,
      employeeId: emp.id, employeeName: emp.fullName,
      position: emp.position || "", department: emp.department || "",
      currency: emp.currency || "UZS", baseSalary: emp.baseSalary || 0,
      taxRate: emp.taxRate || 0, payrollId,
      updatedAt: new Date().toISOString(),
    };
    const col = collection(db, "users", uid, "payrollRecords");
    if (ex.id) await updateDoc(doc(db, "users", uid, "payrollRecords", ex.id), payload);
    else await addDoc(col, { ...payload, createdAt: new Date().toISOString() });
    setSaving(false);
    onSaved();
  }

  const SL = ({ children }) => (
    <div style={{ fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.1em", margin: "12px 0 6px" }}>{children}</div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        {emp.fullName} · {emp.position || "—"} · <span style={{ fontFamily: "monospace" }}>{fmt(emp.baseSalary, emp.currency)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <SL>Отработано</SL>
          <Num label={`Рабочих дней (норма: ${wdim})`} value={d.workedDays} onChange={set("workedDays")} />
          {emp.salaryType === "hourly" && <Num label="Часов" value={d.workedHours} onChange={set("workedHours")} />}
          <Num label="Больничных дней" value={d.sickDays} onChange={set("sickDays")} />
          <Num label="Дней отпуска" value={d.vacationDays} onChange={set("vacationDays")} />
          <Num label="Прогулов (дней)" value={d.absentDays} onChange={set("absentDays")} />
          <SL>Надбавки</SL>
          <Num label="Бонус" value={d.bonus} onChange={set("bonus")} />
          <Num label="Премия" value={d.premium} onChange={set("premium")} />
          <Num label="Надбавка" value={d.allowance} onChange={set("allowance")} />
          <SL>Удержания</SL>
          <Num label="Штраф" value={d.penalty} onChange={set("penalty")} />
          <Num label="Аванс" value={d.advance} onChange={set("advance")} />
          <Num label="Прочие удержания" value={d.otherDed} onChange={set("otherDed")} />
        </div>
        <div>
          <SL>Расчёт</SL>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, background: C.surfaceAlt }}>
            <SumRow label="Оклад за период" value={res.salaryPeriod} cur={emp.currency} />
            <SumRow label="Бонус + Премия + Надбавка" value={Number(d.bonus)+Number(d.premium)+Number(d.allowance)} cur={emp.currency} sign="+" />
            <SumRow label="Итого начислено" value={res.totalEarnings} cur={emp.currency} bold />
            <div style={{ height: 1, background: C.border, margin: "6px 0" }} />
            <SumRow label={`Налог ${emp.taxRate || 0}%`} value={res.taxDed} cur={emp.currency} sign="-" />
            <SumRow label="Штраф + Аванс + Прочие" value={Number(d.penalty)+Number(d.advance)+Number(d.otherDed)} cur={emp.currency} sign="-" />
            <SumRow label="Итого удержано" value={res.totalDed} cur={emp.currency} bold sign="-" />
            <div style={{ height: 1, background: C.border, margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>К выплате</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: C.pos, fontVariantNumeric: "tabular-nums" }}>
                +{fmt(res.netPay, emp.currency)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Сохранение..." : "Сохранить"}</Btn>
            <Btn variant="secondary" onClick={onClose}>Закрыть</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TransactionForm ──────────────────────────────────────────────────────────
function TransactionForm({ payrollId, employeeId, employeeName, currency, uid, onSaved, onClose }) {
  const [amount, setAmount] = useState("");
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount) return alert("Введите сумму");
    if (!uid) return;
    setSaving(true);
    await addDoc(collection(db, "users", uid, "transactions"), {
      payrollId, employeeId, employeeName, currency,
      amount: Number(amount), date, method, note,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  const FL = ({ children }) => (
    <div style={{ fontSize: 9, color: C.inkLight, marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{children}</div>
  );

  return (
    <div style={{ minWidth: 300 }}>
      <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>{employeeName}</div>
      <div style={{ marginBottom: 10 }}><FL>Сумма ({currency})</FL><Inp type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={0} autoFocus /></div>
      <div style={{ marginBottom: 10 }}><FL>Дата оплаты</FL><Inp type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div style={{ marginBottom: 10 }}>
        <FL>Метод</FL>
        <select value={method} onChange={(e) => setMethod(e.target.value)} style={baseInp}>
          <option value="bank">Банк / перевод</option>
          <option value="cash">Наличные</option>
          <option value="card">Карта</option>
        </select>
      </div>
      <div style={{ marginBottom: 14 }}><FL>Примечание</FL><Inp value={note} onChange={(e) => setNote(e.target.value)} placeholder="Аванс, зарплата за март..." /></div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "..." : "Сохранить"}</Btn>
        <Btn variant="secondary" onClick={onClose}>Отмена</Btn>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, title, onClose, wide }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "40px 16px", zIndex: 1000, overflowY: "auto",
    }}>
      <div style={{
        background: C.surface, borderRadius: 10, padding: 22,
        width: "100%", maxWidth: wide ? 780 : 460,
        border: `1px solid ${C.border}`, position: "relative",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", fontSize: 16, cursor: "pointer", color: C.inkLight }}>✕</button>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ paid, netPay }) {
  if (!netPay) return <span style={{ color: C.inkLight, fontSize: 11 }}>—</span>;
  const { label, color, bg } =
    paid >= netPay ? { label: "Оплачено",    color: C.pos,    bg: C.posBg }
    : paid > 0     ? { label: "Частично",    color: "#a16207", bg: "#fef9c3" }
    :                { label: "Не оплачено", color: C.neg,    bg: C.negBg };
  return (
    <span style={{ fontSize: 11, fontWeight: 500, color, background: bg, padding: "2px 8px", borderRadius: 4 }}>
      {label}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SalaryStatement() {
  const now = new Date();
  const [uid, setUid]   = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [employees, setEmployees]       = useState([]);
  const [records, setRecords]           = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [calcModal, setCalcModal]     = useState(null);
  const [txModal, setTxModal]         = useState(null);
  const [txListModal, setTxListModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => setUid(user?.uid || null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "employees"), orderBy("fullName")),
      (snap) => { setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err)  => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [uid]);

  const periodId = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "payrollRecords"), where("payrollId", "==", periodId)),
      (snap) => setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [uid, periodId]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "transactions"), where("payrollId", "==", periodId)),
      (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [uid, periodId]);

  const wdim = workingDays(year, month);
  const recordMap = useMemo(() => Object.fromEntries(records.map((r) => [r.employeeId, r])), [records]);
  const paidMap = useMemo(() => {
    const m = {};
    transactions.forEach((t) => { m[t.employeeId] = (m[t.employeeId] || 0) + t.amount; });
    return m;
  }, [transactions]);

  const totals = useMemo(() => records.reduce((acc, r) => ({
    totalEarnings: acc.totalEarnings + (r.totalEarnings || 0),
    totalDed:      acc.totalDed      + (r.totalDed      || 0),
    netPay:        acc.netPay        + (r.netPay        || 0),
    paid:          acc.paid          + (paidMap[r.employeeId] || 0),
  }), { totalEarnings: 0, totalDed: 0, netPay: 0, paid: 0 }), [records, paidMap]);

  const activeEmps = employees.filter((e) => e.status === "active");

  function printPDF() {
    const rows = activeEmps.map((emp) => {
      const r = recordMap[emp.id]; const paid = paidMap[emp.id] || 0;
      return `<tr><td>${emp.fullName}</td><td>${emp.position||"—"}</td>
        <td>${fmt(emp.baseSalary,emp.currency)}</td><td>${r?.workedDays??"—"}</td>
        <td>${fmt(r?.totalEarnings,emp.currency)}</td><td>${fmt(r?.totalDed,emp.currency)}</td>
        <td><b>${fmt(r?.netPay,emp.currency)}</b></td><td>${fmt(paid,emp.currency)}</td>
        <td>${fmt((r?.netPay||0)-paid,emp.currency)}</td></tr>`;
    }).join("");
    const w = window.open("","_blank");
    w.document.write(`<html><head><title>Ведомость ${MONTH_NAMES[month-1]} ${year}</title>
      <style>body{font-family:Arial;font-size:11px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #e5e7eb;padding:4px 6px}th{background:#f9fafb;font-weight:600}</style></head>
      <body><h3 style="font-size:14px">Ведомость: ${MONTH_NAMES[month-1]} ${year}</h3>
      <table><thead><tr><th>ФИО</th><th>Должность</th><th>Оклад</th><th>Дней</th>
      <th>Начислено</th><th>Удержано</th><th>К выплате</th><th>Оплачено</th><th>Остаток</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.print();
  }

  const empTx = txListModal ? transactions.filter((t) => t.employeeId === txListModal) : [];

  const thStyle = {
    padding: "6px 10px", textAlign: "left", color: C.inkLight, fontWeight: 500, fontSize: 10,
    whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em", background: C.surfaceAlt,
  };
  const tdStyle = { padding: "8px 10px", fontSize: 13, color: C.ink, borderBottom: `1px solid ${C.border}` };

  if (!uid) return <div style={{ padding: 40, textAlign: "center", color: C.inkLight, fontSize: 13 }}>Загрузка…</div>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: "100%", color: C.ink }}>

      {/* Заголовок */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: C.ink }}>Ведомость</h1>
        <p style={{ margin: "4px 0 0" }}>
          <span style={{ padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Начисления и оплаты · {MONTH_NAMES[month-1]} {year}
          </span>
        </p>
      </div>

      {/* Фильтр-бар */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Период</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ ...baseInp, width: 120, cursor: "pointer" }}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...baseInp, width: 70 }} />
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
            <Btn variant="secondary" onClick={printPDF}>PDF</Btn>
          </div>
        </div>
      </div>

      {/* KPI — точно как в CashFlow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: C.border, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
        <KpiCard label="Начислено" value={fmt(totals.totalEarnings)} />
        <KpiCard label="Удержано"  value={"−" + fmt(totals.totalDed)} neg />
        <KpiCard label="К выплате" value={"+" + fmt(totals.netPay)}  pos />
        <KpiCard label="Оплачено"  value={fmt(totals.paid)} />
      </div>

      {/* Таблица */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: C.inkLight, fontSize: 13 }}>Загрузка данных…</div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["№","ФИО / Должность","Оклад","Дней","Начислено","Удержано","К выплате","Оплачено","Долг","Статус",""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {activeEmps.length === 0 && (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: "center", padding: 28, color: C.inkLight }}>Нет активных сотрудников</td></tr>
              )}
              {activeEmps.map((emp, idx) => {
                const r    = recordMap[emp.id];
                const paid = paidMap[emp.id] || 0;
                const debt = (r?.netPay || 0) - paid;
                return (
                  <tr key={emp.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <td style={{ ...tdStyle, color: C.inkLight, width: 32 }}>{idx+1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: C.ink }}>{emp.fullName}</div>
                      <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1 }}>{emp.position||"—"} · {emp.department||"—"}</div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", color: C.inkMid }}>{fmt(emp.baseSalary, emp.currency)}</td>
                    <td style={{ ...tdStyle, color: r ? C.ink : C.inkLight }}>{r ? r.workedDays : "—"}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", color: r ? C.ink : C.inkLight, fontVariantNumeric: "tabular-nums" }}>{r ? fmt(r.totalEarnings, emp.currency) : "—"}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", color: r ? C.neg : C.inkLight, fontVariantNumeric: "tabular-nums" }}>{r ? "−"+fmt(r.totalDed, emp.currency) : "—"}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 500, color: r ? C.pos : C.inkLight, fontVariantNumeric: "tabular-nums" }}>{r ? "+"+fmt(r.netPay, emp.currency) : "—"}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", cursor: paid ? "pointer" : "default", textDecoration: paid ? "underline" : "none", textDecorationStyle: "dotted", color: C.ink, fontVariantNumeric: "tabular-nums" }}
                        onClick={() => setTxListModal(emp.id)}>
                        {fmt(paid, emp.currency)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", color: debt > 0 ? C.neg : C.pos, fontWeight: debt > 0 ? 500 : 400, fontVariantNumeric: "tabular-nums" }}>
                      {r ? (debt > 0 ? "−" : "+")+fmt(Math.abs(debt), emp.currency) : "—"}
                    </td>
                    <td style={tdStyle}><StatusBadge paid={paid} netPay={r?.netPay} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn small onClick={() => setCalcModal(emp)}>Начислить</Btn>
                        <Btn small variant="secondary" onClick={() => setTxModal({ employeeId: emp.id, employeeName: emp.fullName, currency: emp.currency||"UZS", netPay: r?.netPay||0 })}>Оплата</Btn>
                        {r && <Btn small variant="ghost" onClick={() => setDetailModal(r)}>👁</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {calcModal && (
        <Modal onClose={() => setCalcModal(null)} title={`Начисление · ${MONTH_NAMES[month-1]} ${year}`} wide>
          <CalcForm emp={calcModal} existingRecord={recordMap[calcModal.id]} payrollId={periodId} wdim={wdim} uid={uid} onSaved={() => setCalcModal(null)} onClose={() => setCalcModal(null)} />
        </Modal>
      )}
      {txModal && (
        <Modal onClose={() => setTxModal(null)} title="Добавить оплату">
          <TransactionForm payrollId={periodId} employeeId={txModal.employeeId} employeeName={txModal.employeeName} currency={txModal.currency} uid={uid} onSaved={() => setTxModal(null)} onClose={() => setTxModal(null)} />
        </Modal>
      )}
      {txListModal && (
        <Modal onClose={() => setTxListModal(null)} title={`История оплат · ${employees.find(e=>e.id===txListModal)?.fullName||""}`}>
          {empTx.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: C.inkLight, fontSize: 13 }}>Оплат не найдено</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Дата","Сумма","Метод","Примечание",""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {empTx.map((t) => (
                  <tr key={t.id} onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <td style={{ ...tdStyle, color: C.inkLight }}>{fmtDate(t.date)}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", color: C.pos, fontVariantNumeric: "tabular-nums" }}>+{fmt(t.amount, t.currency)}</td>
                    <td style={tdStyle}>{{ bank:"Банк", cash:"Наличные", card:"Карта" }[t.method]||t.method}</td>
                    <td style={{ ...tdStyle, color: C.inkMid }}>{t.note||"—"}</td>
                    <td style={tdStyle}>
                      <Btn small variant="danger" onClick={async () => { if (window.confirm("Удалить?")) await deleteDoc(doc(db, "users", uid, "transactions", t.id)); }}>Удалить</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: C.posBg }}>
                  <td colSpan={2} style={{ ...tdStyle, fontWeight: 600, color: C.pos, fontVariantNumeric: "tabular-nums" }}>
                    Итого: +{fmt(empTx.reduce((s,t) => s+t.amount, 0), empTx[0]?.currency)}
                  </td>
                  <td colSpan={3} style={tdStyle} />
                </tr>
              </tfoot>
            </table>
          )}
        </Modal>
      )}
      {detailModal && (
        <Modal onClose={() => setDetailModal(null)} title={`Детали · ${detailModal.employeeName}`}>
          <div style={{ fontSize: 13 }}>
            {[
              ["Сотрудник", detailModal.employeeName],["Должность", detailModal.position],
              ["Оклад (снапшот)", fmt(detailModal.baseSalary, detailModal.currency)],
              ["Отраб. дней", detailModal.workedDays],["Больничных", detailModal.sickDays],
              ["Отпуск", detailModal.vacationDays],["Прогулы", detailModal.absentDays],
              ["Бонус", fmt(detailModal.bonus, detailModal.currency)],
              ["Премия", fmt(detailModal.premium, detailModal.currency)],
              ["Надбавка", fmt(detailModal.allowance, detailModal.currency)],
              ["Итого начислено", fmt(detailModal.totalEarnings, detailModal.currency)],
              ["Налог", fmt(detailModal.taxDed, detailModal.currency)],
              ["Штраф", fmt(detailModal.penalty, detailModal.currency)],
              ["Аванс", fmt(detailModal.advance, detailModal.currency)],
              ["Прочие удержания", fmt(detailModal.otherDed, detailModal.currency)],
              ["Итого удержано", fmt(detailModal.totalDed, detailModal.currency)],
              ["К выплате", fmt(detailModal.netPay, detailModal.currency)],
            ].map(([label, value]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ color: C.inkLight }}>{label}</span>
                <span style={{ fontWeight: 500, fontFamily: "monospace", color: C.ink }}>{value}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

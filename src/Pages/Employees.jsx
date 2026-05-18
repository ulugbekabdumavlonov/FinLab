// ─────────────────────────────────────────────────────────────────────────────
// Employees.jsx — HR Dashboard (токены CashFlow)
// Firebase: /users/{uid}/employees/
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useMemo } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES     = { active: "Активный", on_leave: "В отпуске", terminated: "Уволен" };
const EMP_TYPES    = { full_time: "Полная ставка", part_time: "Частичная", contract: "Контракт" };
const SALARY_TYPES = { salary: "Оклад", hourly: "Почасовая", piecework: "Сдельная" };

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
  warn:       "#a16207",
  warnBg:     "#fef9c3",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
};

const STATUS_CFG = {
  active:     { color: C.pos,  bg: C.posBg,  dot: C.pos  },
  on_leave:   { color: C.warn, bg: C.warnBg, dot: C.warn },
  terminated: { color: C.neg,  bg: C.negBg,  dot: C.neg  },
};

const EMPTY = {
  fullName:"", birthDate:"", gender:"male", phone:"", email:"", address:"",
  passportNumber:"", pinfl:"", docIssueDate:"", docIssuedBy:"",
  department:"", position:"", manager:"", employmentType:"full_time",
  hireDate:"", terminationDate:"", status:"active",
  salaryType:"salary", baseSalary:"", currency:"UZS", taxRate:"12",
  bankName:"", bankAccount:"", note:"",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (n, cur = "UZS") => cur === "USD" ? "$" + Number(n||0).toLocaleString("en-US") : Number(n||0).toLocaleString("ru-RU") + " so'm";
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("ru-RU") : "—";

// ─── Base input style (как в CashFlow) ───────────────────────────────────────
const baseInp = {
  fontFamily: "inherit", fontSize: 12, padding: "5px 9px",
  border: `0.5px solid ${C.borderMid}`, borderRadius: 4,
  background: C.surface, color: C.ink, outline: "none",
  width: "100%", boxSizing: "border-box",
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: 9, color: C.inkLight, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
    {children}
  </div>
);

const Field = ({ label, children, full }) => (
  <div style={{ marginBottom: 12, gridColumn: full ? "1/-1" : undefined }}>
    <Label>{label}</Label>{children}
  </div>
);

const Inp = (p) => <input style={baseInp} {...p} />;
const Sel = ({ children, ...p }) => (
  <select style={{ ...baseInp, cursor: "pointer" }} {...p}>{children}</select>
);

const SecTitle = ({ children }) => (
  <div style={{
    gridColumn: "1/-1", fontSize: 9, fontWeight: 600, color: C.inkLight,
    textTransform: "uppercase", letterSpacing: "0.1em",
    borderBottom: `1px solid ${C.border}`, paddingBottom: 5, marginTop: 10,
  }}>{children}</div>
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
      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4,
    }} {...p}>{children}</button>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.active;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {STATUSES[status] || status}
    </span>
  );
};

// ─── KpiCard (из CashFlow) ────────────────────────────────────────────────────
function KpiCard({ label, value, pos, neg, accent }) {
  return (
    <div style={{ background: C.surface, padding: "12px 16px", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 400, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: pos ? C.pos : neg ? C.neg : accent ? C.accent : C.ink, letterSpacing: "-0.5px" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function EmployeeForm({ initial = {}, employees = [], onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return alert("Введите ФИО");
    onSubmit({ ...form, baseSalary: Number(form.baseSalary)||0, taxRate: Number(form.taxRate)||0 });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <SecTitle>Личные данные</SecTitle>
        <Field label="ФИО *" full><Inp value={form.fullName} onChange={set("fullName")} placeholder="Фамилия Имя Отчество" required /></Field>
        <Field label="Дата рождения"><Inp type="date" value={form.birthDate} onChange={set("birthDate")} /></Field>
        <Field label="Пол"><Sel value={form.gender} onChange={set("gender")}><option value="male">Мужской</option><option value="female">Женский</option></Sel></Field>
        <Field label="Телефон"><Inp value={form.phone} onChange={set("phone")} placeholder="+998 90 000 00 00" /></Field>
        <Field label="Email"><Inp type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" /></Field>
        <Field label="Адрес" full><Inp value={form.address} onChange={set("address")} /></Field>

        <SecTitle>Документы</SecTitle>
        <Field label="Паспорт / ID"><Inp value={form.passportNumber} onChange={set("passportNumber")} placeholder="AA 0000000" /></Field>
        <Field label="ПИНФЛ"><Inp value={form.pinfl} onChange={set("pinfl")} maxLength={14} /></Field>
        <Field label="Дата выдачи"><Inp type="date" value={form.docIssueDate} onChange={set("docIssueDate")} /></Field>
        <Field label="Кем выдан"><Inp value={form.docIssuedBy} onChange={set("docIssuedBy")} /></Field>

        <SecTitle>Рабочая информация</SecTitle>
        <Field label="Отдел"><Inp value={form.department} onChange={set("department")} /></Field>
        <Field label="Должность"><Inp value={form.position} onChange={set("position")} /></Field>
        <Field label="Руководитель">
          <Sel value={form.manager} onChange={set("manager")}>
            <option value="">— Нет —</option>
            {employees.filter(e => e.id !== initial?.id).map(e => <option key={e.id} value={e.fullName}>{e.fullName}</option>)}
          </Sel>
        </Field>
        <Field label="Тип занятости">
          <Sel value={form.employmentType} onChange={set("employmentType")}>
            {Object.entries(EMP_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
        </Field>
        <Field label="Дата приёма *"><Inp type="date" value={form.hireDate} onChange={set("hireDate")} required /></Field>
        <Field label="Дата увольнения"><Inp type="date" value={form.terminationDate} onChange={set("terminationDate")} /></Field>
        <Field label="Статус" full>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {Object.entries(STATUSES).map(([k, v]) => {
              const cfg = STATUS_CFG[k];
              const active = form.status === k;
              return (
                <label key={k} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${active ? cfg.color : C.border}`,
                  background: active ? cfg.bg : C.surfaceAlt, transition: "all .12s",
                }}>
                  <input type="radio" name="status" value={k} checked={active} onChange={set("status")} style={{ accentColor: cfg.color }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? cfg.color : C.inkMid }}>{v}</span>
                </label>
              );
            })}
          </div>
        </Field>

        <SecTitle>Зарплата и реквизиты</SecTitle>
        <Field label="Тип оплаты">
          <Sel value={form.salaryType} onChange={set("salaryType")}>
            {Object.entries(SALARY_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
        </Field>
        <Field label="Базовый оклад *"><Inp type="number" value={form.baseSalary} onChange={set("baseSalary")} min={0} placeholder="0" required /></Field>
        <Field label="Валюта">
          <Sel value={form.currency} onChange={set("currency")}><option value="UZS">UZS — сум</option><option value="USD">USD — доллар</option></Sel>
        </Field>
        <Field label="Налоговая ставка (%)"><Inp type="number" value={form.taxRate} onChange={set("taxRate")} min={0} max={100} /></Field>
        <Field label="Название банка"><Inp value={form.bankName} onChange={set("bankName")} /></Field>
        <Field label="Счёт / карта"><Inp value={form.bankAccount} onChange={set("bankAccount")} /></Field>

        <SecTitle>Заметка</SecTitle>
        <div style={{ gridColumn: "1/-1" }}>
          <textarea value={form.note} onChange={set("note")} rows={2}
            placeholder="Дополнительная информация..."
            style={{ ...baseInp, resize: "vertical", lineHeight: 1.6 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <Btn type="button" variant="secondary" onClick={onCancel}>Отмена</Btn>
        <Btn type="submit" disabled={loading}>{loading ? "Сохранение..." : "Сохранить"}</Btn>
      </div>
    </form>
  );
}

// ─── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onEdit, onDelete }) {
  const cfg = STATUS_CFG[emp.status] || STATUS_CFG.active;
  const Row = ({ label, value }) => value ? (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
      <span style={{ color: C.inkLight }}>{label}</span>
      <span style={{ fontWeight: 500, color: C.ink }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: C.surfaceAlt }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
            {emp.fullName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13, color: C.ink }}>{emp.fullName}</div>
            <div style={{ fontSize: 11, color: C.inkLight }}>{emp.position}{emp.department ? ` · ${emp.department}` : ""}</div>
          </div>
        </div>
        <StatusBadge status={emp.status} />
      </div>
      <div style={{ padding: "10px 16px" }}>
        <Row label="Телефон"   value={emp.phone} />
        <Row label="Занятость" value={EMP_TYPES[emp.employmentType]} />
        <Row label="Дата приёма" value={fmtDate(emp.hireDate)} />
        <Row label="Оклад"     value={fmt(emp.baseSalary, emp.currency)} />
        <Row label="Налог"     value={emp.taxRate ? emp.taxRate + "%" : null} />
      </div>
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6 }}>
        <Btn small onClick={() => onEdit(emp)}>Изменить</Btn>
        <Btn small variant="danger" onClick={() => { if (window.confirm("Удалить?")) onDelete(emp.id); }}>Удалить</Btn>
      </div>
    </div>
  );
}

// ─── Pill (как в CashFlow) ────────────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "inherit", fontSize: 13, padding: "5px 14px", borderRadius: 6,
      border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? C.accentBg : C.surface,
      color: active ? C.accent : C.inkMid,
      cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap",
      fontWeight: active ? 500 : 400,
    }}>{label}</button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Employees() {
  const [uid, setUid]             = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState(null);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept]     = useState("");
  const [view, setView]           = useState("table");

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, user => setUid(user?.uid || null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "users", uid, "employees"), orderBy("fullName")),
      snap => { setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      err  => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [uid]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const filtered = useMemo(() => employees.filter(e => {
    const s = search.toLowerCase();
    return (
      (!s || e.fullName.toLowerCase().includes(s) || (e.email||"").toLowerCase().includes(s) || (e.phone||"").includes(s)) &&
      (!filterStatus || e.status === filterStatus) &&
      (!filterDept   || e.department === filterDept)
    );
  }), [employees, search, filterStatus, filterDept]);

  const stats = useMemo(() => ({
    active:      employees.filter(e => e.status === "active").length,
    on_leave:    employees.filter(e => e.status === "on_leave").length,
    terminated:  employees.filter(e => e.status === "terminated").length,
    totalSalary: employees.filter(e => e.status === "active" && e.currency === "UZS").reduce((s,e) => s + (e.baseSalary||0), 0),
  }), [employees]);

  async function handleSubmit(data) {
    if (!uid) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const col = collection(db, "users", uid, "employees");
      if (modal === "add") await addDoc(col, { ...data, createdAt: now, updatedAt: now });
      else await updateDoc(doc(db, "users", uid, "employees", modal.id), { ...data, updatedAt: now });
      setModal(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "employees", id));
  }

  const thStyle = {
    padding: "6px 10px", textAlign: "left", color: C.inkLight, fontWeight: 500, fontSize: 10,
    whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em", background: C.surfaceAlt,
  };
  const tdStyle = { padding: "8px 10px", fontSize: 13, color: C.ink, borderBottom: `1px solid ${C.border}` };

  if (!uid) return <div style={{ padding: 40, textAlign: "center", color: C.inkLight }}>Загрузка…</div>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 1100, padding: "1.5rem 1rem", color: C.ink, background: C.surfaceAlt, minHeight: "100vh" }}>

      {/* Заголовок */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, margin: 0, color: C.ink }}>Сотрудники</h1>
        <p style={{ margin: "4px 0 0" }}>
          <span style={{ padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Управление персоналом · {employees.length} человек
          </span>
        </p>
      </div>

      {/* KPI — точно как в CashFlow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: C.border, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        <KpiCard label="Активных"  value={stats.active}           pos />
        <KpiCard label="В отпуске" value={stats.on_leave} />
        <KpiCard label="Уволено"   value={stats.terminated}       neg />
        <KpiCard label="ФОТ (UZS)" value={fmt(stats.totalSalary)} accent />
      </div>

      {/* Фильтр-бар */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Поиск</div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Имя, email, телефон..."
              style={{ ...baseInp, width: 220 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Статус</div>
            <div style={{ display: "flex", gap: 4 }}>
              <Pill label="Все" active={!filterStatus} onClick={() => setFilterStatus("")} />
              {Object.entries(STATUSES).map(([k, v]) => <Pill key={k} label={v} active={filterStatus === k} onClick={() => setFilterStatus(k)} />)}
            </div>
          </div>
          {departments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Отдел</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Pill label="Все" active={!filterDept} onClick={() => setFilterDept("")} />
                {departments.map(d => <Pill key={d} label={d} active={filterDept === d} onClick={() => setFilterDept(d)} />)}
              </div>
            </div>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.inkLight }}>Найдено: {filtered.length}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[["table","Таблица"],["cards","Карточки"]].map(([v, label]) => (
                <Pill key={v} label={label} active={view === v} onClick={() => setView(v)} />
              ))}
            </div>
            <Btn onClick={() => setModal("add")}>+ Добавить</Btn>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.inkLight, fontSize: 13 }}>Загрузка данных…</div>}

      {/* Таблица */}
      {!loading && view === "table" && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Сотрудник","Статус","Занятость","Оклад","Дата приёма","Телефон",""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: 28, color: C.inkLight }}>Нет данных</td></tr>}
              {filtered.map(e => {
                const cfg = STATUS_CFG[e.status] || STATUS_CFG.active;
                return (
                  <tr key={e.id}
                    onMouseEnter={ev => ev.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: cfg.bg, color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                          {e.fullName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: C.ink }}>{e.fullName}</div>
                          <div style={{ fontSize: 11, color: C.inkLight }}>{e.position||"—"}{e.department ? ` · ${e.department}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}><StatusBadge status={e.status} /></td>
                    <td style={{ ...tdStyle, color: C.inkMid }}>{EMP_TYPES[e.employmentType]||"—"}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 500, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(e.baseSalary, e.currency)}</td>
                    <td style={{ ...tdStyle, color: C.inkMid }}>{fmtDate(e.hireDate)}</td>
                    <td style={{ ...tdStyle, color: C.inkMid }}>{e.phone||"—"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn small onClick={() => setModal(e)}>Изменить</Btn>
                        <Btn small variant="danger" onClick={() => { if (window.confirm(`Удалить ${e.fullName}?`)) handleDelete(e.id); }}>Удалить</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Карточки */}
      {!loading && view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {filtered.length === 0 && <div style={{ color: C.inkLight, padding: 28 }}>Нет данных</div>}
          {filtered.map(e => <EmployeeCard key={e.id} emp={e} onEdit={setModal} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Модалка */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "32px 16px", zIndex: 1000, overflowY: "auto",
        }}>
          <div style={{
            background: C.surface, borderRadius: 10, padding: 24,
            width: "100%", maxWidth: 740, position: "relative",
            border: `1px solid ${C.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
            <button onClick={() => setModal(null)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 16, cursor: "pointer", color: C.inkLight }}>✕</button>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 20 }}>
              {modal === "add" ? "Новый сотрудник" : `Изменить: ${modal.fullName}`}
            </div>
            <EmployeeForm initial={modal === "add" ? {} : modal} employees={employees} onSubmit={handleSubmit} onCancel={() => setModal(null)} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
}

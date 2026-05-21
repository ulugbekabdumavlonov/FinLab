/**
 * CounterpartiesPage.jsx
 *
 * Контрагенты берутся из двух источников:
 *   1. useAppStore → transactions  (поле counterparty)
 *   2. Коллекция   users/{uid}/counterparties  (созданные вручную)
 *
 * Структура документа в counterparties:
 *   { name, group, inn, comment, source, createdAt }
 *
 * group: "client" | "employee" | ""
 * source: "manual" | "bank" | "import"
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection, doc,
  addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAppStore } from "./useAppStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) =>
  collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) =>
  doc(db, "users", auth.currentUser.uid, name, id);

const GROUP_LABELS = {
  client:   { label: "Клиенты",    bg: "#E1F5EE", color: "#0F6E56" },
  supplier: { label: "Поставщики", bg: "#f2e5fa", color: "#e213db" },
  employee: { label: "Сотрудники", bg: "#E6F1FB", color: "#185FA5" },
  "":       { label: "—",          bg: "transparent", color: "var(--color-text-tertiary)" },
};

const SOURCE_LABELS = {
  bank:   { label: "Банк",    bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  import: { label: "Импорт",  bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  manual: { label: "Вручную", bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  tx:     { label: "Из опер.", bg: "#FAEEDA", color: "#854F0B" },
};

function GroupBadge({ group }) {
  const g = GROUP_LABELS[group] || GROUP_LABELS[""];
  if (!group) return <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>—</span>;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 500, background: g.bg, color: g.color,
    }}>
      {g.label}
    </span>
  );
}

function SourceTag({ source }) {
  const s = SOURCE_LABELS[source] || SOURCE_LABELS.manual;
  return (
    <span style={{
      display: "inline-block", padding: "1px 8px", borderRadius: 4,
      fontSize: 11, background: s.bg, color: s.color,
      border: "0.5px solid var(--color-border-tertiary)",
    }}>
      {s.label}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", group: "", inn: "", comment: "" };

function CounterpartyModal({ initial, onSave, onDelete, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? { name: initial.name, group: initial.group || "", inn: initial.inn || "", comment: initial.comment || "" } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const inp = {
    width: "100%", boxSizing: "border-box",
    padding: "8px 12px",
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)",
    fontSize: 14,
    background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)",
    outline: "none",
    fontFamily: "var(--font-sans)",
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form, name: form.name.trim(), id: initial?.id });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 460, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>
            {isEdit ? "Редактировать контрагента" : "Новый контрагент"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        {/* Наименование */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Наименование *</div>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Название компании или ФИО"
            style={inp}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        {/* Группа */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Группа</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["", "Без группы"], ["client", "Клиенты"], ["supplier", "Поставщики"], ["employee", "Сотрудники"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => set("group", val)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", cursor: "pointer",
                  fontSize: 13, fontWeight: form.group === val ? 500 : 400,
                  background: form.group === val ? "var(--color-background-info)" : "var(--color-background-secondary)",
                  color: form.group === val ? "var(--color-text-info)" : "var(--color-text-secondary)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ИНН */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>ИНН</div>
          <input
            value={form.inn}
            onChange={(e) => set("inn", e.target.value)}
            placeholder="Введите ИНН"
            style={inp}
          />
        </div>

        {/* Комментарий */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Комментарий</div>
          <textarea
            value={form.comment}
            onChange={(e) => set("comment", e.target.value)}
            placeholder="Дополнительная информация"
            rows={3}
            style={{ ...inp, resize: "vertical", minHeight: 72 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              flex: 1, padding: "10px 0", background: saving ? "var(--color-background-secondary)" : "#3b62d6",
              color: saving ? "var(--color-text-tertiary)" : "#fff",
              border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Добавить"}
          </button>
          <button
            onClick={onClose}
            style={{ padding: "10px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            Отмена
          </button>
          {isEdit && (
            <button
              onClick={() => onDelete(initial.id)}
              style={{ padding: "10px 14px", background: "none", border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-danger)" }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CounterpartiesPage() {
  const { transactions, loading: txLoading } = useAppStore();

  // Контрагенты из коллекции counterparties
  const [cpDocs, setCpDocs]     = useState([]);
  const [cpLoading, setCpLoading] = useState(true);
  const [error, setError]       = useState("");
  const [modal, setModal]       = useState(null); // null | { mode: "add" } | { mode: "edit", cp }
  const [filter, setFilter]     = useState("all"); // "all" | "client" | "employee" | "none"
  const [search, setSearch]     = useState("");

  // ── Realtime listener на counterparties ───────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    setCpLoading(true);
    const unsub = onSnapshot(
      userCol("counterparties"),
      (snap) => {
        setCpDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCpLoading(false);
      },
      (e) => { setError("Ошибка загрузки: " + e.message); setCpLoading(false); }
    );
    return () => unsub();
  }, []);

  // ── Контрагенты из транзакций (которых ещё нет в cpDocs) ─────────────────
  const txCounterparties = useMemo(() => {
    const existing = new Set(cpDocs.map((c) => c.name.toLowerCase()));
    const names = [...new Set(
      transactions.map((t) => t.counterparty).filter(Boolean)
    )];
    return names
      .filter((n) => !existing.has(n.toLowerCase()))
      .map((name) => ({ id: `tx__${name}`, name, group: "", inn: "", comment: "", source: "tx", _fromTx: true }));
  }, [transactions, cpDocs]);

  // ── Объединённый список ────────────────────────────────────────────────────
  const allCounterparties = useMemo(() => {
    const manual = cpDocs.map((c) => ({ ...c, source: c.source || "manual" }));
    return [...manual, ...txCounterparties].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [cpDocs, txCounterparties]);

  // ── Фильтрация ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allCounterparties;
    if (filter === "client")   list = list.filter((c) => c.group === "client");
    if (filter === "supplier")   list = list.filter((c) => c.group === "supplier");
    if (filter === "employee") list = list.filter((c) => c.group === "employee");
    if (filter === "none")     list = list.filter((c) => !c.group);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.inn?.toLowerCase().includes(q) ||
        c.comment?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allCounterparties, filter, search]);

  // ── Статистика ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    all:      allCounterparties.length,
    client:   allCounterparties.filter((c) => c.group === "client").length,
    supplier: allCounterparties.filter((c) => c.group === "supplier").length,
    employee: allCounterparties.filter((c) => c.group === "employee").length,
    none:     allCounterparties.filter((c) => !c.group).length,
  }), [allCounterparties]);

  // Кол-во транзакций на контрагента
  const txCount = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.counterparty) map[t.counterparty] = (map[t.counterparty] || 0) + 1;
    });
    return map;
  }, [transactions]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async ({ id, name, group, inn, comment }) => {
    try {
      const data = { name, group, inn, comment, updatedAt: serverTimestamp() };
      if (id && !id.startsWith("tx__")) {
        // редактирование существующего
        await updateDoc(userDoc("counterparties", id), data);
      } else {
        // новый (или перевод из tx)
        await addDoc(userCol("counterparties"), { ...data, source: "manual", createdAt: serverTimestamp() });
      }
    } catch (e) {
      setError("Ошибка сохранения: " + e.message);
    }
    setModal(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (id.startsWith("tx__")) { setModal(null); return; } // tx-контрагентов нет в коллекции
    try {
      await deleteDoc(userDoc("counterparties", id));
    } catch (e) {
      setError("Ошибка удаления: " + e.message);
    }
    setModal(null);
  };

  const loading = txLoading || cpLoading;

  // ─── Render ───────────────────────────────────────────────────────────────
  const COL_HDR = {
    padding: "9px 10px", fontSize: 11, fontWeight: 500,
    color: "var(--color-text-tertiary)", textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const GRID = "1fr 120px 140px 1fr 90px 80px 36px";

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>

      {modal?.mode === "add" && (
        <CounterpartyModal onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <CounterpartyModal
          initial={modal.cp}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ width: "100%", paddingBottom: 40 }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "20px 24px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Контрагенты</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Поиск */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg style={{ position: "absolute", left: 8, pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск…"
                  style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180 }}
                />
              </div>
              <button
                onClick={() => setModal({ mode: "add" })}
                style={{ padding: "7px 16px", borderRadius: "var(--border-radius-md)", border: "none", background: "#3b62d6", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                + Добавить контрагента
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#EBF3FF", border: "0.5px solid #B5D4F4", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#185FA5" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #185FA5", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1 }}>i</span>
            <span>При загрузке операций из банков и импорте файлов, контрагенты создаются автоматически. Здесь вы можете дополнить их группой, ИНН и комментарием.</span>
          </div>

          {/* Фильтры */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Группировка:</span>
            {[
              ["all",      `Все (${stats.all})`],
              ["client",   `Клиенты (${stats.client})`],
              ["supplier", `Поставщики (${stats.supplier})`],
              ["employee", `Сотрудники (${stats.employee})`],
              ["none",     `Без группы (${stats.none})`],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                style={{
                  padding: "6px 14px", borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer",
                  background: filter === val ? "#3b62d6" : "var(--color-background-secondary)",
                  color: filter === val ? "#fff" : "var(--color-text-secondary)",
                  fontWeight: filter === val ? 500 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ margin: "12px 24px 0", padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div style={{ background: "var(--color-background-primary)", marginTop: 1, overflowX: "auto" }}>
          <div style={{ minWidth: 800 }}>

            {/* Заголовок таблицы */}
            <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {[
                ["Наименование",   "left"],
                ["Группа",         "left"],
                ["ИНН",            "left"],
                ["Комментарий",    "left"],
                ["Операций",       "right"],
                ["Источник",       "left"],
                ["",               "left"],
              ].map(([h, align]) => (
                <div key={h} style={{ ...COL_HDR, textAlign: align }}>{h}</div>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
                Загрузка контрагентов…
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
                  {allCounterparties.length === 0 ? "Контрагентов пока нет" : "Нет контрагентов по выбранному фильтру"}
                </div>
                {(filter !== "all" || search) && (
                  <button
                    onClick={() => { setFilter("all"); setSearch(""); }}
                    style={{ marginTop: 10, padding: "8px 18px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, cursor: "pointer", color: "var(--color-text-secondary)" }}
                  >
                    Сбросить фильтр
                  </button>
                )}
              </div>
            )}

            {/* Rows */}
            {!loading && filtered.map((cp) => {
              const count = txCount[cp.name] || 0;
              const isFromTx = cp._fromTx;
              return (
                <div
                  key={cp.id}
                  onClick={() => setModal({ mode: "edit", cp })}
                  style={{ display: "grid", gridTemplateColumns: GRID, padding: "0 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer", alignItems: "center" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {/* Наименование */}
                  <div style={{ padding: "12px 10px 12px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: cp.group === "client" ? "#E1F5EE" : cp.group === "employee" ? "#E6F1FB" : cp.group === "supplier" ? "#f2e5fa" : "var(--color-background-secondary)",
                        color: cp.group === "client" ? "#0F6E56" : cp.group === "employee" ? "#185FA5" : cp.group === "supplier" ? "#e213db" : "var(--color-text-secondary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {cp.name ? cp.name.slice(0, 2).toUpperCase() : "?"}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cp.name}
                      </span>
                    </div>
                  </div>

                  {/* Группа */}
                  <div style={{ padding: "12px 10px" }}>
                    <GroupBadge group={cp.group} />
                  </div>

                  {/* ИНН */}
                  <div style={{ padding: "12px 10px", fontSize: 13, color: cp.inn ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                    {cp.inn || "—"}
                  </div>

                  {/* Комментарий */}
                  <div style={{ padding: "12px 10px", fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
                    {cp.comment || <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                  </div>

                  {/* Кол-во операций */}
                  <div style={{ padding: "12px 10px", fontSize: 13, textAlign: "right", color: count > 0 ? "var(--color-text-primary)" : "var(--color-text-tertiary)", fontWeight: count > 0 ? 500 : 400 }}>
                    {count > 0 ? count : "—"}
                  </div>

                  {/* Источник */}
                  <div style={{ padding: "12px 10px" }}>
                    <SourceTag source={cp.source} />
                  </div>

                  {/* Edit icon */}
                  <div style={{ padding: "12px 4px", textAlign: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5">
                      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
                    </svg>
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-secondary)" }}>
                <span>Всего: <strong>{filtered.length}</strong></span>
                <span>Клиентов: <strong>{filtered.filter((c) => c.group === "client").length}</strong></span>
                <span>Поставщиков: <strong>{filtered.filter((c) => c.group === "supplier").length}</strong></span>
                <span>Сотрудников: <strong>{filtered.filter((c) => c.group === "employee").length}</strong></span>
                <span>Без группы: <strong>{filtered.filter((c) => !c.group).length}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

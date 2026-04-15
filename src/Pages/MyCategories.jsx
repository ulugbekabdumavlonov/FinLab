// OperationCategories.jsx
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

const COLLECTION = "operation_categories";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { key: "op",  label: "Операционная",   color: "#1D9E75", bg: "#E1F5EE", text: "#0F6E56" },
  { key: "fin", label: "Финансовая",     color: "#378ADD", bg: "#E6F1FB", text: "#185FA5" },
  { key: "inv", label: "Инвестиционная", color: "#BA7517", bg: "#FAEEDA", text: "#854F0B" },
];

const KIND_TABS = [
  { key: "all",      label: "Все" },
  { key: "income",   label: "Поступление" },
  { key: "expense",  label: "Списание" },
  { key: "transfer", label: "Переводы" },
];

const PNL_OPTIONS = [
  "",
  "Выручка",
  "EBITDA and below income",
  "Below net profit",
  "Production / variable",
  "Commercial",
  "Administrative",
  "General production",
];

const EMPTY_FORM = {
  name: "", kind: "income", type: "op",
  pnl: "", desc: "", lock: false,
  sub: false, balance: false, manual: false,
};

const KIND_LABELS = {
  income: "Поступление",
  expense: "Списание",
  transfer: "Перевод",
};

const activityOf = (key) => ACTIVITY_TYPES.find((t) => t.key === key) ?? ACTIVITY_TYPES[0];

// ─── Shared input style ───────────────────────────────────────────────────────
const inp = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)",
  fontSize: 14,
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "var(--font-sans)",
};

// ─── Activity Badge ───────────────────────────────────────────────────────────
function ActivityBadge({ typeKey }) {
  const t = activityOf(typeKey);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500, padding: "3px 9px",
      borderRadius: 20, background: t.bg, color: t.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color, display: "inline-block", flexShrink: 0 }} />
      {t.label}
    </span>
  );
}

// ─── Type Selector ────────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
      {ACTIVITY_TYPES.map((t) => {
        const selected = value === t.key;
        return (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} style={{
            padding: "10px 8px", borderRadius: "var(--border-radius-md)",
            border: selected ? `1.5px solid ${t.color}` : "0.5px solid var(--color-border-secondary)",
            background: selected ? t.bg : "var(--color-background-secondary)",
            cursor: "pointer", textAlign: "center",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, margin: "0 auto 5px" }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: selected ? t.text : "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
              {t.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Check Option ─────────────────────────────────────────────────────────────
function CheckOption({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: "var(--border-radius-md)",
      border: "0.5px solid var(--color-border-secondary)",
      fontSize: 13, cursor: "pointer",
      color: "var(--color-text-primary)",
      background: checked ? "var(--color-background-secondary)" : "transparent",
      fontFamily: "var(--font-sans)",
    }}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#1D9E75" }} />
      {label}
    </label>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────
function CategoryRow({ cat, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.6fr 36px",
        alignItems: "center", gap: 14, padding: "12px 18px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        background: hovered ? "var(--color-background-secondary)" : "transparent",
        cursor: "pointer", transition: "background .1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(cat)}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
          {cat.name}
          {cat.lock && (
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{ opacity: .4 }}>
              <rect x="1" y="5" width="9" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M3 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
          {KIND_LABELS[cat.kind] || cat.kind}{cat.sub ? " · sub-articles" : ""}
        </div>
      </div>
      <div><ActivityBadge typeKey={cat.type} /></div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{cat.pnl || "—"}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.desc || "—"}</div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(cat); }}
        style={{
          width: 28, height: 28, borderRadius: "var(--border-radius-md)",
          border: "0.5px solid var(--color-border-secondary)",
          background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-tertiary)",
          opacity: hovered ? 1 : 0, transition: "opacity .15s",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Side Panel Form ──────────────────────────────────────────────────────────
function CategoryForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  useEffect(() => { setForm(initial ?? EMPTY_FORM); }, [initial]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isEdit = !!initial?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <aside style={{
      width: 360, minWidth: 320,
      borderLeft: "0.5px solid var(--color-border-tertiary)",
      background: "var(--color-background-primary)",
      display: "flex", flexDirection: "column",
      padding: "24px 20px", gap: 0,
      height: "100vh", position: "sticky", top: 0, overflowY: "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, paddingBottom: 16,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>
          {isEdit ? "Редактировать статью" : "Новая статья"}
        </div>
        <button onClick={onCancel} style={{
          width: 28, height: 28, borderRadius: "var(--border-radius-md)",
          border: "0.5px solid var(--color-border-secondary)",
          background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-text-tertiary)",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Название статьи *</div>
          <input style={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Напр. Выручка от продаж" required />
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Вид деятельности</div>
          <TypeSelector value={form.type} onChange={(v) => set("type", v)} />
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Тип операции</div>
          <select style={inp} value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="income">Поступление</option>
            <option value="expense">Списание</option>
            <option value="transfer">Перевод</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Тип ОПиУ</div>
          <select style={inp} value={form.pnl} onChange={(e) => set("pnl", e.target.value)}>
            {PNL_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Не выбрано"}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Описание</div>
          <textarea style={{ ...inp, resize: "vertical", minHeight: 80 }} value={form.desc} onChange={(e) => set("desc", e.target.value)} placeholder="Опишите более подробно" />
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Параметры</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <CheckOption id="f-lock"    label="Системная (заблокирована)"  checked={form.lock}    onChange={(v) => set("lock", v)} />
            <CheckOption id="f-sub"     label="Разрешены подстатьи"        checked={form.sub}     onChange={(v) => set("sub", v)} />
            <CheckOption id="f-balance" label="Отображать в балансе"       checked={form.balance} onChange={(v) => set("balance", v)} />
            <CheckOption id="f-manual"  label="Ручной ввод в ОПиУ"         checked={form.manual}  onChange={(v) => set("manual", v)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)", marginTop: "auto" }}>
          <button type="button" onClick={onCancel} style={{
            padding: "9px 16px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "transparent", color: "var(--color-text-secondary)",
            fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer",
          }}>
            Отмена
          </button>
          <button type="submit" disabled={saving} style={{
            flex: 1, padding: "9px 0", borderRadius: "var(--border-radius-md)",
            border: "none", background: saving ? "#8fa8e8" : "#3b62d6",
            color: "#fff", fontFamily: "var(--font-sans)", fontSize: 14,
            fontWeight: 500, cursor: "pointer",
          }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </aside>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ cat, onConfirm, onCancel, deleting }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400,
    }}>
      <div style={{
        background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)", padding: 28, width: 380, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8 }}>
          Удалить «{cat.name}»?
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          Это действие нельзя отменить. Статья будет удалена из Firestore.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "9px 18px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "transparent", color: "var(--color-text-secondary)",
            fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer",
          }}>
            Отмена
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            padding: "9px 18px", borderRadius: "var(--border-radius-md)",
            border: "none", background: deleting ? "#e88f8f" : "#A32D2D",
            color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13,
            fontWeight: 500, cursor: "pointer",
          }}>
            {deleting ? "Удаление…" : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OperationCategories() {
  const [cats, setCats]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [panelCat, setPanelCat]   = useState(null);
  const [toDelete, setToDelete]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const q = query(userCol(COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => { setCats(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err)  => { console.error(err); setError("Ошибка загрузки: " + err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  const filtered = useCallback(() => {
    const q = search.toLowerCase();
    return cats.filter((c) => {
      const tabOk    = activeTab === "all" || c.kind === activeTab;
      const searchOk = !q || c.name?.toLowerCase().includes(q) || c.desc?.toLowerCase().includes(q);
      return tabOk && searchOk;
    });
  }, [cats, activeTab, search]);

  const vis = filtered();
  const statOf = (type) => vis.filter((c) => c.type === type).length;

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const { id, ...data } = form;
      if (id) {
        await updateDoc(userDoc(COLLECTION, id), { ...data });
      } else {
        await addDoc(userCol(COLLECTION), { ...data, createdAt: serverTimestamp() });
      }
      setPanelCat(null);
    } catch (err) {
      console.error(err);
      setError("Ошибка сохранения: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(userDoc(COLLECTION, toDelete.id));
      setToDelete(null);
    } catch (err) {
      console.error(err);
      setError("Ошибка удаления: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>

      <main style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Учетные статьи</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Статьи операционной деятельности бизнеса
            </p>
          </div>
          <button
            onClick={() => setPanelCat(EMPTY_FORM)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", background: "#3b62d6", color: "#fff",
              border: "none", borderRadius: "var(--border-radius-md)",
              fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            + Создать статью
          </button>
        </div>

        {error && (
          <div style={{ margin: "12px 0", padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, margin: "20px 0" }}>
          {[
            { label: "Всего",           value: vis.length,       color: "var(--color-text-primary)" },
            { label: "Операционная",    value: statOf("op"),     color: "#1D9E75" },
            { label: "Финансовая",      value: statOf("fin"),    color: "#378ADD" },
            { label: "Инвестиционная",  value: statOf("inv"),    color: "#BA7517" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {KIND_TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                padding: "6px 14px", borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)",
                background: activeTab === t.key ? "var(--color-background-info)" : "var(--color-background-secondary)",
                color: activeTab === t.key ? "var(--color-text-info)" : "var(--color-text-secondary)",
                fontSize: 13, fontWeight: activeTab === t.key ? 500 : 400,
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 9, pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск статьи…"
              style={{ ...inp, paddingLeft: 28, width: 200 }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.6fr 36px",
            alignItems: "center", gap: 14, padding: "10px 18px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
          }}>
            {["Название", "Вид деятельности", "Тип ОПиУ", "Описание", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
          ) : vis.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
              {search ? "Ничего не найдено" : "Нет статей. Создайте первую →"}
            </div>
          ) : (
            vis.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} onEdit={(c) => setPanelCat(c)} onDelete={(c) => setToDelete(c)} />
            ))
          )}
        </div>

      </main>

      {panelCat !== null && (
        <CategoryForm
          initial={panelCat?.id ? panelCat : null}
          onSave={handleSave}
          onCancel={() => setPanelCat(null)}
          saving={saving}
        />
      )}

      {toDelete && (
        <DeleteModal
          cat={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          deleting={deleting}
        />
      )}

    </div>
  );
}
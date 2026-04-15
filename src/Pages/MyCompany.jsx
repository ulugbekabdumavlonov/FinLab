import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);
const userDoc = (name, id) => doc(db, "users", auth.currentUser.uid, name, id);

// ─── Avatar color по первой букве ─────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#E6F1FB", "#185FA5"],
  ["#EAF3DE", "#3B6D11"],
  ["#FAEEDA", "#854F0B"],
  ["#FCEBEB", "#A32D2D"],
  ["#EEEDFE", "#3C3489"],
  ["#E1F5EE", "#0F6E56"],
];
function getAvatarColors(name) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const ORG_TYPES = ["ООО", "АО", "ИП", "ЧП", "ГУП", "Другое"];

const EMPTY_FORM = {
  name: "",
  fullName: "",
  inn: "",
  orgType: "ООО",
  comment: "",
};

// ─── Input style ──────────────────────────────────────────────────────────────
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

// ─── Modal: создать / редактировать ───────────────────────────────────────────
function EntityModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-secondary)", width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px 28px 20px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {isEdit ? "Редактировать юрлицо" : "Создать юрлицо"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Краткое название *</div>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Напр. Finlab"
              style={inp}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Полное наименование</div>
            <input
              value={form.fullName || ""}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder='ООО «Финлаб Технологии»'
              style={inp}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>ИНН</div>
            <input
              value={form.inn || ""}
              onChange={(e) => set("inn", e.target.value)}
              placeholder="1234567890"
              style={inp}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Тип организации</div>
            <select
              value={form.orgType || "ООО"}
              onChange={(e) => set("orgType", e.target.value)}
              style={{ ...inp }}
            >
              {ORG_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Описание</div>
            <textarea
              value={form.comment || ""}
              onChange={(e) => set("comment", e.target.value)}
              placeholder="Описание деятельности юрлица..."
              rows={3}
              style={{ ...inp, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", background: "none", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "9px 22px", background: saving ? "#8fa8e8" : "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Карточка юрлица ──────────────────────────────────────────────────────────
function EntityCard({ item, accounts, onEdit, onDelete }) {
  const [avatarBg, avatarColor] = getAvatarColors(item.name);
  const entityAccounts = accounts.filter((a) => a.entityId === item.id);

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: avatarColor, flexShrink: 0 }}>
            {item.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.name}</div>
            {item.fullName && (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>{item.fullName}</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(item)}
            style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Изменить
          </button>
          <button
            onClick={() => onDelete(item.id)}
            style={{ fontSize: 12, padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "#A32D2D", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Удалить
          </button>
        </div>
      </div>

      {/* ИНН + Тип */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>ИНН</div>
          <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{item.inn || "—"}</div>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Тип</div>
          <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{item.orgType || "—"}</div>
        </div>
      </div>

      {/* Описание */}
      {item.comment && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>Описание</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{item.comment}</div>
        </div>
      )}

      {/* Счета */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: "auto" }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Счета {entityAccounts.length === 0 && <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
        </div>
        {entityAccounts.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Нет привязанных счетов</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entityAccounts.map((acc) => (
            <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{acc.name}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: Number(acc.balance) >= 0 ? "#3B6D11" : "#A32D2D" }}>
                {Number(acc.balance || 0).toLocaleString("ru-RU")} {acc.currency || "UZS"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LegalEntities() {
  const [entities, setEntities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", item }
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [entSnap, accSnap] = await Promise.all([
        getDocs(userCol("legal_entities")),
        getDocs(userCol("accounts")),
      ]);
      setEntities(entSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAccounts(accSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Ошибка загрузки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await updateDoc(userDoc("legal_entities", form.id), {
          name:     form.name,
          fullName: form.fullName || "",
          inn:      form.inn      || "",
          orgType:  form.orgType  || "",
          comment:  form.comment  || "",
        });
        setEntities((prev) => prev.map((e) => e.id === form.id ? { ...e, ...form } : e));
      } else {
        const ref = await addDoc(userCol("legal_entities"), {
          name:      form.name,
          fullName:  form.fullName || "",
          inn:       form.inn      || "",
          orgType:   form.orgType  || "",
          comment:   form.comment  || "",
          createdAt: serverTimestamp(),
        });
        setEntities((prev) => [...prev, { ...form, id: ref.id }]);
      }
      setModal(null);
    } catch (e) {
      setError("Ошибка сохранения: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить юрлицо? Счета останутся.")) return;
    try {
      await deleteDoc(userDoc("legal_entities", id));
      setEntities((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError("Ошибка удаления: " + e.message);
    }
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", padding: "28px 32px" }}>

      {modal && (
        <EntityModal
          initial={modal.mode === "edit" ? modal.item : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Мои юрлица</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {entities.length} юрлиц · {accounts.length} счетов
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          + Создать юрлицо
        </button>
      </div>

      {error && (
        <div style={{ margin: "12px 0", padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>
          Загрузка…
        </div>
      ) : entities.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: "center", padding: "60px 24px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
          <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 12 }}>Нет юрлиц</div>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{ padding: "8px 20px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Создать первое юрлицо
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {entities.map((item) => (
            <EntityCard
              key={item.id}
              item={item}
              accounts={accounts}
              onEdit={(item) => setModal({ mode: "edit", item })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

    </div>
  );
}
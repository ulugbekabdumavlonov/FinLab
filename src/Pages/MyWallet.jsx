import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { updateDoc, deleteDoc, doc, collection, addDoc, getDocs } from "firebase/firestore";

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

const ACCOUNT_TYPES = ["Наличный", "Банковский", "Расчётный", "Карточный", "Кредитный"];
const CURRENCIES    = ["UZS", "USD", "EUR", "RUB"];

const EMPTY_FORM = {
  name: "", entityId: "", entityName: "",
  type: "Наличный", balance: 0,
  balanceDate: new Date().toISOString().slice(0, 10),
  currency: "UZS", comment: "",
};

// ─── Shared input style ───────────────────────────────────────────────────────
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

// ─── Форматирование даты ──────────────────────────────────────────────────────
const MONTH_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MONTH_SHORT[parseInt(m) - 1]} ${y}`;
}

// ─── Карточка счёта ───────────────────────────────────────────────────────────
function AccountCard({ account, onEdit, onDelete }) {
  const [avatarBg, avatarColor] = getAvatarColors(account.name);
  const balance = Number(account.balance || 0);
  const isPos   = balance >= 0;

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: 20, display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9,
            background: avatarBg, color: avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 500, flexShrink: 0,
          }}>
            {account.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{account.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 1 }}>
              {account.entityName || "Без юрлица"}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 11, padding: "3px 8px", borderRadius: 20,
          background: avatarBg, color: avatarColor, fontWeight: 500,
        }}>
          {account.currency || "UZS"}
        </span>
      </div>

      {/* Баланс */}
      <div style={{
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        padding: "12px 14px", marginBottom: 10,
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Баланс
          {account.balanceDate && (
            <span style={{ marginLeft: 6, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              на {fmtDate(account.balanceDate)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: isPos ? "#3B6D11" : "#A32D2D" }}>
          {isPos ? "" : "−"}{Math.abs(balance).toLocaleString("ru-RU")} {account.currency || "UZS"}
        </div>
      </div>

      {/* Тип + Валюта */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Тип</div>
          <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{account.type || "—"}</div>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "9px 12px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Валюта</div>
          <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500 }}>{account.currency || "UZS"}</div>
        </div>
      </div>

      {/* Комментарий */}
      {account.comment && (
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          padding: "9px 12px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>Комментарий</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{account.comment}</div>
        </div>
      )}

      {/* Кнопки */}
      <div style={{ display: "flex", gap: 8, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: "auto" }}>
        <button
          onClick={() => onEdit(account)}
          style={{ flex: 1, padding: "7px 0", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          Изменить
        </button>
        <button
          onClick={() => onDelete(account.id)}
          style={{ padding: "7px 12px", fontSize: 12, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "#A32D2D", cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

// ─── Модал создания / редактирования ──────────────────────────────────────────
function AccountModal({ initial, entities, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleEntityChange = (id) => {
    const ent = entities.find((e) => e.id === id);
    set("entityId",   ent?.id   || "");
    set("entityName", ent?.name || "");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 }}>
      <div style={{
        background: "var(--color-background-primary)",
        borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-secondary)",
        width: 520, maxWidth: "95vw", maxHeight: "90vh",
        overflowY: "auto", padding: "28px 28px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {isEdit ? "Редактировать счёт" : "Создать счёт"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-tertiary)" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

          {/* Название */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Название счёта *</div>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Напр. Ipotekabank" style={inp} />
          </div>

          {/* Юрлицо */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Юрлицо</div>
            <select value={form.entityId || ""} onChange={(e) => handleEntityChange(e.target.value)} style={inp}>
              <option value="">— Без юрлица</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Тип */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Тип счёта</div>
            <select value={form.type || "Наличный"} onChange={(e) => set("type", e.target.value)} style={inp}>
              {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Валюта */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Валюта</div>
            <select value={form.currency || "UZS"} onChange={(e) => set("currency", e.target.value)} style={inp}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Начальный баланс */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Начальный баланс</div>
            <input type="number" value={form.balance} onChange={(e) => set("balance", Number(e.target.value))} placeholder="0" style={inp} />
          </div>

          {/* Дата начального баланса */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Дата баланса</div>
            <input type="date" value={form.balanceDate || ""} onChange={(e) => set("balanceDate", e.target.value)} style={inp} />
          </div>

          {/* Комментарий */}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Комментарий</div>
            <textarea
              value={form.comment || ""}
              onChange={(e) => set("comment", e.target.value)}
              placeholder="Необязательно…"
              rows={2}
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyWallet() {
  const [accounts,  setAccounts]  = useState([]);
  const [entities,  setEntities]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState(null);
  const [error,     setError]     = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [accSnap, entSnap] = await Promise.all([
        getDocs(userCol("accounts")),
        getDocs(userCol("legal_entities")),
      ]);
      setAccounts(accSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setEntities(entSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Ошибка загрузки: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = accounts.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (form) => {
    try {
      if (form.id) {
        const { id, ...data } = form;
        await updateDoc(userDoc("accounts", id), data);
        setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
      } else {
        const ref = await addDoc(userCol("accounts"), form);
        setAccounts((prev) => [...prev, { ...form, id: ref.id }]);
      }
      setModal(null);
    } catch (e) {
      setError("Ошибка сохранения: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить счёт?")) return;
    try {
      await deleteDoc(userDoc("accounts", id));
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError("Ошибка удаления: " + e.message);
    }
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", padding: "28px 32px" }}>

      {modal && (
        <AccountModal
          initial={modal.account || null}
          entities={entities}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Мои счета</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {accounts.length} счетов · {entities.length} юрлиц
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 9, pointerEvents: "none", color: "var(--color-text-tertiary)" }} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск счёта…"
              style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, outline: "none", width: 180 }}
            />
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Создать счёт
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: "12px 0", padding: "10px 14px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-danger)" }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14 }}>Загрузка…</div>
      ) : accounts.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: "center", padding: "60px 24px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
          <div style={{ fontSize: 15, color: "var(--color-text-tertiary)", marginBottom: 12 }}>Нет счетов</div>
          <button
            onClick={() => setModal({ mode: "create" })}
            style={{ padding: "8px 20px", background: "#3b62d6", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            + Создать первый счёт
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(a) => setModal({ mode: "edit", account: a })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

    </div>
  );
}
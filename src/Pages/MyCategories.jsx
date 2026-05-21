/**
 * OperationCategories.jsx — Полная переработка
 *
 * Исправлено:
 * - useMemo вместо useCallback для filtered
 * - getCompanyId зафиксирован в useEffect
 * - PNL_OPTIONS на русском с техническими ключами отдельно
 * - Блокировка удаления если есть транзакции
 * - Дизайн-токены совпадают с CashFlow/AccrualsPage
 *
 * Добавлено:
 * - Привязка к разделам P&L и Баланса
 * - Иерархия категорий (родитель → подстатьи)
 * - Drag-and-drop сортировка
 * - Импорт стандартного набора
 * - Счётчик транзакций на категорию
 * - Bulk-выбор и bulk-действия
 * - Поиск + фильтры в стиле CashFlow
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Firestore helpers ────────────────────────────────────────────────────────
const userCol = (uid, name) => collection(db, "users", uid, name);
const userDoc = (uid, col, id) => doc(db, "users", uid, col, id);
const COLLECTION = "operation_categories";

// ─── Design tokens — идентичны CashFlow ──────────────────────────────────────
const C = {
  ink:      "#111827",
  inkMid:   "#374151",
  inkLight: "#9ca3af",
  inkFaint: "#d1d5db",
  surface:    "#ffffff",
  surfaceAlt: "#f9fafb",
  border:    "#e5e7eb",
  borderMid: "#d1d5db",
  pos:   "#15803d", posBg: "#f0fdf4",
  neg:   "#b91c1c", negBg: "#fef2f2",
  accent:   "#2563eb", accentBg: "#eff6ff",
  amber:   "#b45309", amberBg: "#fffbeb",
};

// ─── Справочники ──────────────────────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { key: "op",  label: "Операционная",   color: "#15803d", bg: "#f0fdf4", text: "#166534" },
  { key: "fin", label: "Финансовая",     color: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
  { key: "inv", label: "Инвестиционная", color: "#b45309", bg: "#fffbeb", text: "#92400e" },
];

const KIND_OPTIONS = [
  { key: "income",   label: "Поступление" },
  { key: "expense",  label: "Списание"    },
  { key: "transfer", label: "Перевод"     },
];

// P&L разделы с техническими ключами
const PNL_SECTIONS = [
  { key: "",                    label: "— Не указано"              },
  { key: "revenue",             label: "Выручка"                   },
  { key: "cogs",                label: "Себестоимость (COGS)"      },
  { key: "gross_profit",        label: "Валовая прибыль"           },
  { key: "opex_commercial",     label: "Коммерческие расходы"      },
  { key: "opex_admin",          label: "Административные расходы"  },
  { key: "opex_general",        label: "Общепроизводственные"      },
  { key: "ebitda",              label: "EBITDA"                    },
  { key: "depreciation",        label: "Амортизация"               },
  { key: "ebit",                label: "EBIT"                      },
  { key: "interest",            label: "Проценты и финансирование"  },
  { key: "tax",                 label: "Налог на прибыль"          },
  { key: "net_profit",          label: "Чистая прибыль"            },
  { key: "below_net",           label: "Ниже чистой прибыли"       },
];

// Разделы Баланса
const BALANCE_SECTIONS = [
  { key: "",                    label: "— Не указано"              },
  { key: "current_assets",      label: "Оборотные активы"          },
  { key: "fixed_assets",        label: "Внеоборотные активы"       },
  { key: "current_liabilities", label: "Краткосрочные обязательства"},
  { key: "long_liabilities",    label: "Долгосрочные обязательства" },
  { key: "equity",              label: "Капитал и резервы"         },
  { key: "cash",                label: "Денежные средства"         },
  { key: "receivables",         label: "Дебиторская задолженность"  },
  { key: "payables",            label: "Кредиторская задолженность" },
  { key: "inventory",           label: "Запасы"                    },
];

const EMPTY_FORM = {
  name: "", kind: "expense", type: "op",
  pnlSection: "", balanceSection: "",
  desc: "", lock: false, sub: false,
  balance: false, manual: false,
  parentId: "", sortOrder: 0,
};

// Стандартный набор категорий
const DEFAULT_CATEGORIES = [
  { name: "Выручка от продаж",       kind: "income",   type: "op",  pnlSection: "revenue",         balanceSection: "" },
  { name: "Выручка от услуг",        kind: "income",   type: "op",  pnlSection: "revenue",         balanceSection: "" },
  { name: "Себестоимость товаров",   kind: "expense",  type: "op",  pnlSection: "cogs",            balanceSection: "" },
  { name: "Зарплата сотрудников",    kind: "expense",  type: "op",  pnlSection: "opex_admin",      balanceSection: "payables" },
  { name: "Аренда офиса",            kind: "expense",  type: "op",  pnlSection: "opex_admin",      balanceSection: "" },
  { name: "Маркетинг и реклама",     kind: "expense",  type: "op",  pnlSection: "opex_commercial", balanceSection: "" },
  { name: "Логистика",               kind: "expense",  type: "op",  pnlSection: "opex_commercial", balanceSection: "" },
  { name: "IT и подписки",           kind: "expense",  type: "op",  pnlSection: "opex_admin",      balanceSection: "" },
  { name: "Налоги и сборы",          kind: "expense",  type: "op",  pnlSection: "tax",             balanceSection: "payables" },
  { name: "Банковские комиссии",     kind: "expense",  type: "fin", pnlSection: "interest",        balanceSection: "" },
  { name: "Кредит — выдача",         kind: "expense",  type: "fin", pnlSection: "below_net",       balanceSection: "long_liabilities" },
  { name: "Кредит — погашение",      kind: "expense",  type: "fin", pnlSection: "below_net",       balanceSection: "long_liabilities" },
  { name: "Дивиденды",               kind: "expense",  type: "fin", pnlSection: "below_net",       balanceSection: "equity" },
  { name: "Инвестиции в оборудование", kind: "expense", type: "inv", pnlSection: "",              balanceSection: "fixed_assets" },
  { name: "Инвестиции в разработку", kind: "expense",  type: "inv", pnlSection: "",              balanceSection: "fixed_assets" },
  { name: "Перевод между счетами",   kind: "transfer", type: "op",  pnlSection: "",              balanceSection: "cash" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const activityOf = (key) => ACTIVITY_TYPES.find(t => t.key === key) ?? ACTIVITY_TYPES[0];
const pnlLabelOf = (key) => PNL_SECTIONS.find(s => s.key === key)?.label || "—";
const balLabelOf = (key) => BALANCE_SECTIONS.find(s => s.key === key)?.label || "—";
const kindLabelOf = (key) => KIND_OPTIONS.find(k => k.key === key)?.label || key;

// ─── Общие компоненты ─────────────────────────────────────────────────────────
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

function ActivityBadge({ typeKey }) {
  const t = activityOf(typeKey);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500, padding: "2px 9px",
      borderRadius: 20, background: t.bg, color: t.text,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
      {t.label}
    </span>
  );
}

function SectionTag({ label, color = C.accent, bg = C.accentBg }) {
  if (!label || label === "—") return <span style={{ fontSize: 11, color: C.inkFaint }}>—</span>;
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 4,
      background: bg, color, border: `1px solid ${color}22`,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: C.surface, padding: "14px 18px",
      borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 11, color: C.inkLight, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || C.ink, letterSpacing: "-0.5px" }}>{value}</div>
    </div>
  );
}

const inpBase = {
  fontFamily: "inherit", fontSize: 13, padding: "8px 11px",
  border: `1px solid ${C.border}`, borderRadius: 6,
  background: C.surfaceAlt, color: C.ink, outline: "none",
  width: "100%", boxSizing: "border-box",
};

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.inkLight }}>{hint}</span>}
    </div>
  );
}

// ─── TypeSelector ─────────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
      {ACTIVITY_TYPES.map((t) => {
        const sel = value === t.key;
        return (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} style={{
            padding: "9px 6px", borderRadius: 6, cursor: "pointer", textAlign: "center",
            border: sel ? `1.5px solid ${t.color}` : `1px solid ${C.border}`,
            background: sel ? t.bg : C.surfaceAlt,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.color, margin: "0 auto 5px" }} />
            <div style={{ fontSize: 11, fontWeight: sel ? 500 : 400, color: sel ? t.text : C.inkLight, fontFamily: "inherit" }}>
              {t.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── CategoryForm (боковая панель) ────────────────────────────────────────────
function CategoryForm({ initial, allCats, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  useEffect(() => { setForm(initial ?? EMPTY_FORM); }, [initial]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial?.id;

  const parents = useMemo(() =>
    allCats.filter(c => !c.parentId && c.id !== initial?.id),
    [allCats, initial]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <aside style={{
      width: 380, minWidth: 340, flexShrink: 0,
      borderLeft: `1px solid ${C.border}`,
      background: C.surface,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0, overflowY: "auto",
    }}>
      {/* Шапка */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 20px 14px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>
            {isEdit ? "Редактировать статью" : "Новая статья"}
          </div>
          <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
            Настройка учётной категории
          </div>
        </div>
        <button onClick={onCancel} style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
          background: "transparent", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: C.inkLight,
        }}>✕</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, padding: "18px 20px", flex: 1 }}>

        {/* Название */}
        <Field label="Название статьи *">
          <input style={inpBase} value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="Напр. Выручка от продаж" required />
        </Field>

        {/* Вид деятельности */}
        <Field label="Вид деятельности">
          <TypeSelector value={form.type} onChange={v => set("type", v)} />
        </Field>

        {/* Тип операции */}
        <Field label="Тип операции">
          <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            {KIND_OPTIONS.map((k, i) => {
              const active = form.kind === k.key;
              return (
                <button key={k.key} type="button" onClick={() => set("kind", k.key)} style={{
                  flex: 1, fontFamily: "inherit", fontSize: 12, padding: "8px 0",
                  border: "none", borderLeft: i > 0 ? `1px solid ${C.border}` : "none",
                  background: active ? C.accentBg : C.surfaceAlt,
                  color: active ? C.accent : C.inkLight,
                  cursor: "pointer", fontWeight: active ? 500 : 400,
                }}>{k.label}</button>
              );
            })}
          </div>
        </Field>

        {/* Родительская категория */}
        <Field label="Родительская статья" hint="Оставьте пустым для статьи верхнего уровня">
          <select value={form.parentId || ""} onChange={e => set("parentId", e.target.value)} style={{ ...inpBase, cursor: "pointer" }}>
            <option value="">— Верхний уровень</option>
            {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        {/* Разделитель */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight, marginBottom: 12 }}>
            Привязка к отчётам
          </div>

          {/* P&L секция */}
          <div style={{ marginBottom: 12 }}>
            <Field label="Раздел P&L (Отчёт о прибылях и убытках)" hint="Определяет строку в P&L отчёте">
              <select value={form.pnlSection || ""} onChange={e => set("pnlSection", e.target.value)}
                style={{ ...inpBase, cursor: "pointer" }}>
                {PNL_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Баланс секция */}
          <Field label="Раздел Баланса" hint="Определяет строку в балансовом отчёте">
            <select value={form.balanceSection || ""} onChange={e => set("balanceSection", e.target.value)}
              style={{ ...inpBase, cursor: "pointer" }}>
              {BALANCE_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        {/* Описание */}
        <Field label="Описание">
          <textarea style={{ ...inpBase, resize: "vertical", minHeight: 70 }}
            value={form.desc} onChange={e => set("desc", e.target.value)}
            placeholder="Краткое описание назначения статьи" />
        </Field>

        {/* Параметры */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight, marginBottom: 10 }}>
            Параметры
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["lock",    "Системная (нельзя удалить)"],
              ["sub",     "Разрешены подстатьи"],
              ["balance", "Отображать в балансе"],
              ["manual",  "Ручной ввод в P&L"],
            ].map(([key, label]) => (
              <label key={key} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 6,
                border: `1px solid ${form[key] ? C.accent : C.border}`,
                background: form[key] ? C.accentBg : "transparent",
                fontSize: 13, cursor: "pointer", color: C.ink,
              }}>
                <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: C.accent }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}`, marginTop: "auto" }}>
          <button type="button" onClick={onCancel} style={{
            padding: "9px 16px", borderRadius: 6,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.inkMid, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
          }}>Отмена</button>
          <button type="submit" disabled={saving} style={{
            flex: 1, padding: "9px 0", borderRadius: 6,
            border: "none", background: saving ? C.border : C.accent,
            color: saving ? C.inkLight : "#fff",
            fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>
            {saving ? "Сохранение…" : (isEdit ? "Сохранить" : "Создать")}
          </button>
        </div>
      </form>
    </aside>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────
function DeleteModal({ cat, txCount, onConfirm, onCancel, deleting }) {
  const blocked = txCount > 0;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500,
    }}>
      <div style={{
        background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
        padding: "24px 28px", width: 400, maxWidth: "90vw",
        boxShadow: "0 8px 32px rgba(15,23,42,0.14)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: C.ink, marginBottom: 8 }}>
          Удалить «{cat.name}»?
        </div>
        {blocked ? (
          <div style={{
            padding: "10px 14px", background: C.negBg, border: `1px solid #fecaca`,
            borderRadius: 6, fontSize: 13, color: C.neg, marginBottom: 20,
          }}>
            Нельзя удалить: статья используется в {txCount} транзакци{txCount === 1 ? "и" : "ях"}.
            Сначала переназначьте транзакции.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.inkLight, marginBottom: 20 }}>
            Это действие нельзя отменить. Статья будет удалена из всех отчётов.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 6, border: `1px solid ${C.border}`,
            background: "transparent", color: C.inkMid, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
          }}>Отмена</button>
          {!blocked && (
            <button onClick={onConfirm} disabled={deleting} style={{
              padding: "8px 18px", borderRadius: 6, border: "none",
              background: deleting ? "#e88f8f" : C.neg,
              color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>
              {deleting ? "Удаление…" : "Удалить"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────
function ImportModal({ existing, onImport, onCancel, importing }) {
  const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
  const [selected, setSelected] = useState(() =>
    new Set(DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name.toLowerCase())).map((_, i) => i))
  );

  const toggle = (i) => setSelected(s => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const toggleAll = () => {
    if (selected.size === DEFAULT_CATEGORIES.length) setSelected(new Set());
    else setSelected(new Set(DEFAULT_CATEGORIES.map((_, i) => i)));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500,
    }}>
      <div style={{
        background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
        width: 560, maxWidth: "92vw", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(15,23,42,0.14)",
      }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.ink }}>Импорт стандартных статей</div>
          <div style={{ fontSize: 12, color: C.inkLight, marginTop: 3 }}>
            Выберите статьи для добавления. Уже существующие отмечены серым.
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "10px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
            <input type="checkbox"
              checked={selected.size === DEFAULT_CATEGORIES.length}
              onChange={toggleAll}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: C.accent }}
            />
            <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Выбрать все ({DEFAULT_CATEGORIES.length})</span>
          </div>

          {DEFAULT_CATEGORIES.map((cat, i) => {
            const exists = existingNames.has(cat.name.toLowerCase());
            const act    = activityOf(cat.type);
            return (
              <label key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 6px", borderRadius: 6, cursor: exists ? "default" : "pointer",
                opacity: exists ? 0.45 : 1,
                background: selected.has(i) && !exists ? C.accentBg : "transparent",
              }}>
                <input type="checkbox" checked={selected.has(i)} disabled={exists}
                  onChange={() => !exists && toggle(i)}
                  style={{ width: 14, height: 14, cursor: exists ? "default" : "pointer", accentColor: C.accent }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.ink, fontWeight: 400 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: C.inkLight }}>
                    {kindLabelOf(cat.kind)} · {pnlLabelOf(cat.pnlSection) !== "—" ? pnlLabelOf(cat.pnlSection) : ""}
                  </div>
                </div>
                <ActivityBadge typeKey={cat.type} />
                {exists && <span style={{ fontSize: 10, color: C.inkFaint }}>уже есть</span>}
              </label>
            );
          })}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 6, border: `1px solid ${C.border}`,
            background: "transparent", color: C.inkMid, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
          }}>Отмена</button>
          <button
            onClick={() => onImport(DEFAULT_CATEGORIES.filter((_, i) => selected.has(i)))}
            disabled={importing || selected.size === 0}
            style={{
              padding: "8px 22px", borderRadius: 6, border: "none",
              background: importing || selected.size === 0 ? C.border : C.accent,
              color: importing || selected.size === 0 ? C.inkLight : "#fff",
              fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            {importing ? "Импорт…" : `Добавить ${selected.size} статей`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CategoryRow({ cat, txCount, depth, selected, onSelect, onEdit, onDelete, onDragStart, onDragOver, onDrop }) {
  const [hovered, setHovered] = useState(false);
  const isChild = depth > 0;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(cat.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(cat.id); }}
      onDrop={() => onDrop(cat.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(cat)}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1.6fr 1fr 1fr 1.2fr 80px 36px",
        alignItems: "center", gap: 10,
        padding: `10px 16px 10px ${16 + depth * 20}px`,
        borderBottom: `1px solid ${C.border}`,
        background: selected ? C.accentBg : hovered ? C.surfaceAlt : C.surface,
        cursor: "pointer", transition: "background 0.1s",
        borderLeft: isChild ? `2px solid ${C.accent}22` : "none",
      }}
    >
      {/* Checkbox */}
      <div onClick={e => { e.stopPropagation(); onSelect(cat.id); }}>
        <input type="checkbox" checked={selected} onChange={() => {}}
          style={{ width: 14, height: 14, cursor: "pointer", accentColor: C.accent }}
        />
      </div>

      {/* Название */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isChild && <span style={{ fontSize: 10, color: C.inkFaint }}>↳</span>}
          <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{cat.name}</span>
          {cat.lock && <span style={{ fontSize: 10, color: C.inkFaint }}>🔒</span>}
        </div>
        <div style={{ fontSize: 11, color: C.inkLight, marginTop: 1 }}>
          {kindLabelOf(cat.kind)}{cat.sub ? " · подстатьи" : ""}
        </div>
      </div>

      {/* Вид деятельности */}
      <div><ActivityBadge typeKey={cat.type} /></div>

      {/* P&L раздел */}
      <div>
        <SectionTag
          label={pnlLabelOf(cat.pnlSection)}
          color={C.pos} bg={C.posBg}
        />
      </div>

      {/* Баланс раздел */}
      <div>
        <SectionTag
          label={balLabelOf(cat.balanceSection)}
          color={C.accent} bg={C.accentBg}
        />
      </div>

      {/* Транзакции */}
      <div style={{ textAlign: "center" }}>
        {txCount > 0 ? (
          <span style={{
            fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4,
            background: C.surfaceAlt, color: C.inkMid, border: `1px solid ${C.border}`,
          }}>{txCount}</span>
        ) : (
          <span style={{ fontSize: 11, color: C.inkFaint }}>—</span>
        )}
      </div>

      {/* Удалить */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(cat); }}
        style={{
          width: 28, height: 28, borderRadius: 6,
          border: `1px solid ${hovered ? C.neg : C.border}`,
          background: hovered ? C.negBg : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: hovered ? C.neg : C.inkFaint,
          opacity: hovered ? 1 : 0.4, transition: "all 0.15s",
        }}
        onClick={e => { e.stopPropagation(); onDelete(cat); }}
      >✕</button>
    </div>
  );
}

// ─── BulkBar ──────────────────────────────────────────────────────────────────
function BulkBar({ count, allCats, onChangeType, onChangePnl, onDelete, onClear }) {
  const [typeOpen, setTypeOpen] = useState(false);
  const [pnlOpen,  setPnlOpen]  = useState(false);

  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 10,
      background: C.ink, color: "#fff",
      padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 12,
      borderTop: `1px solid ${C.borderMid}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{count} выбрано</span>

      <div style={{ position: "relative" }}>
        <button onClick={() => setTypeOpen(v => !v)} style={{
          fontFamily: "inherit", fontSize: 12, padding: "6px 14px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
          color: "#fff", cursor: "pointer",
        }}>Изменить вид деятельности ▾</button>
        {typeOpen && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 0,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            boxShadow: "0 4px 16px rgba(15,23,42,0.12)", overflow: "hidden", minWidth: 180,
          }}>
            {ACTIVITY_TYPES.map(t => (
              <div key={t.key}
                onClick={() => { onChangeType(t.key); setTypeOpen(false); }}
                style={{
                  padding: "9px 14px", fontSize: 13, cursor: "pointer", color: C.ink,
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />
                {t.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button onClick={() => setPnlOpen(v => !v)} style={{
          fontFamily: "inherit", fontSize: 12, padding: "6px 14px", borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
          color: "#fff", cursor: "pointer",
        }}>Изменить раздел P&L ▾</button>
        {pnlOpen && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 0,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            boxShadow: "0 4px 16px rgba(15,23,42,0.12)", overflow: "hidden",
            minWidth: 240, maxHeight: 280, overflowY: "auto",
          }}>
            {PNL_SECTIONS.map(s => (
              <div key={s.key}
                onClick={() => { onChangePnl(s.key); setPnlOpen(false); }}
                style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: C.ink }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >{s.label}</div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onDelete} style={{
        fontFamily: "inherit", fontSize: 12, padding: "6px 14px", borderRadius: 6,
        border: "1px solid rgba(231,76,60,0.5)", background: "rgba(231,76,60,0.15)",
        color: "#fca5a5", cursor: "pointer", marginLeft: "auto",
      }}>Удалить выбранные</button>

      <button onClick={onClear} style={{
        fontFamily: "inherit", fontSize: 12, padding: "6px 12px", borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
        color: "rgba(255,255,255,0.6)", cursor: "pointer",
      }}>✕ Снять выбор</button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OperationCategories() {
  const [uid, setUid]             = useState(null);
  const [cats, setCats]           = useState([]);
  const [transactions, setTxs]    = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [activeTab,    setActiveTab]    = useState("all");
  const [filterType,   setFilterType]   = useState("all");
  const [filterReport, setFilterReport] = useState("all");
  const [search,       setSearch]       = useState("");

  const [panelCat,  setPanelCat]  = useState(null);
  const [toDelete,  setToDelete]  = useState(null);
  const [showImport, setShowImport] = useState(false);

  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [importing, setImporting] = useState(false);

  const [selected,  setSelected]  = useState(new Set());

  // drag-and-drop
  const dragId   = useRef(null);
  const dragOver = useRef(null);

  // ── Auth ──
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUid(u?.uid || null));
    return unsub;
  }, []);

  // ── Firestore ──
  useEffect(() => {
    if (!uid) return;
    const q = query(userCol(uid, COLLECTION), orderBy("sortOrder", "asc"));
    const u1 = onSnapshot(q,
      s => { setCats(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      e => { setError("Ошибка загрузки: " + e.message); setLoading(false); }
    );
    const u2 = onSnapshot(userCol(uid, "transactions"),
      s => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [uid]);

  // ── Счётчик транзакций по категории ──
  const txCountMap = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      const cat = tx.Category || tx.category || "";
      if (cat) map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [transactions]);

  // ── Фильтрация ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cats.filter(c => {
      if (activeTab !== "all" && c.kind !== activeTab) return false;
      if (filterType !== "all" && c.type !== filterType) return false;
      if (filterReport === "pnl" && !c.pnlSection) return false;
      if (filterReport === "balance" && !c.balanceSection) return false;
      if (filterReport === "unassigned" && (c.pnlSection || c.balanceSection)) return false;
      if (q && !c.name?.toLowerCase().includes(q) && !c.desc?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cats, activeTab, filterType, filterReport, search]);

  // ── Дерево: корни и дети ──
  const tree = useMemo(() => {
    const roots    = filtered.filter(c => !c.parentId);
    const childMap = {};
    for (const c of filtered) {
      if (c.parentId) {
        if (!childMap[c.parentId]) childMap[c.parentId] = [];
        childMap[c.parentId].push(c);
      }
    }
    return { roots, childMap };
  }, [filtered]);

  // ── KPI ──
  const kpi = useMemo(() => ({
    total: cats.length,
    op:    cats.filter(c => c.type === "op").length,
    fin:   cats.filter(c => c.type === "fin").length,
    inv:   cats.filter(c => c.type === "inv").length,
    withPnl:     cats.filter(c => c.pnlSection).length,
    withBalance: cats.filter(c => c.balanceSection).length,
    unassigned:  cats.filter(c => !c.pnlSection && !c.balanceSection).length,
  }), [cats]);

  // ── CRUD ──
  const handleSave = async (form) => {
    if (!uid) return;
    setSaving(true);
    try {
      const { id, ...data } = form;
      if (id) {
        await updateDoc(userDoc(uid, COLLECTION, id), data);
      } else {
        await addDoc(userCol(uid, COLLECTION), {
          ...data, sortOrder: cats.length, createdAt: serverTimestamp(),
        });
      }
      setPanelCat(null);
    } catch (e) {
      setError("Ошибка сохранения: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!uid || !toDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(userDoc(uid, COLLECTION, toDelete.id));
      setToDelete(null);
    } catch (e) {
      setError("Ошибка удаления: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (items) => {
    if (!uid) return;
    setImporting(true);
    try {
      const batch = writeBatch(db);
      items.forEach((item, i) => {
        const ref = doc(userCol(uid, COLLECTION));
        batch.set(ref, { ...item, sortOrder: cats.length + i, createdAt: serverTimestamp() });
      });
      await batch.commit();
      setShowImport(false);
    } catch (e) {
      setError("Ошибка импорта: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  // ── Bulk ──
  const handleBulkChangeType = async (typeKey) => {
    if (!uid) return;
    const batch = writeBatch(db);
    for (const id of selected) batch.update(userDoc(uid, COLLECTION, id), { type: typeKey });
    await batch.commit();
    setSelected(new Set());
  };

  const handleBulkChangePnl = async (pnlKey) => {
    if (!uid) return;
    const batch = writeBatch(db);
    for (const id of selected) batch.update(userDoc(uid, COLLECTION, id), { pnlSection: pnlKey });
    await batch.commit();
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    if (!uid) return;
    const canDelete = [...selected].filter(id => {
      const cat = cats.find(c => c.id === id);
      return cat && !cat.lock && !(txCountMap[cat.name] > 0);
    });
    if (!canDelete.length) return;
    const batch = writeBatch(db);
    for (const id of canDelete) batch.delete(userDoc(uid, COLLECTION, id));
    await batch.commit();
    setSelected(new Set());
  };

  // ── Drag-and-drop сортировка ──
  const handleDrop = async (targetId) => {
    if (!uid || dragId.current === targetId) return;
    const ids    = cats.map(c => c.id);
    const fromI  = ids.indexOf(dragId.current);
    const toI    = ids.indexOf(targetId);
    if (fromI < 0 || toI < 0) return;
    const reordered = [...cats];
    const [moved]   = reordered.splice(fromI, 1);
    reordered.splice(toI, 0, moved);
    const batch = writeBatch(db);
    reordered.forEach((c, i) => batch.update(userDoc(uid, COLLECTION, c.id), { sortOrder: i }));
    await batch.commit();
    dragId.current = null;
  };

  const toggleSelect = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
      <div style={{ fontSize: 13, color: C.inkLight }}>Загрузка данных…</div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: C.ink, display: "flex", minHeight: "100vh", background: C.surfaceAlt,
    }}>

      {/* ── Основной контент ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Заголовок */}
        <div style={{ padding: "24px 32px 0", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: -0.3 }}>Учётные статьи</h1>
              <p style={{ margin: "4px 0 0" }}>
                <span style={{ padding: "2px 8px", background: C.accentBg, color: C.accent, borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                  Справочник категорий · P&L · Баланс
                </span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowImport(true)} style={{
                fontFamily: "inherit", fontSize: 13, padding: "8px 16px", borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.surface, color: C.inkMid, cursor: "pointer",
              }}>Импорт стандартных</button>
              <button onClick={() => setPanelCat(EMPTY_FORM)} style={{
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                padding: "8px 18px", borderRadius: 6, border: "none",
                background: C.accent, color: "#fff", cursor: "pointer",
              }}>+ Создать статью</button>
            </div>
          </div>

          {/* KPI плитки */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            background: C.border, border: `1px solid ${C.border}`,
            borderRadius: 8, overflow: "hidden", marginBottom: 0,
          }}>
            <KpiCard label="Всего статей"    value={kpi.total} />
            <KpiCard label="Операционная"    value={kpi.op}    color={C.pos} />
            <KpiCard label="Финансовая"      value={kpi.fin}   color={C.accent} />
            <KpiCard label="Инвестиционная"  value={kpi.inv}   color={C.amber} />
            <KpiCard label="Привязаны к P&L" value={kpi.withPnl}     color={C.pos} />
            <KpiCard label="Привязаны к балансу" value={kpi.withBalance} color={C.accent} />
            <KpiCard label="Без привязки"    value={kpi.unassigned}  color={kpi.unassigned > 0 ? C.neg : C.inkLight} />
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div style={{
            margin: "12px 32px 0", padding: "10px 14px",
            background: C.negBg, border: `1px solid #fecaca`,
            borderRadius: 6, fontSize: 13, color: C.neg,
            display: "flex", justifyContent: "space-between",
          }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.neg }}>✕</button>
          </div>
        )}

        {/* Фильтры */}
        <div style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 32px",
          display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end",
        }}>
          {/* Поиск */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Поиск</div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Название статьи…"
              style={{
                fontFamily: "inherit", fontSize: 12, padding: "5px 9px",
                border: `0.5px solid ${C.borderMid}`, borderRadius: 4,
                background: C.surface, color: C.ink, outline: "none", width: 190,
              }}
            />
          </div>

          {/* Тип операции */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Тип</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["income","Поступление"],["expense","Списание"],["transfer","Перевод"]].map(([v,l]) => (
                <Pill key={v} label={l} active={activeTab === v} onClick={() => setActiveTab(v)} />
              ))}
            </div>
          </div>

          {/* Вид деятельности */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Вид деятельности</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["op","Операционная"],["fin","Финансовая"],["inv","Инвестиционная"]].map(([v,l]) => (
                <Pill key={v} label={l} active={filterType === v} onClick={() => setFilterType(v)} />
              ))}
            </div>
          </div>

          {/* Привязка к отчётам */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkLight }}>Привязка к отчёту</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[["all","Все"],["pnl","P&L"],["balance","Баланс"],["unassigned","Без привязки"]].map(([v,l]) => (
                <Pill key={v} label={l} active={filterReport === v} onClick={() => setFilterReport(v)} />
              ))}
            </div>
          </div>
        </div>

        {/* Таблица */}
        <div style={{ flex: 1, padding: "16px 32px 80px", overflow: "hidden" }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, overflow: "hidden",
          }}>
            {/* Шапка таблицы */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "32px 1.6fr 1fr 1fr 1.2fr 80px 36px",
              alignItems: "center", gap: 10,
              padding: "10px 16px", background: C.surfaceAlt,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <input type="checkbox"
                  checked={selected.size > 0 && selected.size === filtered.length}
                  onChange={() => {
                    if (selected.size === filtered.length) setSelected(new Set());
                    else setSelected(new Set(filtered.map(c => c.id)));
                  }}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: C.accent }}
                />
              </div>
              {["Название", "Вид деятельности", "Раздел P&L", "Раздел баланса", "Транзакции", ""].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: C.inkLight,
                }}>{h}</div>
              ))}
            </div>

            {/* Строки */}
            {filtered.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: C.inkLight, fontSize: 13 }}>
                {cats.length === 0
                  ? "Нет статей. Создайте первую или импортируйте стандартные →"
                  : "Ничего не найдено по фильтрам"}
              </div>
            ) : (
              tree.roots.map(cat => (
                <div key={cat.id}>
                  <CategoryRow
                    cat={cat} depth={0}
                    txCount={txCountMap[cat.name] || 0}
                    selected={selected.has(cat.id)}
                    onSelect={toggleSelect}
                    onEdit={c => setPanelCat(c)}
                    onDelete={c => setToDelete(c)}
                    onDragStart={id => { dragId.current = id; }}
                    onDragOver={id => { dragOver.current = id; }}
                    onDrop={handleDrop}
                  />
                  {(tree.childMap[cat.id] || []).map(child => (
                    <CategoryRow
                      key={child.id} cat={child} depth={1}
                      txCount={txCountMap[child.name] || 0}
                      selected={selected.has(child.id)}
                      onSelect={toggleSelect}
                      onEdit={c => setPanelCat(c)}
                      onDelete={c => setToDelete(c)}
                      onDragStart={id => { dragId.current = id; }}
                      onDragOver={id => { dragOver.current = id; }}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              ))
            )}

            {/* Итог */}
            {filtered.length > 0 && (
              <div style={{
                padding: "10px 16px", borderTop: `1px solid ${C.border}`,
                fontSize: 11, color: C.inkLight,
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{filtered.length} из {cats.length} статей</span>
                <span>перетащите строки для сортировки</span>
              </div>
            )}
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            allCats={cats}
            onChangeType={handleBulkChangeType}
            onChangePnl={handleBulkChangePnl}
            onDelete={handleBulkDelete}
            onClear={() => setSelected(new Set())}
          />
        )}
      </main>

      {/* ── Боковая панель формы ── */}
      {panelCat !== null && (
        <CategoryForm
          initial={panelCat?.id ? panelCat : null}
          allCats={cats}
          onSave={handleSave}
          onCancel={() => setPanelCat(null)}
          saving={saving}
        />
      )}

      {/* ── Модалы ── */}
      {toDelete && (
        <DeleteModal
          cat={toDelete}
          txCount={txCountMap[toDelete.name] || 0}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          deleting={deleting}
        />
      )}

      {showImport && (
        <ImportModal
          existing={cats}
          onImport={handleImport}
          onCancel={() => setShowImport(false)}
          importing={importing}
        />
      )}
    </div>
  );
}

/**
 * useAppStore.js
 *
 * Глобальный синглтон-кэш данных Firebase.
 * Данные грузятся из коллекции владельца (companyId) —
 * сотрудники видят те же данные что и owner.
 *
 * Использование:
 *   const { transactions, accounts, projects, categories, loading, refresh } = useAppStore();
 *
 * После мутации вызывай хелперы стора:
 *   store.addTransaction(tx)
 *   store.updateTransaction(id, patch)
 *   store.deleteTransaction(id)
 *   store.updateAccount(id, patch)
 *   store.refresh()
 */

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Возвращает uid владельца: для owner = его uid, для сотрудника = companyId
function getOwnerId() {
  const user = auth.currentUser;
  if (!user) return null;

  // AuthContext пишет companyId в кастомные поля через onSnapshot
  // Они доступны через auth.currentUser только если ты их туда записал.
  // Поэтому читаем из window.__finlab_user — туда AuthContext должен
  // сохранять актуальные данные (см. ниже как настроить).
  const stored = window.__finlab_user;
  if (stored?.companyId) return stored.companyId;

  return user.uid;
}

const userCol = (name) => {
  const ownerId = getOwnerId();
  if (!ownerId) throw new Error("Пользователь не авторизован");
  return collection(db, "users", ownerId, name);
};

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

// ─── Singleton state ──────────────────────────────────────────────────────────
const _cache = {
  transactions:     null,
  accounts:         null,
  projects:         null,
  categories:       null,
  categoriesFull:   null,
  legalEntities:    null,
  accountCurrencyMap: {},
  categoryTypeMap:  {},
  loading:          false,
  error:            null,
  promise:          null,
  loadedForOwner:   null, // uid владельца при последней загрузке
};

const _listeners = new Set();

function _notify() {
  _listeners.forEach((fn) => fn());
}

// ─── Загрузка данных ──────────────────────────────────────────────────────────
async function _loadAll(force = false) {
  const ownerId = getOwnerId();
  if (!ownerId) return;

  // Сбрасываем кэш если сменился владелец (например, сотрудник другой компании)
  if (_cache.loadedForOwner && _cache.loadedForOwner !== ownerId) {
    _resetCache();
  }

  if (!force && _cache.transactions !== null) return;
  if (_cache.loading && _cache.promise) return _cache.promise;

  _cache.loading = true;
  _cache.error   = null;
  _notify();

  _cache.promise = (async () => {
    try {
      const [txSnap, accSnap, projSnap, catSnap, entSnap] = await Promise.all([
        getDocs(userCol("transactions")),
        getDocs(userCol("accounts")),
        getDocs(userCol("projects")),
        getDocs(userCol("operation_categories")),
        getDocs(userCol("legal_entities")),
      ]);

      // ── Транзакции ──────────────────────────────────────────────────────────
      _cache.transactions = txSnap.docs.map((d) => {
        const data   = d.data();
        const amount = parseFloat(data.amount ?? 0);
        return {
          ...data,
          id:       d.id,
          _docId:   d.id,
          amount,
          _isoDate: normalizeDate(data.Date || data.date || ""),
          type:     data.type || (amount >= 0 ? "income" : "expense"),
          _source:  data.source || "",
        };
      });

      // ── Счета ───────────────────────────────────────────────────────────────
      _cache.accounts = accSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      _cache.accountCurrencyMap = {};
      _cache.accounts.forEach((acc) => {
        if (acc.name) _cache.accountCurrencyMap[acc.name] = acc.currency || "UZS";
      });

      // ── Проекты ─────────────────────────────────────────────────────────────
      _cache.projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── Категории ───────────────────────────────────────────────────────────
      const catDocs = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      _cache.categoriesFull = catDocs;
      _cache.categories = catDocs
        .map((d) => d.name || d.title || d.label || d.id)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ru"));

      _cache.categoryTypeMap = {};
      catDocs.forEach((d) => {
        if (d.name && d.type) {
          _cache.categoryTypeMap[(d.name || "").trim().toLowerCase()] = d.type;
        }
      });

      // ── Юрлица ──────────────────────────────────────────────────────────────
      _cache.legalEntities = entSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Запоминаем для кого загрузили
      _cache.loadedForOwner = ownerId;

    } catch (e) {
      _cache.error = e.message;
    } finally {
      _cache.loading = false;
      _cache.promise = null;
      _notify();
    }
  })();

  return _cache.promise;
}

function _resetCache() {
  _cache.transactions     = null;
  _cache.accounts         = null;
  _cache.projects         = null;
  _cache.categories       = null;
  _cache.categoriesFull   = null;
  _cache.legalEntities    = null;
  _cache.accountCurrencyMap = {};
  _cache.categoryTypeMap  = {};
  _cache.loading          = false;
  _cache.error            = null;
  _cache.promise          = null;
  _cache.loadedForOwner   = null;
}

// ─── Публичные мутаторы кэша ─────────────────────────────────────────────────
export const store = {
  addTransaction(tx) {
    _cache.transactions = [tx, ...(_cache.transactions || [])];
    _notify();
  },
  updateTransaction(id, patch) {
    _cache.transactions = (_cache.transactions || []).map((t) =>
      t.id === id ? { ...t, ...patch } : t
    );
    _notify();
  },
  deleteTransaction(id) {
    _cache.transactions = (_cache.transactions || []).filter((t) => t.id !== id);
    _notify();
  },

  addAccount(acc) {
    _cache.accounts = [...(_cache.accounts || []), acc];
    _notify();
  },
  updateAccount(id, patch) {
    _cache.accounts = (_cache.accounts || []).map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    const updated = (_cache.accounts || []).find((a) => a.id === id);
    if (updated?.name) _cache.accountCurrencyMap[updated.name] = updated.currency || "UZS";
    _notify();
  },
  deleteAccount(id) {
    _cache.accounts = (_cache.accounts || []).filter((a) => a.id !== id);
    _notify();
  },

  addProject(proj) {
    _cache.projects = [...(_cache.projects || []), proj];
    _notify();
  },
  updateProject(id, patch) {
    _cache.projects = (_cache.projects || []).map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
    _notify();
  },
  deleteProject(id) {
    _cache.projects = (_cache.projects || []).filter((p) => p.id !== id);
    _notify();
  },

  addCategory(cat) {
    _cache.categoriesFull = [...(_cache.categoriesFull || []), cat];
    _rebuildCategories();
    _notify();
  },
  updateCategory(id, patch) {
    _cache.categoriesFull = (_cache.categoriesFull || []).map((c) =>
      c.id === id ? { ...c, ...patch } : c
    );
    _rebuildCategories();
    _notify();
  },
  deleteCategory(id) {
    _cache.categoriesFull = (_cache.categoriesFull || []).filter((c) => c.id !== id);
    _rebuildCategories();
    _notify();
  },

  addLegalEntity(ent) {
    _cache.legalEntities = [...(_cache.legalEntities || []), ent];
    _notify();
  },
  updateLegalEntity(id, patch) {
    _cache.legalEntities = (_cache.legalEntities || []).map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    _notify();
  },
  deleteLegalEntity(id) {
    _cache.legalEntities = (_cache.legalEntities || []).filter((e) => e.id !== id);
    _notify();
  },

  refresh() {
    return _loadAll(true);
  },

  // Вызывай при logout чтобы очистить кэш
  reset: _resetCache,
};

function _rebuildCategories() {
  _cache.categories = (_cache.categoriesFull || [])
    .map((d) => d.name || d.title || d.label || d.id)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"));

  _cache.categoryTypeMap = {};
  (_cache.categoriesFull || []).forEach((d) => {
    if (d.name && d.type) {
      _cache.categoryTypeMap[(d.name || "").trim().toLowerCase()] = d.type;
    }
  });
}

// ─── React хук ───────────────────────────────────────────────────────────────
export function useAppStore() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    _listeners.add(listener);

    _loadAll();

    return () => _listeners.delete(listener);
  }, []);

  return {
    transactions:       (_cache.transactions ?? []).filter((t) => t._source !== "split"),
    allTransactions:    _cache.transactions ?? [],
    accounts:           _cache.accounts         ?? [],
    projects:           _cache.projects         ?? [],
    categories:         _cache.categories       ?? [],
    categoriesFull:     _cache.categoriesFull   ?? [],
    categoryTypeMap:    _cache.categoryTypeMap  ?? {},
    accountCurrencyMap: _cache.accountCurrencyMap ?? {},
    legalEntities:      _cache.legalEntities    ?? [],
    loading:            _cache.loading || _cache.transactions === null,
    error:              _cache.error,
    store,
    refresh:            store.refresh,
  };
}

/**
 * useAppStore.js
 *
 * Глобальный синглтон-кэш данных Firebase.
 * Данные грузятся один раз за сессию — все страницы используют этот хук
 * вместо прямых вызовов getDocs().
 *
 * Использование:
 *   const { transactions, accounts, projects, categories, loading, refresh } = useAppStore();
 *
 * После мутации (add/update/delete) вызывай хелперы стора
 * чтобы обновить кэш без нового запроса к Firebase:
 *   store.addTransaction(tx)
 *   store.updateTransaction(id, patch)
 *   store.deleteTransaction(id)
 *   store.updateAccount(id, patch)   // например, обновить баланс
 *   store.refresh()                  // принудительная перезагрузка всего
 */

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase"; // ← поправь путь если нужно

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userCol = (name) => collection(db, "users", auth.currentUser.uid, name);

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

// ─── Singleton state (живёт вне React, пока открыта вкладка) ─────────────────
const _cache = {
  transactions:    null,  // [] | null
  accounts:        null,
  projects:        null,
  categories:      null,  // string[]  — список имён
  categoriesFull:  null,  // [] — полные объекты (для CashFlow categoryTypeMap)
  legalEntities:   null,
  loading:         false,
  error:           null,
  promise:         null,  // текущий промис загрузки (дедупликация)
};

// Подписчики — React-компоненты, которые хотят обновиться при изменении кэша
const _listeners = new Set();

function _notify() {
  _listeners.forEach((fn) => fn());
}

// ─── Загрузка данных ──────────────────────────────────────────────────────────
async function _loadAll(force = false) {
  // Уже загружено и не принудительно — возвращаем сразу
  if (!force && _cache.transactions !== null) return;

  // Дедупликация: если уже грузим — ждём того же промиса
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
          // для CashFlow: сохраняем оригинальные поля тоже
        };
      });

      // ── Счета ───────────────────────────────────────────────────────────────
      _cache.accounts = accSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Карта "имя счёта → валюта" (нужна CashFlow)
      _cache.accountCurrencyMap = {};
      _cache.accounts.forEach((acc) => {
        if (acc.name) _cache.accountCurrencyMap[acc.name] = acc.currency || "UZS";
      });

      // ── Проекты ─────────────────────────────────────────────────────────────
      _cache.projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── Категории ───────────────────────────────────────────────────────────
      const catDocs = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      _cache.categoriesFull = catDocs;

      // Список имён (для Dropdown в OperationsPage / FilterModal)
      _cache.categories = catDocs
        .map((d) => d.name || d.title || d.label || d.id)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "ru"));

      // Карта "нормализованное имя → тип" (для CashFlow)
      _cache.categoryTypeMap = {};
      catDocs.forEach((d) => {
        if (d.name && d.type) {
          _cache.categoryTypeMap[(d.name || "").trim().toLowerCase()] = d.type;
        }
      });

      // ── Юрлица ──────────────────────────────────────────────────────────────
      _cache.legalEntities = entSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

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

// ─── Публичные мутаторы кэша ─────────────────────────────────────────────────
// Вызывай их ПОСЛЕ успешного updateDoc/addDoc/deleteDoc —
// они обновят кэш без лишнего запроса к Firebase.

export const store = {
  // Транзакции
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

  // Счета
  addAccount(acc) {
    _cache.accounts = [...(_cache.accounts || []), acc];
    _notify();
  },
  updateAccount(id, patch) {
    _cache.accounts = (_cache.accounts || []).map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    // Обновляем карту валют
    const updated = (_cache.accounts || []).find((a) => a.id === id);
    if (updated?.name) _cache.accountCurrencyMap[updated.name] = updated.currency || "UZS";
    _notify();
  },
  deleteAccount(id) {
    _cache.accounts = (_cache.accounts || []).filter((a) => a.id !== id);
    _notify();
  },

  // Проекты
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

  // Категории
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

  // Юрлица
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

  // Принудительно перезагрузить всё из Firebase
  refresh() {
    return _loadAll(true);
  },
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

    // Запускаем загрузку если ещё не грузили
    _loadAll();

    return () => _listeners.delete(listener);
  }, []);

  return {
    transactions:   _cache.transactions   ?? [],
    accounts:       _cache.accounts       ?? [],
    projects:       _cache.projects       ?? [],
    categories:     _cache.categories     ?? [],       // string[] — имена
    categoriesFull: _cache.categoriesFull ?? [],       // полные объекты
    categoryTypeMap:_cache.categoryTypeMap ?? {},      // { "зарплата": "op", ... }
    accountCurrencyMap: _cache.accountCurrencyMap ?? {},
    legalEntities:  _cache.legalEntities  ?? [],
    loading:        _cache.loading || _cache.transactions === null,
    error:          _cache.error,
    store,                                             // мутаторы
    refresh:        store.refresh,
  };
}

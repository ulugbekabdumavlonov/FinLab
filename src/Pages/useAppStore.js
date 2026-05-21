/**
 * useAppStore.js — нормализованная версия
 *
 * Операции хранят только ID-ссылки (categoryId, walletId, projectId).
 * Названия подтягиваются через lookup-хелперы из справочников в памяти.
 * Переименование счёта/статьи/проекта — мгновенно отражается везде.
 *
 * Lookup-хелперы:
 *   store.getWalletName(walletId)      → "Ipotekabank"
 *   store.getCategoryName(categoryId)  → "Аренда офиса"
 *   store.getProjectName(projectId)    → "Основной"
 *
 * Для обратной совместимости транзакции при чтении из Firestore
 * автоматически обогащаются полями walletName / category / direction
 * через lookup — чтобы весь существующий код продолжал работать.
 */

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOwnerId() {
  const user = auth.currentUser;
  if (!user) return null;
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
  transactions:       null,
  accounts:           null,
  projects:           null,
  categories:         null,   // string[]  — для дропдаунов
  categoriesFull:     null,   // объекты с id, name, type и т.д.
  legalEntities:      null,
  accountCurrencyMap: {},     // name → currency (обратная совместимость)
  categoryTypeMap:    {},     // name.toLowerCase() → type
  loading:            false,
  error:              null,
  promise:            null,
  loadedForOwner:     null,
};

const _listeners = new Set();
function _notify() { _listeners.forEach((fn) => fn()); }

// ─── Lookup-хелперы (ключевое отличие от старой версии) ───────────────────────

/**
 * Возвращает название счёта по его id.
 * Приоритет: id → name из _cache.accounts.
 * Также поддерживает поиск по имени (обратная совместимость).
 */
function _getWalletName(walletId) {
  if (!walletId) return "";
  const acc = (_cache.accounts || []).find((a) => a.id === walletId);
  if (acc) return acc.name || "";
  // Обратная совместимость: если передали старое имя вместо id
  const byName = (_cache.accounts || []).find((a) => a.name === walletId);
  return byName ? byName.name : walletId;
}

function _getWalletId(walletName) {
  if (!walletName) return "";
  const acc = (_cache.accounts || []).find((a) => a.name === walletName);
  return acc ? acc.id : "";
}

/**
 * Возвращает название категории по id.
 */
function _getCategoryName(categoryId) {
  if (!categoryId) return "";
  const cat = (_cache.categoriesFull || []).find((c) => c.id === categoryId);
  if (cat) return cat.name || "";
  // Обратная совместимость: если передали строку-название
  const byName = (_cache.categoriesFull || []).find((c) => c.name === categoryId);
  return byName ? byName.name : categoryId;
}

function _getCategoryId(categoryName) {
  if (!categoryName) return "";
  const cat = (_cache.categoriesFull || []).find((c) => c.name === categoryName);
  return cat ? cat.id : "";
}

/**
 * Возвращает название проекта по id.
 */
function _getProjectName(projectId) {
  if (!projectId) return "";
  const proj = (_cache.projects || []).find((p) => p.id === projectId);
  if (proj) return proj.name || "";
  const byName = (_cache.projects || []).find((p) => p.name === projectId);
  return byName ? byName.name : projectId;
}

function _getProjectId(projectName) {
  if (!projectName) return "";
  const proj = (_cache.projects || []).find((p) => p.name === projectName);
  return proj ? proj.id : "";
}

/**
 * Обогащает транзакцию виртуальными полями через lookup.
 * walletName, toWalletName, category, direction — вычисляются на лету,
 * не хранятся в Firestore. Это и есть нормализация.
 */
function _enrichTx(data, id) {
  const amount  = parseFloat(data.amount ?? 0);
  const isoDate = normalizeDate(data.Date || data.date || "");

  // Поддерживаем и старый формат (строки) и новый (id-ссылки)
  const walletName   = data.walletId
    ? _getWalletName(data.walletId)
    : (data.walletName || "");
  const toWalletName = data.toWalletId
    ? _getWalletName(data.toWalletId)
    : (data.toWalletName || "");
  const category     = data.categoryId
    ? _getCategoryName(data.categoryId)
    : (data.category || data.Category || "");
  const direction    = data.projectId
    ? _getProjectName(data.projectId)
    : (data.direction || "");

  return {
    ...data,
    id,
    _docId:   id,
    amount,
    _isoDate: isoDate,
    type:     data.type || (amount >= 0 ? "income" : "expense"),
    _source:  data.source || "",
    // ── Виртуальные поля (lookup, не из Firestore) ──
    walletName,
    toWalletName,
    category,
    direction,
  };
}

// ─── Загрузка данных ──────────────────────────────────────────────────────────
async function _loadAll(force = false) {
  const ownerId = getOwnerId();
  if (!ownerId) return;

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

      // ── Счета — грузим первыми, нужны для lookup транзакций ────────────────
      _cache.accounts = accSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      _cache.accountCurrencyMap = {};
      _cache.accounts.forEach((acc) => {
        if (acc.name) _cache.accountCurrencyMap[acc.name] = acc.currency || "UZS";
      });

      // ── Проекты ────────────────────────────────────────────────────────────
      _cache.projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── Категории ──────────────────────────────────────────────────────────
      const catDocs = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      _cache.categoriesFull = catDocs;
      _rebuildCategories();

      // ── Юрлица ────────────────────────────────────────────────────────────
      _cache.legalEntities = entSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ── Транзакции — обогащаем через lookup (после загрузки справочников) ──
      _cache.transactions = txSnap.docs.map((d) => _enrichTx(d.data(), d.id));

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
  _cache.transactions       = null;
  _cache.accounts           = null;
  _cache.projects           = null;
  _cache.categories         = null;
  _cache.categoriesFull     = null;
  _cache.legalEntities      = null;
  _cache.accountCurrencyMap = {};
  _cache.categoryTypeMap    = {};
  _cache.loading            = false;
  _cache.error              = null;
  _cache.promise            = null;
  _cache.loadedForOwner     = null;
}

// ─── Пересборка списка категорий-строк ───────────────────────────────────────
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

/**
 * Пересобирает виртуальные поля всех транзакций после обновления справочников.
 * Вызывается когда переименовали счёт/категорию/проект.
 */
function _reEnrichAllTransactions() {
  if (!_cache.transactions) return;
  _cache.transactions = _cache.transactions.map((tx) => _enrichTx(tx, tx.id));
}

// ─── Публичные мутаторы кэша ─────────────────────────────────────────────────
export const store = {

  // ── Lookup-хелперы (используй везде вместо хранения строк) ────────────────
  getWalletName:   _getWalletName,
  getWalletId:     _getWalletId,
  getCategoryName: _getCategoryName,
  getCategoryId:   _getCategoryId,
  getProjectName:  _getProjectName,
  getProjectId:    _getProjectId,

  // ── Транзакции ─────────────────────────────────────────────────────────────
  addTransaction(tx) {
    // tx уже содержит виртуальные поля — обогащаем
    const enriched = _enrichTx(tx, tx.id || tx._docId);
    _cache.transactions = [enriched, ...(_cache.transactions || [])];
    _notify();
  },
  updateTransaction(id, patch) {
    _cache.transactions = (_cache.transactions || []).map((t) => {
      if (t.id !== id) return t;
      const merged = { ...t, ...patch };
      return _enrichTx(merged, id);
    });
    _notify();
  },
  deleteTransaction(id) {
    _cache.transactions = (_cache.transactions || []).filter((t) => t.id !== id);
    _notify();
  },

  // ── Счета ──────────────────────────────────────────────────────────────────
  addAccount(acc) {
    _cache.accounts = [...(_cache.accounts || []), acc];
    if (acc.name) _cache.accountCurrencyMap[acc.name] = acc.currency || "UZS";
    // После добавления счёта пересобираем транзакции (на случай pending lookup)
    _reEnrichAllTransactions();
    _notify();
  },
  updateAccount(id, patch) {
    _cache.accounts = (_cache.accounts || []).map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    const updated = (_cache.accounts || []).find((a) => a.id === id);
    if (updated?.name) _cache.accountCurrencyMap[updated.name] = updated.currency || "UZS";
    // КЛЮЧЕВОЕ: пересобираем виртуальные поля транзакций — мгновенное отражение переименования
    _reEnrichAllTransactions();
    _notify();
  },
  deleteAccount(id) {
    _cache.accounts = (_cache.accounts || []).filter((a) => a.id !== id);
    _reEnrichAllTransactions();
    _notify();
  },

  // ── Проекты ────────────────────────────────────────────────────────────────
  addProject(proj) {
    _cache.projects = [...(_cache.projects || []), proj];
    _reEnrichAllTransactions();
    _notify();
  },
  updateProject(id, patch) {
    _cache.projects = (_cache.projects || []).map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
    _reEnrichAllTransactions();
    _notify();
  },
  deleteProject(id) {
    _cache.projects = (_cache.projects || []).filter((p) => p.id !== id);
    _reEnrichAllTransactions();
    _notify();
  },

  // ── Категории ──────────────────────────────────────────────────────────────
  addCategory(cat) {
    _cache.categoriesFull = [...(_cache.categoriesFull || []), cat];
    _rebuildCategories();
    _reEnrichAllTransactions();
    _notify();
  },
  updateCategory(id, patch) {
    _cache.categoriesFull = (_cache.categoriesFull || []).map((c) =>
      c.id === id ? { ...c, ...patch } : c
    );
    _rebuildCategories();
    // КЛЮЧЕВОЕ: переименование статьи мгновенно отражается во всех операциях
    _reEnrichAllTransactions();
    _notify();
  },
  deleteCategory(id) {
    _cache.categoriesFull = (_cache.categoriesFull || []).filter((c) => c.id !== id);
    _rebuildCategories();
    _reEnrichAllTransactions();
    _notify();
  },

  // ── Юрлица ────────────────────────────────────────────────────────────────
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

  refresh() { return _loadAll(true); },
  reset:     _resetCache,
};

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
    categories:         _cache.categories       ?? [],   // string[] для дропдаунов
    categoriesFull:     _cache.categoriesFull   ?? [],   // объекты {id, name, ...}
    categoryTypeMap:    _cache.categoryTypeMap  ?? {},
    accountCurrencyMap: _cache.accountCurrencyMap ?? {},
    legalEntities:      _cache.legalEntities    ?? [],
    loading:            _cache.loading || _cache.transactions === null,
    error:              _cache.error,
    store,
    refresh:            store.refresh,
  };
}

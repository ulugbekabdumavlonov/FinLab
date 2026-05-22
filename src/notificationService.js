/**
 * notificationService.js
 *
 * Централизованный сервис уведомлений.
 * Пишет в Firestore: users/{uid}/notifications
 *
 * Типы уведомлений:
 *   import_success   — успешный импорт выписки
 *   import_error     — ошибка импорта
 *   low_stock        — товар заканчивается
 *   no_stock         — товар закончился
 *   new_member       — новый сотрудник принял инвайт
 *   invoice_paid     — оплата подписки
 *   daily_summary    — ежедневная сводка склада
 *   operation_large  — крупная операция (> порога)
 *
 * Вызывай эти функции из нужных мест в приложении.
 */

import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { auth, db } from "./firebase";

const uid = () => auth.currentUser?.uid;
const notifCol = () => collection(db, "users", uid(), "notifications");

// ─── Базовая функция создания уведомления ─────────────────────────────────────
export async function createNotification({ type, title, body, link = null, meta = {} }) {
  if (!uid()) return;
  try {
    await addDoc(notifCol(), {
      type,
      title,
      body,
      link,
      meta,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Notification error:", e);
  }
}

// ─── Пометить как прочитанное ─────────────────────────────────────────────────
export async function markNotificationRead(notifId) {
  if (!uid()) return;
  await updateDoc(doc(db, "users", uid(), "notifications", notifId), { read: true });
}

// ─── Пометить все как прочитанные ─────────────────────────────────────────────
export async function markAllNotificationsRead(notifIds) {
  if (!uid() || !notifIds?.length) return;
  const batch = [];
  for (const id of notifIds) {
    batch.push(updateDoc(doc(db, "users", uid(), "notifications", id), { read: true }));
  }
  await Promise.all(batch);
}

// ═══════════════════════════════════════════════════════════
// СПЕЦИАЛИЗИРОВАННЫЕ ТРИГГЕРЫ
// Вызывай эти функции из нужных мест
// ═══════════════════════════════════════════════════════════

/**
 * Вызови из ImportPage после успешного импорта
 * @param {string} fileName  — имя файла
 * @param {number} count     — количество операций
 * @param {string} walletName — название счёта
 */
export async function notifyImportSuccess(fileName, count, walletName) {
  await createNotification({
    type: "import_success",
    title: "Импорт завершён",
    body: `Загружено ${count} операций из «${fileName}»${walletName ? ` → ${walletName}` : ""}`,
    link: "/app/Database",
    meta: { fileName, count, walletName },
  });
}

/**
 * Вызови из ImportPage при ошибке импорта
 */
export async function notifyImportError(fileName, errorMessage) {
  await createNotification({
    type: "import_error",
    title: "Ошибка импорта",
    body: `Не удалось загрузить «${fileName}»: ${errorMessage}`,
    link: "/app/Database",
    meta: { fileName, errorMessage },
  });
}

/**
 * Вызови из WarehousePage / при изменении остатков
 * @param {string} productName
 * @param {number} stock
 * @param {number} minStock
 */
export async function notifyLowStock(productName, stock, minStock) {
  await createNotification({
    type: "low_stock",
    title: "Низкий остаток",
    body: `«${productName}» — осталось ${stock} шт (мин. ${minStock})`,
    link: "/app/warehouse",
    meta: { productName, stock, minStock },
  });
}

/**
 * Товар полностью закончился
 */
export async function notifyNoStock(productName) {
  await createNotification({
    type: "no_stock",
    title: "Товар закончился",
    body: `«${productName}» — 0 шт на складе`,
    link: "/app/warehouse",
    meta: { productName },
  });
}

/**
 * Вызови из InvitePage когда сотрудник принял инвайт
 */
export async function notifyNewMember(memberEmail, memberName) {
  await createNotification({
    type: "new_member",
    title: "Новый сотрудник",
    body: `${memberName || memberEmail} принял приглашение и зарегистрировался`,
    link: "/app/settings",
    meta: { memberEmail, memberName },
  });
}

/**
 * Крупная операция (вызывай при сохранении транзакции)
 * @param {number} amount
 * @param {string} counterparty
 * @param {number} threshold — порог (по умолчанию 10 млн)
 */
export async function notifyLargeOperation(amount, counterparty, threshold = 10_000_000) {
  if (Math.abs(amount) < threshold) return;
  const sign = amount > 0 ? "+" : "−";
  await createNotification({
    type: "operation_large",
    title: "Крупная операция",
    body: `${sign}${Math.abs(amount).toLocaleString("ru-RU")} · ${counterparty || "Без контрагента"}`,
    link: "/app/Operations",
    meta: { amount, counterparty },
  });
}

/**
 * Ежедневная сводка склада — вызывай 1 раз в день (например при первом открытии Dashboard)
 * @param {Array} products — массив товаров из Firestore
 */
export async function notifyDailySummary(products) {
  if (!products?.length) return;

  // Проверяем, отправляли ли уже сегодня
  const today = new Date().toISOString().slice(0, 10);
  const q = query(
    notifCol(),
    where("type", "==", "daily_summary"),
    where("meta.date", "==", today),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // уже отправляли сегодня

  const totalValue = products.reduce((s, p) => s + (parseFloat(p.stock) || 0) * (parseFloat(p.costPrice) || 0), 0);
  const noStock    = products.filter(p => (parseFloat(p.stock) || 0) <= 0).length;
  const lowStock   = products.filter(p => {
    const s = parseFloat(p.stock) || 0;
    const m = parseFloat(p.minStock) || 0;
    return s > 0 && m > 0 && s <= m;
  }).length;

  let body = `Склад: ${(totalValue / 1_000_000).toFixed(1)} млн`;
  if (noStock > 0)  body += ` · ⚠ нет: ${noStock} тов.`;
  if (lowStock > 0) body += ` · ↓ мало: ${lowStock} тов.`;

  await createNotification({
    type: "daily_summary",
    title: "Сводка склада",
    body,
    link: "/app/warehouse",
    meta: { date: today, totalValue, noStock, lowStock, total: products.length },
  });
}
/**
 * Уведомление владельцу компании когда сотрудник принял инвайт.
 * Пишет в документ владельца (companyId), а не текущего пользователя.
 */
 export async function notifyNewMemberForOwner(companyId, memberEmail, memberName) {
  if (!companyId) return;
  try {
    await addDoc(collection(db, "users", companyId, "notifications"), {
      type: "new_member",
      title: "Новый сотрудник",
      body: `${memberName || memberEmail} принял приглашение и зарегистрировался`,
      link: "/app/settings",
      meta: { memberEmail, memberName },
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Notification error:", e);
  }
}

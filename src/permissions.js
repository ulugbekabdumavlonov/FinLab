// src/config/permissions.js

// ─── Все доступные страницы/блоки ──────────────────────────────────────────
export const ROUTE_PERMISSIONS = {
  // ═══════ Отчёты ═══════
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    group: "Отчёты",
    icon: "LayoutDashboard",
    path: "/app",
    component: "Dashboard",
  },
  cashflow: {
    key: "cashflow",
    label: "ДДС",
    group: "Отчёты",
    icon: "Wallet",
    path: "/app/cashflow",
    component: "CashFlow",
  },
  pl: {
    key: "pl",
    label: "P&L",
    group: "Отчёты",
    icon: "BarChart3",
    path: "/app/pl",
    component: "PL",
  },
  balance: {
    key: "balance",
    label: "Баланс",
    group: "Отчёты",
    icon: "PieChart",
    path: "/app/balance",
    component: "Balance",
  },

  // ═══════ Склад ═══════
  sales: {
    key: "sales",
    label: "Продажи",
    group: "Склад",
    icon: "ShoppingBag",
    path: "/app/sales",
    component: "Sales",
  },
  purchases: {
    key: "purchases",
    label: "Закупки",
    group: "Склад",
    icon: "ShoppingCart",
    path: "/app/purchases",
    component: "Purchases",
  },
  items: {
    key: "items",
    label: "Товары",
    group: "Склад",
    icon: "Package",
    path: "/app/items",
    component: "Items",
  },
  warehouse: {
    key: "warehouse",
    label: "Склад",
    group: "Склад",
    icon: "Warehouse",
    path: "/app/warehouse",
    component: "Warehouse",
  },

  // ═══════ Персонал ═══════
  employees: {
    key: "employees",
    label: "Сотрудники",
    group: "Персонал",
    icon: "Users",
    path: "/app/Employees",
    component: "Employees",
  },
  payroll: {
    key: "payroll",
    label: "Ведомость",
    group: "Персонал",
    icon: "FileText",
    path: "/app/Salarystatement",
    component: "Salarystatement",
  },
  timesheet: {
    key: "timesheet",
    label: "Табель",
    group: "Персонал",
    icon: "Clock",
    path: "/app/Timesheet",
    component: "Timesheet",
  },
  leaves: {
    key: "leaves",
    label: "Отпуска",
    group: "Персонал",
    icon: "Calendar",
    path: "/app/Leaves",
    component: "Leaves",
  },
  advances: {
    key: "advances",
    label: "Авансы",
    group: "Персонал",
    icon: "CreditCard",
    path: "/app/Advances",
    component: "Advances",
  },
  orgchart: {
    key: "orgchart",
    label: "Оргструктура",
    group: "Персонал",
    icon: "GitBranch",
    path: "/app/Orgchart",
    component: "Orgchart",
  },
  invitemanager: {
    key: "invitemanager",
    label: "Пригласить",
    group: "Персонал",
    icon: "Rocket",
    path: "/app/InviteManager",
    component: "InviteManager",
  },

  // ═══════ Система ═══════
  settings: {
    key: "settings",
    label: "Настройки",
    group: "Система",
    icon: "Settings",
    path: "/app/settings",
    component: "Settings",
  },
  operations: {
    key: "operations",
    label: "Операции",
    group: "Система",
    icon: "ArrowLeftRight",
    path: "/app/Operations",
    component: "Operations",
  },
  database: {
    key: "database",
    label: "Импорт",
    group: "Система",
    icon: "Upload",
    path: "/app/Database",
    component: "Database",
  },
  chatpage: {
    key: "chatpage",
    label: "Чаты",
    group: "Система",
    icon: "MessageSquare",
    path: "/app/chat",
    component: "Chat",
  },

  // ═══════ Справочники ═══════
  projects: {
    key: "projects",
    label: "Проекты",
    group: "Справочники",
    icon: "Folder",
    path: "/app/MyProjects",
    component: "MyProjects",
  },
  accounts: {
    key: "accounts",
    label: "Счета",
    group: "Справочники",
    icon: "Wallet",
    path: "/app/MyWallet",
    component: "MyWallet",
  },
  legalEntities: {
    key: "legalEntities",
    label: "Юрлица",
    group: "Справочники",
    icon: "Building",
    path: "/app/MyCompany",
    component: "MyCompany",
  },
  categories: {
    key: "categories",
    label: "Статьи",
    group: "Справочники",
    icon: "FileText",
    path: "/app/MyCategories",
    component: "MyCategories",
  },
  counterparties: {
    key: "counterparties",
    label: "Контрагенты",
    group: "Справочники",
    icon: "Handshake",
    path: "/app/Counterpartiespage",
    component: "Counterpartiespage",
  },
  accruals: {
    key: "accruals",
    label: "Начисления",
    group: "Справочники",
    icon: "Calculator",
    path: "/app/AccrualsPage",
    component: "AccrualsPage",
  },
  settlements: {
    key: "settlements",
    label: "Взаиморасчёты",
    group: "Справочники",
    icon: "Calculator",
    path: "/app/Settlements",
    component: "Settlements",
  },
};

// ─── Получение всех блоков ──────────────────────────────────────────────────
export const getAllPermissionBlocks = () => {
  return Object.values(ROUTE_PERMISSIONS);
};

// ─── Получение блоков по группе ────────────────────────────────────────────
export const getPermissionGroups = () => {
  const groups = {};
  Object.values(ROUTE_PERMISSIONS).forEach(block => {
    if (!groups[block.group]) {
      groups[block.group] = [];
    }
    groups[block.group].push(block);
  });
  return groups;
};

// ─── Получение блока по ключу ──────────────────────────────────────────────
export const getPermissionBlock = (key) => {
  return ROUTE_PERMISSIONS[key] || null;
};

// ─── Проверка существования блока ──────────────────────────────────────────
export const hasPermissionBlock = (key) => {
  return key in ROUTE_PERMISSIONS;
};

// ─── Получение всех групп (для фильтров) ───────────────────────────────────
export const getAllGroups = () => {
  return Object.keys(getPermissionGroups());
};

// ─── Получение количества блоков ────────────────────────────────────────────
export const getTotalBlocks = () => {
  return Object.keys(ROUTE_PERMISSIONS).length;
};

// ─── Получение блоков с фильтром по группе ────────────────────────────────
export const getBlocksByGroup = (group) => {
  return Object.values(ROUTE_PERMISSIONS).filter(block => block.group === group);
};

// ─── DEFAULT_PERMISSIONS (все права отключены по умолчанию) ────────────────
export const DEFAULT_PERMISSIONS = Object.keys(ROUTE_PERMISSIONS).reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

// ─── PERMISSION_BLOCKS (для обратной совместимости) ────────────────────────
export const PERMISSION_BLOCKS = Object.values(ROUTE_PERMISSIONS).map(block => ({
  key: block.key,
  label: block.label,
  group: block.group,
  icon: block.icon,
}));

// ─── Получение только существующих групп ────────────────────────────────────
export const getExistingGroups = () => {
  const allGroups = getPermissionGroups();
  // Фильтруем только те группы, у которых есть блоки
  return Object.keys(allGroups);
};

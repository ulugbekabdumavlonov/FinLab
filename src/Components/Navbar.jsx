import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../Context/AuthContext";
import {
  LayoutDashboard, Wallet, BarChart3, PieChart, Settings,
  ChevronDown, CloudUpload, ArrowLeftRight, FileText,
  LayoutList, Folder, LogOut, Menu, X, ShieldCheck,
  Bell, HelpCircle, Clock, Users, FileUser, Package,
  ShoppingBag, ShoppingCart, Warehouse, Search, Command,
  MessageSquare, ExternalLink, CheckCheck, AlertTriangle,
  CheckCircle, Info, TrendingUp, RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// COLOR MAP
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue: {
    icon: "text-blue-400", bg: "bg-blue-500/15", dot: "bg-blue-400",
    activeBg: "from-blue-500/20 to-indigo-500/15", badge: "bg-blue-500/20 text-blue-300",
  },
  amber: {
    icon: "text-amber-400", bg: "bg-amber-500/15", dot: "bg-amber-400",
    activeBg: "from-amber-500/20 to-orange-500/15", badge: "bg-amber-500/20 text-amber-300",
  },
  emerald: {
    icon: "text-emerald-400", bg: "bg-emerald-500/15", dot: "bg-emerald-400",
    activeBg: "from-emerald-500/20 to-teal-500/15", badge: "bg-emerald-500/20 text-emerald-300",
  },
  violet: {
    icon: "text-violet-400", bg: "bg-violet-500/15", dot: "bg-violet-400",
    activeBg: "from-violet-500/20 to-purple-500/15", badge: "bg-violet-500/20 text-violet-300",
  },
  rose: {
    icon: "text-rose-400", bg: "bg-rose-500/15", dot: "bg-rose-400",
    activeBg: "from-rose-500/20 to-pink-500/15", badge: "bg-rose-500/20 text-rose-300",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV GROUPS
// ─────────────────────────────────────────────────────────────────────────────
const buildGroups = (can) => [
  {
    id: "reports", label: "Отчёты", icon: <BarChart3 size={16} />, color: "blue",
    items: [
      can("dashboard") && { to: "/app",          icon: <LayoutDashboard size={15} />, label: "Dashboard" },
      can("dds")       && { to: "/app/cashflow",  icon: <Wallet size={15} />,          label: "ДДС" },
      can("pl")        && { to: "/app/pl",        icon: <BarChart3 size={15} />,        label: "P&L" },
      can("balance")   && { to: "/app/balance",   icon: <PieChart size={15} />,         label: "Баланс" },
    ].filter(Boolean),
  },
  {
    id: "warehouse", label: "Склад", icon: <Package size={16} />, color: "amber",
    items: [
      can("Sales")     && { to: "/app/sales",     icon: <ShoppingBag size={15} />,  label: "Продажи" },
      can("Purchases") && { to: "/app/purchases", icon: <ShoppingCart size={15} />, label: "Закупки" },
      can("Items")     && { to: "/app/items",     icon: <Package size={15} />,      label: "Товары & Услуги" },
      can("warehouse") && { to: "/app/warehouse", icon: <Warehouse size={15} />,    label: "Склад" },
    ].filter(Boolean),
  },
  {
    id: "hr", label: "Сотрудники", icon: <Users size={16} />, color: "emerald",
    items: [
      can("employees") && { to: "/app/Employees",       icon: <Users size={15} />,    label: "Сотрудники" },
      can("payroll")   && { to: "/app/Salarystatement", icon: <FileUser size={15} />, label: "Ведомость" },
    ].filter(Boolean),
  },
  {
    id: "system", label: "Система", icon: <Settings size={16} />, color: "violet",
    items: [
      can("settings")   && { to: "/app/settings",   icon: <Settings size={15} />,       label: "Настройки" },
      can("operations") && { to: "/app/Operations", icon: <ArrowLeftRight size={15} />, label: "Операции" },
      can("import")     && { to: "/app/Database",   icon: <CloudUpload size={15} />,    label: "Импорт" },
    ].filter(Boolean),
  },
  {
    id: "refs", label: "Справочники", icon: <Folder size={16} />, color: "rose",
    items: [
      can("accounts")       && { to: "/app/MyWallet",           icon: <Wallet size={15} />,     label: "Мои счета" },
      can("legalEntities")  && { to: "/app/MyCompany",          icon: <LayoutList size={15} />, label: "Мои юрлица" },
      can("categories")     && { to: "/app/MyCategories",       icon: <FileText size={15} />,   label: "Мои статьи" },
      can("projects")       && { to: "/app/MyProjects",         icon: <Folder size={15} />,     label: "Мои проекты" },
      can("accruals")       && { to: "/app/AccrualsPage",       icon: <Folder size={15} />,     label: "Начисления" },
      can("counterparties") && { to: "/app/Counterpartiespage", icon: <Folder size={15} />,     label: "Контрагенты" },
      can("settlements")    && { to: "/app/Settlements",        icon: <Folder size={15} />,     label: "Взаиморасчёты" },
    ].filter(Boolean),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_CONFIG = {
  import_success:   { icon: <CheckCircle size={13} />,    bg: "bg-emerald-500/15", iconCls: "text-emerald-400" },
  import_error:     { icon: <AlertTriangle size={13} />,  bg: "bg-red-500/15",     iconCls: "text-red-400" },
  low_stock:        { icon: <AlertTriangle size={13} />,  bg: "bg-amber-500/15",   iconCls: "text-amber-400" },
  no_stock:         { icon: <AlertTriangle size={13} />,  bg: "bg-red-500/15",     iconCls: "text-red-400" },
  new_member:       { icon: <Users size={13} />,          bg: "bg-blue-500/15",    iconCls: "text-blue-400" },
  operation_large:  { icon: <TrendingUp size={13} />,     bg: "bg-violet-500/15",  iconCls: "text-violet-400" },
  daily_summary:    { icon: <Info size={13} />,           bg: "bg-blue-500/15",    iconCls: "text-blue-400" },
  invoice_paid:     { icon: <CheckCircle size={13} />,    bg: "bg-emerald-500/15", iconCls: "text-emerald-400" },
};

function getNotifConfig(type) {
  return NOTIF_CONFIG[type] || { icon: <Bell size={13} />, bg: "bg-white/10", iconCls: "text-white/40" };
}

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff  = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)    return "только что";
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND PALETTE
// ─────────────────────────────────────────────────────────────────────────────
function CommandPalette({ groups, onClose }) {
  const [q, setQ]        = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef         = useRef(null);
  const navigate         = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allItems = groups.flatMap(g =>
    g.items.map(item => ({ ...item, groupLabel: g.label, color: g.color }))
  );

  const results = q.trim()
    ? allItems.filter(i =>
        i.label.toLowerCase().includes(q.toLowerCase()) ||
        i.groupLabel.toLowerCase().includes(q.toLowerCase())
      )
    : allItems.slice(0, 8);

  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape")    { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(v => Math.min(v + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(v => Math.max(v - 1, 0)); }
      if (e.key === "Enter" && results[cursor]) { navigate(results[cursor].to); onClose(); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, results, cursor, navigate]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh]"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="w-full max-w-lg mx-4 bg-[#0d1526] border border-white/10 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search size={15} className="text-white/30 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск по разделам…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
          />
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/30">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-white/25">Ничего не найдено</div>
          ) : results.map((item, i) => {
            const c = COLOR_MAP[item.color] || COLOR_MAP.blue;
            return (
              <button key={item.to} type="button"
                onClick={() => { navigate(item.to); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${i === cursor ? "bg-white/8" : "hover:bg-white/5"}`}
                onMouseEnter={() => setCursor(i)}
              >
                <span className={`${c.icon} flex-shrink-0`}>{item.icon}</span>
                <span className="flex-1 text-sm text-white/75">{item.label}</span>
                <span className="text-xs text-white/20">{item.groupLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-4">
          {[["↑↓","навигация"],["↵","открыть"],["Esc","закрыть"]].map(([k, d]) => (
            <span key={k} className="text-[11px] text-white/20 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">{k}</kbd> {d}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS PANEL — реалтайм из Firestore
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsPanel({ notifications, onMarkOne, onMarkAll, onNavigate, onClose }) {
  const unread = notifications.filter(n => !n.read);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="w-[340px] bg-[#0d1526] border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.75)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Уведомления</span>
          {unread.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/25 text-blue-300 font-medium min-w-[18px] text-center">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={onMarkAll}
            className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors">
            <CheckCheck size={11} /> Прочитать все
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.04]">
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell size={24} className="text-white/15 mx-auto mb-2" />
            <div className="text-sm text-white/25">Нет уведомлений</div>
          </div>
        ) : notifications.map(n => {
          const cfg = getNotifConfig(n.type);
          return (
            <div key={n.id}
              onClick={() => {
                if (!n.read) onMarkOne(n.id);
                if (n.link)  onNavigate(n.link);
                onClose();
              }}
              className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.04] ${!n.read ? "bg-white/[0.025]" : ""}`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
                <span className={cfg.iconCls}>{cfg.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-white/85 leading-snug">{n.title}</p>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 bg-blue-400" />}
                </div>
                <p className="text-[11px] text-white/35 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-white/20 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] text-white/20">{notifications.length} уведомлений</span>
        <button type="button"
          onClick={() => { onNavigate("/app/settings?section=notifications"); onClose(); }}
          className="text-[11px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1">
          Настроить <Settings size={10} />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function NavDropdown({ group, location }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);
  const c = COLOR_MAP[group.color] || COLOR_MAP.blue;

  useEffect(() => {
    const h = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isGroupActive = group.items.some(i =>
    location.pathname.toLowerCase() === i.to.toLowerCase()
  );

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(v => !v);
  };

  return (
    <div>
      <button ref={btnRef} onClick={handleOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-150 select-none
          ${isGroupActive
            ? `text-white ${c.bg}`
            : "text-white/55 hover:text-white hover:bg-white/5"
          }`}
      >
        <span className={isGroupActive ? c.icon : "text-white/35"}>{group.icon}</span>
        {group.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={12} className="text-white/25" />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div ref={dropRef}
              initial={{ opacity: 0, y: -5, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.97 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="min-w-[220px] bg-[#0d1526] border border-white/10 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden"
              onClick={() => setOpen(false)}
            >
              <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.07]`}>
                <span className={c.icon}>{group.icon}</span>
                <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">{group.label}</span>
              </div>
              <div className="py-1">
                {group.items.map(item => {
                  const active = location.pathname.toLowerCase() === item.to.toLowerCase();
                  return (
                    <Link key={item.to} to={item.to}>
                      <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                        ${active
                          ? `bg-gradient-to-r ${c.activeBg} text-white`
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                        }`}>
                        <span className={active ? c.icon : "text-white/25"}>{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>{item.badge}</span>
                        )}
                        {active && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MENU
// ─────────────────────────────────────────────────────────────────────────────
function UserMenu({ user, onLogout, navigate }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, right: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  };

  const email      = user?.email || "";
  const nameParts  = email.split("@")[0].split(/[._\-]/);
  const ini        = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts[0].slice(0, 2).toUpperCase();
  const displayName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);

  const go = (path) => { navigate(path); setOpen(false); };

  const MENU_ITEMS = [
    {
      icon: <Settings size={14} />,
      label: "Настройки аккаунта",
      action: () => go("/app/settings?section=profile"),
    },
    {
      icon: <ShieldCheck size={14} />,
      label: "Безопасность",
      action: () => go("/app/settings?section=security"),
    },
    {
      icon: <Bell size={14} />,
      label: "Уведомления",
      action: () => go("/app/settings?section=notifications"),
    },
  ];

  const HELP_ITEMS = [
    {
      icon: <HelpCircle size={14} />,
      label: "Помощь и справка",
      sub: "Документация",
      action: () => go("/app/help"),
    },
    {
      icon: <MessageSquare size={14} />,
      label: "Обратная связь",
      sub: null,
      action: () => go("/app/help?tab=feedback"),
    },
    {
      icon: <Clock size={14} />,
      label: "История обновлений",
      sub: null,
      action: () => go("/app/help?tab=changelog"),
    },
  ];

  return (
    <div>
      <button ref={btnRef} onClick={handleOpen}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl
          hover:bg-white/5 border border-transparent hover:border-white/10
          transition-all duration-150 group"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
          text-white bg-gradient-to-br from-indigo-500 to-violet-600
          ring-2 ring-indigo-500/30 group-hover:ring-indigo-400/50 transition-all flex-shrink-0">
          {ini}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-medium text-white leading-tight">{displayName}</p>
          <p className="text-[10px] text-white/40 leading-tight truncate max-w-[120px]">{email}</p>
        </div>
        <ChevronDown size={12} className="text-white/25 hidden lg:block" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div ref={dropRef}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
              className="w-64 bg-[#0d1526] border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.75)] overflow-hidden"
            >
              {/* Profile header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                  font-semibold text-white text-sm
                  bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-500/30">
                  {ini}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-[11px] text-white/40 truncate">{email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/25">
                      Pro план
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Онлайн
                    </span>
                  </div>
                </div>
              </div>

              {/* Main items */}
              <div className="p-1.5">
                {MENU_ITEMS.map(({ icon, label, action }) => (
                  <button key={label} type="button" onClick={action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                      text-sm text-white/55 hover:bg-white/[0.07] hover:text-white
                      transition-colors text-left">
                    <span className="text-white/30">{icon}</span>
                    {label}
                  </button>
                ))}

                <div className="my-1 border-t border-white/[0.07]" />

                {HELP_ITEMS.map(({ icon, label, sub, action }) => (
                  <button key={label} type="button" onClick={action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                      text-sm text-white/55 hover:bg-white/[0.07] hover:text-white
                      transition-colors text-left">
                    <span className="text-white/30">{icon}</span>
                    <span className="flex-1">{label}</span>
                    {sub && (
                      <span className="text-[10px] text-white/20 flex items-center gap-0.5">
                        {sub} <ExternalLink size={9} />
                      </span>
                    )}
                  </button>
                ))}

                <div className="my-1 border-t border-white/[0.07]" />

                <button type="button" onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    text-sm text-red-400 font-medium hover:bg-red-500/10
                    transition-colors text-left">
                  <LogOut size={14} />
                  Выйти из аккаунта
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, groups, location, onLogout }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          <motion.div key="dr"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed left-0 top-0 h-screen w-72 z-50 flex flex-col
              bg-[#0b1220] border-r border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Finlab
              </span>
              <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {groups.map(group => {
                const c = COLOR_MAP[group.color] || COLOR_MAP.blue;
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 px-3 pt-4 pb-2">
                      <span className={`${c.icon} flex-shrink-0`}>{group.icon}</span>
                      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">{group.label}</p>
                    </div>
                    {group.items.map(item => {
                      const active = location.pathname.toLowerCase() === item.to.toLowerCase();
                      return (
                        <Link key={item.to} to={item.to} onClick={onClose}>
                          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all
                            ${active
                              ? `bg-gradient-to-r ${c.activeBg} text-white`
                              : "text-white/50 hover:bg-white/5 hover:text-white"
                            }`}>
                            <span className={active ? c.icon : "text-white/25"}>{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {active && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/10">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm text-red-400 font-medium hover:bg-red-500/10 transition-colors">
                <LogOut size={15} /> Выйти
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, logout } = useAuth();
  const isOwner = user?.userRole === "owner";
  const perms   = user?.permissions || {};
  const can     = (key) => isOwner || !!perms[key];

  const navigate  = useNavigate();
  const location  = useLocation();

  const [mobileOpen, setMobileOpen]     = useState(false);
  const [cmdOpen,    setCmdOpen]         = useState(false);
  const [notifOpen,  setNotifOpen]       = useState(false);
  const [notifPos,   setNotifPos]        = useState({ top: 0, right: 0 });
  const [notifications, setNotifications] = useState([]);

  const notifBtnRef   = useRef(null);
  const notifPanelRef = useRef(null);

  const groups = buildGroups(can).filter(g => g.items.length > 0);

  // ── Firestore: подписка на уведомления ────────────────────────────────────
  useEffect(() => {
  if (!user?.uid) return;
  const col = collection(db, "users", user.uid, "notifications");
  const unsub = onSnapshot(col, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      const ta = a.createdAt?.toDate?.()?.getTime() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime() || 0;
      return tb - ta;
    });
    setNotifications(items.slice(0, 50));
  }, err => console.error("Notifications listener error:", err));
  return () => unsub();
}, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Прочитать одно ────────────────────────────────────────────────────────
  const handleMarkOne = useCallback(async (notifId) => {
  if (!user?.uid) return;
  try {
    await updateDoc(
      doc(db, "users", user.uid, "notifications", notifId),
      { read: true }
    );
  } catch (e) { console.error("Mark read error:", e); }
}, [user?.uid]);

const handleMarkAll = useCallback(async () => {
  if (!user?.uid) return;
  const unread = notifications.filter(n => !n.read);
  if (!unread.length) return;
  try {
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(
        doc(db, "users", user.uid, "notifications", n.id),
        { read: true }
      );
    });
    await batch.commit();
  } catch (e) { console.error("Mark all error:", e); }
}, [notifications, user?.uid]);

  // ── Hotkey Cmd+K ──────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // ── Закрыть при смене роута ───────────────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
    setCmdOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  // ── Клик снаружи уведомлений ──────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (
        notifBtnRef.current   && !notifBtnRef.current.contains(e.target) &&
        notifPanelRef.current && !notifPanelRef.current.contains(e.target)
      ) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleNotifToggle = () => {
    if (!notifOpen && notifBtnRef.current) {
      const r = notifBtnRef.current.getBoundingClientRect();
      setNotifPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setNotifOpen(v => !v);
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <>
      {/* ── Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && <CommandPalette groups={groups} onClose={() => setCmdOpen(false)} />}
      </AnimatePresence>

      {/* ── Notifications portal ── */}
      {createPortal(
        <AnimatePresence>
          {notifOpen && (
            <div ref={notifPanelRef} style={{ position: "fixed", top: notifPos.top, right: notifPos.right, zIndex: 9999 }}>
              <NotificationsPanel
                notifications={notifications}
                onMarkOne={handleMarkOne}
                onMarkAll={handleMarkAll}
                onNavigate={(path) => navigate(path)}
                onClose={() => setNotifOpen(false)}
              />
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Desktop navbar ── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14
        items-center justify-between px-4
        bg-[#0b1220]/95 backdrop-blur-xl
        border-b border-white/[0.08]
        shadow-[0_2px_24px_rgba(0,0,0,0.4)]">

        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2 mr-4 flex-shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center shadow-lg shadow-blue-500/25
            group-hover:shadow-blue-500/40 transition-shadow">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400
            bg-clip-text text-transparent tracking-tight">
            Finlab
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 flex-1">
          {groups.map(group => (
            <NavDropdown key={group.id} group={group} location={location} />
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Search / Cmd+K */}
          <button type="button" onClick={() => setCmdOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg
              text-white/30 hover:text-white/60 hover:bg-white/5
              border border-white/[0.06] hover:border-white/10
              transition-all duration-150">
            <Search size={13} />
            <span className="text-xs">Поиск</span>
            <kbd className="flex items-center gap-0.5 ml-1 px-1 py-0.5
              bg-white/5 border border-white/10 rounded text-[9px] text-white/20">
              <Command size={8} />K
            </kbd>
          </button>

          {/* Notifications */}
          <button ref={notifBtnRef} type="button" onClick={handleNotifToggle}
            className={`w-8 h-8 flex items-center justify-center rounded-lg
              transition-all relative
              ${notifOpen
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center
                min-w-[14px] h-[14px] rounded-full bg-blue-500 text-[8px] text-white font-bold px-0.5
                ring-1 ring-[#0b1220]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Help */}
          <button type="button" onClick={() => navigate("/app/help")}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <HelpCircle size={16} />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <UserMenu user={user} onLogout={handleLogout} navigate={navigate} />
        </div>
      </header>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between
        px-4 py-3 h-14 bg-[#0b1220] border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMobileOpen(true)}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Finlab
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setCmdOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5">
            <Search size={16} />
          </button>
          {/* Notification bell mobile */}
          <button type="button" onClick={handleNotifToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 relative">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-1 ring-[#0b1220]" />
            )}
          </button>
          <UserMenu user={user} onLogout={handleLogout} navigate={navigate} />
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        groups={groups}
        location={location}
        onLogout={handleLogout}
      />
    </>
  );
}

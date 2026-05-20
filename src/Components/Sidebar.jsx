import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../Context/AuthContext";

import {
  LayoutDashboard, Wallet, BarChart3, PieChart, Settings,
  ChevronDown, CloudUpload, ArrowLeftRight, FileText,
  LayoutList, Folder, LogOut, Menu, X, ShieldCheck,
  Bell, HelpCircle, Clock, Users, FileUser, Package,
} from "lucide-react";

/* ── helpers ── */
const useClickOutside = (ref, cb) => {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
};

/* ── Nav groups config ── */
const buildGroups = (can) => [
  {
    id: "reports", label: "Отчёты", icon: <BarChart3 size={16} />,
    items: [
      can("dashboard") && { to: "/app",          icon: <LayoutDashboard size={15} />, label: "Dashboard" },
      can("dds")       && { to: "/app/cashflow",  icon: <Wallet size={15} />,          label: "ДДС" },
      can("pl")        && { to: "/app/pl",        icon: <BarChart3 size={15} />,        label: "P&L" },
      can("balance")   && { to: "/app/balance",   icon: <PieChart size={15} />,         label: "Баланс" },
    ].filter(Boolean),
  },
  {
    id: "warehouse", label: "Склад", icon: <Package size={16} />,
    items: [
      can("warehouse") && { to: "/app/warehouse", icon: <Package size={15} />, label: "Склад" },
    ].filter(Boolean),
  },
  {
    id: "hr", label: "Сотрудники", icon: <Users size={16} />,
    items: [
      can("employees") && { to: "/app/Employees",       icon: <Users size={15} />,    label: "Сотрудники" },
      can("payroll")   && { to: "/app/Salarystatement", icon: <FileUser size={15} />, label: "Ведомость" },
    ].filter(Boolean),
  },
  {
    id: "system", label: "Система", icon: <Settings size={16} />,
    items: [
      can("settings")   && { to: "/app/settings",    icon: <Settings size={15} />,       label: "Настройки" },
      can("operations") && { to: "/app/Operations",  icon: <ArrowLeftRight size={15} />, label: "Операции" },
      can("import")     && { to: "/app/Database",    icon: <CloudUpload size={15} />,    label: "Импорт" },
    ].filter(Boolean),
  },
  {
    id: "refs", label: "Справочники", icon: <Folder size={16} />,
    items: [
      can("accounts")       && { to: "/app/MyWallet",          icon: <FileText size={15} />,  label: "Мои счета" },
      can("legalEntities")  && { to: "/app/MyCompany",         icon: <LayoutList size={15} />, label: "Мои юрлица" },
      can("categories")     && { to: "/app/MyCategories",      icon: <Folder size={15} />,    label: "Мои статьи" },
      can("projects")       && { to: "/app/MyProjects",        icon: <Folder size={15} />,    label: "Мои проекты" },
      can("accruals")       && { to: "/app/AccrualsPage",      icon: <Folder size={15} />,    label: "Начисления" },
      can("counterparties") && { to: "/app/Counterpartiespage",icon: <Folder size={15} />,    label: "Контрагенты" },
      can("settlements")    && { to: "/app/Settlements",       icon: <Folder size={15} />,    label: "Взаиморасчёты" },
    ].filter(Boolean),
  },
];

/* ═══════════════════════════════════════════
   DROPDOWN MENU  (portal — не обрезается navbar)
═══════════════════════════════════════════ */
function NavDropdown({ group, location }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef();
  const dropRef = useRef();

  // закрыть при клике снаружи
  useEffect(() => {
    const h = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // закрыть при смене роута
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
    setOpen((v) => !v);
  };

  const isGroupActive = group.items.some((i) => location.pathname === i.to);

  return (
    <div>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-150 select-none
          ${isGroupActive
            ? "text-white bg-white/10"
            : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
      >
        <span className={isGroupActive ? "text-blue-400" : "text-white/40"}>{group.icon}</span>
        {group.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} className="text-white/30" />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropRef}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="min-w-[210px] bg-[#0d1526] border border-white/10 rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden"
              onClick={() => setOpen(false)}
            >
              {group.items.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link key={item.to} to={item.to}>
                    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${active
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}>
                      <span className={active ? "text-blue-400" : "text-white/30"}>{item.icon}</span>
                      {item.label}
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   USER MENU
═══════════════════════════════════════════ */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
  const btnRef = useRef();
  const dropRef = useRef();

  useEffect(() => {
    const h = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
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
    setOpen((v) => !v);
  };

  const email = user?.email || "";
  const nameParts = email.split("@")[0].split(/[._\-]/);
  const ini = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : nameParts[0].slice(0, 2).toUpperCase();
  const displayName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);

  return (
    <div>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl
          hover:bg-white/5 border border-transparent hover:border-white/10
          transition-all duration-150 group"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs
          font-semibold text-white bg-gradient-to-br from-indigo-500 to-violet-600
          ring-2 ring-indigo-500/30 group-hover:ring-indigo-400/50 transition-all flex-shrink-0">
          {ini}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-xs font-medium text-white leading-tight">{displayName}</p>
          <p className="text-[10px] text-white/40 leading-tight truncate max-w-[120px]">{email}</p>
        </div>
        <ChevronDown size={13} className="text-white/30 hidden lg:block" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropRef}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
              className="w-64 bg-[#0d1526] border border-white/10 rounded-2xl
                shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                  font-semibold text-white text-sm
                  bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-500/30">
                  {ini}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-[11px] text-white/40 truncate">{email}</p>
                  <span className="inline-block text-[9px] px-2 py-0.5 rounded-full mt-1
                    bg-indigo-500/20 text-indigo-300 border border-indigo-500/25">
                    Pro план
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/25 self-start mt-1" />
              </div>
              <div className="p-1.5">
                {[
                  { icon: <Settings size={14} />, label: "Настройки аккаунта" },
                  { icon: <ShieldCheck size={14} />, label: "Безопасность" },
                  { icon: <Bell size={14} />, label: "Уведомления" },
                ].map(({ icon, label }) => (
                  <button key={label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    text-sm text-white/60 hover:bg-white/[0.07] hover:text-white
                    transition-colors duration-150 text-left">
                    <span className="text-white/35">{icon}</span>
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-white/[0.07]" />
                {[
                  { icon: <HelpCircle size={14} />, label: "Помощь и справка" },
                  { icon: <Clock size={14} />, label: "История обновлений" },
                ].map(({ icon, label }) => (
                  <button key={label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    text-sm text-white/60 hover:bg-white/[0.07] hover:text-white
                    transition-colors duration-150 text-left">
                    <span className="text-white/35">{icon}</span>
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-white/[0.07]" />
                <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                  text-sm text-red-400 font-medium hover:bg-red-500/10
                  transition-colors duration-150 text-left">
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

/* ═══════════════════════════════════════════
   MOBILE DRAWER
═══════════════════════════════════════════ */
function MobileDrawer({ open, onClose, groups, location, user, onLogout }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed left-0 top-0 h-screen w-72 z-50 flex flex-col
              bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#020617]
              border-r border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                Finlab
              </span>
              <button onClick={onClose} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 pt-4 pb-2">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link key={item.to} to={item.to} onClick={onClose}>
                        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5
                          transition-all
                          ${active
                            ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}>
                          <span className={active ? "text-blue-400" : "text-white/30"}>{item.icon}</span>
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm text-red-400 font-medium hover:bg-red-500/10 transition-colors">
                <LogOut size={15} />
                Выйти
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   MAIN NAVBAR
═══════════════════════════════════════════ */
export default function Navbar() {
  const { user, logout } = useAuth();
  const isOwner = user?.userRole === "owner";
  const perms = user?.permissions || {};
  const can = (key) => isOwner || !!perms[key];

  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const groups = buildGroups(can).filter((g) => g.items.length > 0);

  return (
    <>
      {/* ── DESKTOP navbar ── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14
        items-center justify-between px-4
        bg-gradient-to-r from-[#0b1220] via-[#0f172a] to-[#0b1220]
        border-b border-white/[0.08] backdrop-blur-xl shadow-[0_2px_24px_rgba(0,0,0,0.4)]">

        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-400
            bg-clip-text text-transparent tracking-tight">
            Finlab
          </span>
        </Link>

        {/* Nav groups */}
        <nav className="flex items-center gap-0.5 flex-1">
          {groups.map((group) => (
            <NavDropdown key={group.id} group={group} location={location} />
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notifications */}
          <button className="w-8 h-8 flex items-center justify-center rounded-lg
            text-white/40 hover:text-white hover:bg-white/5 transition-all relative">
            <Bell size={17} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
          </button>
          {/* Help */}
          <button className="w-8 h-8 flex items-center justify-center rounded-lg
            text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <HelpCircle size={17} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* ── MOBILE top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between
        px-4 py-3 h-14
        bg-[#0b1220] border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)} className="text-white/60 hover:text-white p-1">
            <Menu size={22} />
          </button>
          <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Finlab
          </span>
        </div>
        <UserMenu user={user} onLogout={handleLogout} />
      </div>

      {/* ── MOBILE drawer ── */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        groups={groups}
        location={location}
        user={user}
        onLogout={handleLogout}
      />
    </>
  );
}

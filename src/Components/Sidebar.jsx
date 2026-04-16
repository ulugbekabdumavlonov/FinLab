import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  PieChart,
  Settings,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  ArrowLeftRight,
  FileText,
  LayoutList,
  Folder,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Bell,
  HelpCircle,
  Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────
   USER DROPDOWN
───────────────────────────────────────────── */
function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const email = user?.email || "";
  const nameParts = email.split("@")[0].split(/[._\-]/);
  const ini =
    nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();
  const displayName =
    nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);

  const menuTop = [
    { icon: <Settings size={14} />, label: "Настройки аккаунта" },
    { icon: <ShieldCheck size={14} />, label: "Безопасность" },
    { icon: <Bell size={14} />, label: "Уведомления" },
  ];

  const menuBottom = [
    { icon: <HelpCircle size={14} />, label: "Помощь и справка" },
    { icon: <Clock size={14} />, label: "История обновлений" },
  ];

  return (
    <div className="mx-4 mb-4 relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl
          bg-white/5 border border-white/10
          hover:bg-white/10 hover:border-indigo-500/40
          transition-all duration-200 group"
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
            text-sm font-semibold text-white
            bg-gradient-to-br from-indigo-500 to-violet-600
            ring-2 ring-indigo-500/30 group-hover:ring-indigo-400/50 transition-all"
        >
          {ini}
        </div>

        {/* Info */}
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-[10px] text-white/40 leading-none mb-0.5">
            Вы вошли как
          </p>
          <p className="text-xs font-medium text-white truncate leading-tight">
            {email || "Загрузка..."}
          </p>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronDown size={14} className="text-white/40" />
        </motion.div>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="user-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 right-0 mt-2 z-50
              bg-[#0d1526] border border-white/10 rounded-2xl
              overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                  font-semibold text-white text-sm
                  bg-gradient-to-br from-indigo-500 to-violet-600
                  ring-2 ring-indigo-500/30"
              >
                {ini}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-white leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-white/40 truncate leading-tight mt-0.5">
                  {email}
                </p>
                <span
                  className="inline-block text-[9px] px-2 py-0.5 rounded-full mt-1
                    bg-indigo-500/20 text-indigo-300 border border-indigo-500/25"
                >
                  Pro план
                </span>
              </div>
              {/* Online dot */}
              <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/25 self-start mt-1 flex-shrink-0" />
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              {menuTop.map(({ icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    text-sm text-white/65 hover:bg-white/[0.07] hover:text-white
                    transition-colors duration-150 text-left"
                >
                  <span className="text-white/40 flex-shrink-0">{icon}</span>
                  {label}
                </button>
              ))}

              <div className="my-1 border-t border-white/[0.07]" />

              {menuBottom.map(({ icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                    text-sm text-white/65 hover:bg-white/[0.07] hover:text-white
                    transition-colors duration-150 text-left"
                >
                  <span className="text-white/40 flex-shrink-0">{icon}</span>
                  {label}
                </button>
              ))}

              <div className="my-1 border-t border-white/[0.07]" />

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                  text-sm text-red-400 font-medium
                  hover:bg-red-500/10 transition-colors duration-150 text-left"
              >
                <LogOut size={14} className="flex-shrink-0" />
                Выйти из аккаунта
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN SIDEBAR
───────────────────────────────────────────── */
export default function Sidebar() {
  const [user, setUser] = useState(null);
  const [openReports, setOpenReports] = useState(true);
  const [openSystem, setOpenSystem] = useState(true);
  const [openInfo, setOpenInfo] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* LOGO */}
      <div className="px-6 py-5 flex items-center justify-between">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Finlab
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/50 hover:text-white transition"
        >
          <X size={22} />
        </button>
      </div>

      {/* USER DROPDOWN */}
      <UserDropdown user={user} onLogout={handleLogout} />

      {/* MENU */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        <Section
          title="Отчёты"
          open={openReports}
          toggle={() => setOpenReports(!openReports)}
        >
          <NavItem
            to="/app"
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={isActive("/app")}
          />
          <NavItem
            to="/app/cashflow"
            icon={<Wallet size={18} />}
            label="ДДС"
            active={isActive("/app/cashflow")}
          />
          <NavItem
            to="/app/pl"
            icon={<BarChart3 size={18} />}
            label="P&L"
            active={isActive("/app/pl")}
          />
          <NavItem
            to="/app/balance"
            icon={<PieChart size={18} />}
            label="Баланс"
            active={isActive("/app/balance")}
          />
        </Section>

        <Section
          title="Система"
          open={openSystem}
          toggle={() => setOpenSystem(!openSystem)}
        >
          <NavItem
            to="/app/settings"
            icon={<Settings size={18} />}
            label="Настройки"
            active={isActive("/app/settings")}
          />
          <NavItem
            to="/app/operations"
            icon={<ArrowLeftRight size={18} />}
            label="Операции"
            active={isActive("/app/operations")}
          />
          <NavItem
            to="/app/database"
            icon={<CloudUpload size={18} />}
            label="Импорт"
            active={isActive("/app/database")}
          />
        </Section>

        <Section
          title="Справочники"
          open={openInfo}
          toggle={() => setOpenInfo(!openInfo)}
        >
          <NavItem
            to="/app/MyWallet"
            icon={<FileText size={18} />}
            label="Мои счета"
            active={isActive("/app/MyWallet")}
          />
          <NavItem
            to="/app/MyCompany"
            icon={<LayoutList size={18} />}
            label="Мои юрлица"
            active={isActive("/app/MyCompany")}
          />
          <NavItem
            to="/app/MyCategories"
            icon={<Folder size={18} />}
            label="Мои статьи"
            active={isActive("/app/MyCategories")}
          />
          <NavItem
            to="/app/MyProjects"
            icon={<Folder size={18} />}
            label="Мои проекты"
            active={isActive("/app/MyProjects")}
          />
        </Section>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP sidebar */}
      <div
        className="hidden md:flex fixed left-0 top-0 h-screen w-[270px] flex-col
        bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#020617]
        border-r border-white/10 backdrop-blur-xl shadow-2xl z-50"
      >
        {sidebarContent}
      </div>

      {/* MOBILE top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between
        px-4 py-3 bg-[#0b1220] border-b border-white/10 shadow-lg"
      >
        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Finlab
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/70 hover:text-white transition p-1"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* MOBILE backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* MOBILE drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="md:hidden fixed left-0 top-0 h-screen w-[270px] flex flex-col
              bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#020617]
              border-r border-white/10 shadow-2xl z-50"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────────────────────────
   SECTION
───────────────────────────────────────────── */
function Section({ title, children, open, toggle }) {
  return (
    <div>
      <div
        onClick={toggle}
        className="flex justify-between items-center px-3 py-2 text-xs text-white/50
          cursor-pointer hover:text-white transition select-none"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAV ITEM
───────────────────────────────────────────── */
function NavItem({ to, icon, label, active }) {
  return (
    <Link to={to}>
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
          ${
            active
              ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white shadow-inner"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
      >
        <span className={active ? "text-blue-400" : ""}>{icon}</span>
        {label}
      </div>
    </Link>
  );
}

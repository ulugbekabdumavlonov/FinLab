import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useEffect, useState } from "react";
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
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const [openReports, setOpenReports] = useState(true);
  const [openSystem, setOpenSystem] = useState(true);
  const [openInfo, setOpenInfo] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 h-screen w-[270px] flex flex-col 
    bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#020617] 
    border-r border-white/10 backdrop-blur-xl shadow-2xl z-50">

      {/* LOGO */}
      <div className="px-6 py-5 text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
        Finlab
      </div>

      {/* USER */}
      <div className="mx-4 mb-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
        <p className="text-xs text-white/50">Вы вошли как</p>
        <p className="text-sm font-semibold text-white truncate">
          {user?.email || "Загрузка..."}
        </p>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">

        {/* REPORTS */}
        <Section
          title="Отчёты"
          open={openReports}
          toggle={() => setOpenReports(!openReports)}
        >
          <NavItem to="/app" icon={<LayoutDashboard size={18} />} label="Dashboard" active={isActive("/app")} />
          <NavItem to="/app/cashflow" icon={<Wallet size={18} />} label="ДДС" active={isActive("/app/cashflow")} />
          <NavItem to="/app/pl" icon={<BarChart3 size={18} />} label="P&L" active={isActive("/app/pl")} />
          <NavItem to="/app/balance" icon={<PieChart size={18} />} label="Баланс" active={isActive("/app/balance")} />
        </Section>

        {/* SYSTEM */}
        <Section
          title="Система"
          open={openSystem}
          toggle={() => setOpenSystem(!openSystem)}
        >
          <NavItem to="/app/settings" icon={<Settings size={18} />} label="Настройки" active={isActive("/app/settings")} />
          <NavItem to="/app/operations" icon={<ArrowLeftRight size={18} />} label="Операции" active={isActive("/app/operations")} />
          <NavItem to="/app/database" icon={<CloudUpload size={18} />} label="Импорт" active={isActive("/app/database")} />
        </Section>

        {/* INFO */}
        <Section
          title="Справочники"
          open={openInfo}
          toggle={() => setOpenInfo(!openInfo)}
        >
          <NavItem to="/app/MyWallet" icon={<FileText size={18} />} label="Мои счета" active={isActive("/app/MyWallet")} />
          <NavItem to="/app/MyCompany" icon={<LayoutList size={18} />} label="Мои юрлица" active={isActive("/app/MyCompany")} />
          <NavItem to="/app/MyCategories" icon={<Folder size={18} />} label="Мои статьи" active={isActive("/app/MyCategories")} />
          <NavItem to="/app/MyProjects" icon={<Folder size={18} />} label="Мои проекты" active={isActive("/app/MyProjects")} />
        </Section>

      </div>

      {/* LOGOUT */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl 
          bg-gradient-to-r from-red-500 to-red-600 
          hover:scale-105 transition text-white font-semibold shadow-lg"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </div>
  );
}

/* 🔹 SECTION */
function Section({ title, children, open, toggle }) {
  return (
    <div>
      <div
        onClick={toggle}
        className="flex justify-between items-center px-3 py-2 text-xs text-white/50 cursor-pointer hover:text-white transition"
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
            className="space-y-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* 🔹 NAV ITEM */
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
        <span className={`${active ? "text-blue-400" : ""}`}>
          {icon}
        </span>
        {label}
      </div>
    </Link>
  );
}
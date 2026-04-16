import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { name: "Возможности", path: "/features" },
    { name: "Тарифы", path: "/pricing" },
    { name: "Партнерам", path: "/partners" },
  ];

  return (
    <div className="fixed top-0 w-full z-50">
      {/* BACKDROP */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/60 border-b border-white/20"></div>

      <div className="relative flex justify-between items-center px-5 md:px-12 py-4">
        {/* LOGO */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          Finlab
        </Link>

        {/* NAV — только десктоп */}
        <div className="hidden md:flex gap-10 text-gray-600 relative">
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.name} to={item.path} className="relative group">
                <span className={`transition ${active ? "text-black" : ""}`}>
                  {item.name}
                </span>
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
                {active && (
                  <motion.div
                    layoutId="underline"
                    className="absolute left-0 -bottom-1 h-[2px] w-full bg-blue-600"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* ACTIONS — только десктоп */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white/60 backdrop-blur-md hover:bg-white transition shadow-sm">
              Войти
            </button>
          </Link>
          <Link to="/register">
            <button className="relative px-6 py-2 rounded-xl text-white font-medium overflow-hidden group">
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></span>
              <span className="absolute inset-0 blur-xl opacity-40 bg-blue-500 group-hover:opacity-70 transition"></span>
              <span className="relative z-10">Регистрация</span>
            </button>
          </Link>
        </div>

        {/* BURGER — только мобильный */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-gray-700 p-1"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden relative bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex flex-col gap-4"
          >
            {nav.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`text-gray-700 font-medium transition ${
                  location.pathname === item.path ? "text-blue-600" : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <button className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition text-sm font-medium">
                  Войти
                </button>
              </Link>
              <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <button className="relative w-full px-4 py-2 rounded-xl text-white font-medium overflow-hidden text-sm">
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></span>
                  <span className="relative z-10">Регистрация</span>
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

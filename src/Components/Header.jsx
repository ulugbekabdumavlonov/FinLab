import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function Header() {
  const location = useLocation();

  const nav = [
    { name: "Возможности", path: "/features" },
    { name: "Тарифы", path: "/pricing" },
    { name: "Партнерам", path: "/partners" },
  ];

  return (
    <div className="fixed top-0 w-full z-50">
      
      {/* BACKDROP */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/60 border-b border-white/20"></div>

      <div className="relative flex justify-between items-center px-12 py-4">

        {/* LOGO */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          Finlab
        </Link>

        {/* NAV */}
        <div className="flex gap-10 text-gray-600 relative">
          {nav.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link key={item.name} to={item.path} className="relative group">
                
                <span className={`transition ${active ? "text-black" : ""}`}>
                  {item.name}
                </span>

                {/* underline animation */}
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>

                {/* active underline */}
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

        {/* ACTIONS */}
        <div className="flex items-center gap-3">

          {/* LOGIN */}
          <Link to="/login">
            <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white/60 backdrop-blur-md hover:bg-white transition shadow-sm">
              Войти
            </button>
          </Link>

          {/* REGISTER (GLOW BUTTON) */}
          <Link to="/register">
            <button className="relative px-6 py-2 rounded-xl text-white font-medium overflow-hidden group">

              {/* glow */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></span>
              <span className="absolute inset-0 blur-xl opacity-40 bg-blue-500 group-hover:opacity-70 transition"></span>

              <span className="relative z-10">
                Регистрация
              </span>

            </button>
          </Link>

        </div>
      </div>
    </div>
  );
}
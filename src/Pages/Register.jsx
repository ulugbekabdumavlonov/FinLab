import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert("Заполните обязательные поля");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Firestore запишет Onboarding — не здесь
      navigate("/onboarding");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#020617] p-4 md:p-6">
      <div className="w-full max-w-6xl flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl border border-white/10">

        {/* LEFT SIDE */}
        <div className="hidden md:flex w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 items-center justify-center min-h-[680px]">
          <div className="absolute w-[350px] h-[350px] bg-white/20 blur-[140px] rounded-full"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white text-center z-10 px-10"
          >
            <h2 className="text-4xl font-bold mb-4">Создай аккаунт</h2>
            <p className="text-white/80">
              Начни управлять финансами бизнеса уже сегодня. ДДС, P&L и баланс в одном месте.
            </p>
          </motion.div>
        </div>

        {/* MOBILE HEADER */}
        <div className="flex md:hidden w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 items-center justify-center py-10 px-6">
          <div className="text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Создай аккаунт</h2>
            <p className="text-white/80 text-sm">ДДС, P&L и баланс в одном месте</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-xl flex items-center justify-center py-10 md:py-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md px-6 md:px-10"
          >
            <h2 className="text-3xl font-bold text-white mb-2">Регистрация</h2>
            <p className="text-white/60 mb-6 md:mb-8">
              Заполни данные для создания аккаунта
            </p>

            <div className="flex flex-col gap-5">
              <input
                placeholder="Имя *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Пароль *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/60 cursor-pointer"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:scale-105 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {loading ? "Создание аккаунта..." : "Создать аккаунт"}
              </button>

              <p className="text-sm text-center text-white/60 mt-2">
                Уже есть аккаунт?{" "}
                <span
                  onClick={() => navigate("/login")}
                  className="text-blue-400 cursor-pointer hover:underline"
                >
                  Войти
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        phone,
        createdAt: serverTimestamp(),
      });

      navigate("/app");

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#020617] p-6">

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-6xl h-[680px] flex rounded-3xl overflow-hidden shadow-2xl border border-white/10">

        {/* LEFT SIDE (branding) */}
        <div className="hidden md:flex w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 items-center justify-center">

          {/* glow */}
          <div className="absolute w-[350px] h-[350px] bg-white/20 blur-[140px] rounded-full"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white text-center z-10 px-10"
          >
            <h2 className="text-4xl font-bold mb-4">
              Создай аккаунт
            </h2>

            <p className="text-white/80">
              Начни управлять финансами бизнеса уже сегодня. ДДС, P&L и баланс в одном месте.
            </p>
          </motion.div>
        </div>

        {/* RIGHT SIDE (form) */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-xl flex items-center justify-center">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md px-10"
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              Регистрация
            </h2>

            <p className="text-white/60 mb-8">
              Заполни данные для создания аккаунта
            </p>

            <div className="flex flex-col gap-5">

              {/* NAME */}
              <input
                placeholder="Имя"
                onChange={(e) => setName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* PHONE */}
              <input
                placeholder="Телефон"
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* EMAIL */}
              <input
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* PASSWORD */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Пароль"
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

              {/* REGISTER BUTTON */}
              <button
                onClick={handleRegister}
                className="mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:scale-105 transition shadow-lg"
              >
                Создать аккаунт
              </button>

              {/* LOGIN LINK */}
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
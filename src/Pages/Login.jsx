import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/app");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#020617] p-6">

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-6xl h-[650px] flex rounded-3xl overflow-hidden shadow-2xl border border-white/10">

        {/* LEFT SIDE (ART / VISUAL) */}
        <div className="hidden md:flex w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 items-center justify-center">

          {/* glow */}
          <div className="absolute w-[300px] h-[300px] bg-white/20 blur-[120px] rounded-full"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white text-center z-10 px-10"
          >
            <h2 className="text-4xl font-bold mb-4">
              Finlab
            </h2>

            <p className="text-white/80">
              Управляй финансами бизнеса, анализируй ДДС, P&L и баланс в одном месте
            </p>
          </motion.div>
        </div>

        {/* RIGHT SIDE (FORM) */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-xl flex items-center justify-center">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md px-10"
          >
            <h2 className="text-3xl font-bold text-white mb-2">
              Вход
            </h2>

            <p className="text-white/60 mb-8">
              Введите данные для входа
            </p>

            {/* INPUTS */}
            <div className="flex flex-col gap-5">

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

              {/* LOGIN BUTTON */}
              <button
                onClick={handleLogin}
                className="mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:scale-105 transition shadow-lg"
              >
                Войти
              </button>

              {/* GOOGLE */}
              <button
                onClick={handleGoogle}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
              >
                <FaGoogle />
                Войти через Google
              </button>

              {/* LINKS */}
              <div className="flex justify-between text-sm text-white/60 mt-2">
                <span className="hover:text-white cursor-pointer">
                  Забыли пароль?
                </span>

                <span
                  onClick={() => navigate("/register")}
                  className="hover:text-white cursor-pointer"
                >
                  Регистрация
                </span>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
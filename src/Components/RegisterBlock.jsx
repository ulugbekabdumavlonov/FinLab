import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function RegisterBlock() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/app");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 px-4 py-10 md:px-16 md:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden">
      
      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500 opacity-20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500 opacity-20 blur-[120px] rounded-full"></div>

      {/* LEFT */}
      <div className="z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 md:mb-6">
          Начните управлять финансами
          <span className="block text-blue-600">на новом уровне</span>
        </h2>
        <p className="text-gray-600 text-base md:text-lg mb-6 md:mb-8 max-w-md">
          7 дней бесплатно. Без карты. Полный контроль над бизнесом уже сегодня.
        </p>
        <ul className="space-y-3 md:space-y-4 text-gray-700 text-base md:text-lg">
          <li className="flex items-center gap-3 hover:translate-x-1 transition">
            <span className="text-green-500 text-xl">✔</span>
            ИИ-рекомендации по оптимизации
          </li>
          <li className="flex items-center gap-3 hover:translate-x-1 transition">
            <span className="text-green-500 text-xl">✔</span>
            Все банковские данные в одном месте
          </li>
          <li className="flex items-center gap-3 hover:translate-x-1 transition">
            <span className="text-green-500 text-xl">✔</span>
            Автоматический отчёт ДДС
          </li>
        </ul>
      </div>

      {/* RIGHT FORM */}
      <div className="z-10 backdrop-blur-xl bg-white/70 border border-white/40 p-6 md:p-10 rounded-3xl shadow-2xl hover:shadow-blue-200 transition-all duration-300">
        <div className="space-y-5 md:space-y-6">
          <input
            placeholder="Имя"
            className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none py-3 transition"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Email"
            className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none py-3 transition"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Пароль"
            className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none py-3 transition"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleRegister}
            className="w-full mt-4 md:mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 md:py-4 rounded-xl text-base md:text-lg font-semibold shadow-lg hover:shadow-blue-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Попробовать бесплатно
          </button>
          <p className="text-xs text-gray-500 text-center">
            🔒 Ваши данные защищены
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

const STEPS = ["Профиль", "Компания", "Готово"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const [company, setCompany] = useState({
    businessName: "",
    industry: "IT",
    currency: "UZS",
  });

  const handleFinish = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        companyId:   user.uid,
        userRole:    "owner",
        firstName:   profile.firstName.trim(),
        lastName:    profile.lastName.trim(),
        phone:       profile.phone.trim(),
        email:       user.email,
        permissions: {},
        createdAt:   new Date(),
        business: {
          businessName: company.businessName.trim(),
          industry:     company.industry,
        },
        locale: {
          currency: company.currency,
        },
      });

      navigate("/app");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? "text-blue-600" : "text-gray-400"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${i < step ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">

          {/* Step 0 — Профиль */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Расскажите о себе</h2>
              <p className="text-gray-500 text-sm mb-8">Как вас зовут?</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Имя *</label>
                  <input
                    placeholder="Иван"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Фамилия</label>
                  <input
                    placeholder="Иванов"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Телефон</label>
                  <input
                    placeholder="+998 90 000 00 00"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!profile.firstName.trim()) { alert("Введите имя"); return; }
                  setStep(1);
                }}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                Далее →
              </button>
            </div>
          )}

          {/* Step 1 — Компания */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Ваша компания</h2>
              <p className="text-gray-500 text-sm mb-8">Немного о вашем бизнесе</p>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Название компании *</label>
                  <input
                    placeholder="ООО FINLAB"
                    value={company.businessName}
                    onChange={(e) => setCompany({ ...company, businessName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Индустрия</label>
                  <select
                    value={company.industry}
                    onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
                  >
                    {["IT", "E-commerce", "Финансы", "Здравоохранение", "Ритейл", "Другое"].map(o => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Основная валюта</label>
                  <div className="flex gap-3 flex-wrap">
                    {["UZS", "USD", "EUR", "RUB"].map(c => (
                      <button
                        key={c}
                        onClick={() => setCompany({ ...company, currency: c })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                          ${company.currency === c
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-200 text-gray-600 hover:border-blue-300"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => {
                    if (!company.businessName.trim()) { alert("Введите название компании"); return; }
                    setStep(2);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-[1.01] transition-all"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Готово */}
          {step === 2 && (
            <div className="text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Всё готово!</h2>
              <p className="text-gray-500 text-sm mb-8">
                Добро пожаловать в Finlab, <span className="font-semibold text-gray-700">{profile.firstName}</span>!<br />
                Ваш аккаунт настроен и готов к работе.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Имя</span>
                  <span className="font-medium">{profile.firstName} {profile.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Компания</span>
                  <span className="font-medium">{company.businessName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Валюта</span>
                  <span className="font-medium">{company.currency}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Сохранение..." : "Войти в Finlab 🚀"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

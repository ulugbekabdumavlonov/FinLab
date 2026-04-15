import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const cardStyle = {
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 16px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
};

const HEADLINES = [
  {
    h: <>Контролируй деньги бизнеса <span className="text-indigo-300">в одном месте</span></>,
    s: "ДДС, P&L и баланс — всё сразу.\nНикаких таблиц, никаких задержек.",
  },
  {
    h: <>Видь прибыль и убытки <span className="text-emerald-300">в реальном времени</span></>,
    s: "P&L обновляется автоматически.\nСразу видно, где теряются деньги.",
  },
  {
    h: <>Управляй денежным потоком <span className="text-yellow-200">без Excel</span></>,
    s: "ДДС за любой период — в два клика.\nКассовые разрывы больше не застают врасплох.",
  },
  {
    h: <>Баланс бизнеса всегда <span className="text-pink-300">под рукой</span></>,
    s: "Активы, пассивы и капитал в одном экране.\nПолная картина для инвесторов и банков.",
  },
  {
    h: <>Финансовые отчёты <span className="text-indigo-300">за 30 секунд</span></>,
    s: "Не нужен бухгалтер для базового анализа.\nДанные всегда актуальны и понятны.",
  },
];

function ProgressRow({ label, amount, value, color, delay }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <span className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{amount}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay, duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function BarChart() {
  const bars = [
    { h: 24, o: 0.4 }, { h: 34, o: 0.5 }, { h: 20, o: 0.35 },
    { h: 44, o: 0.7 }, { h: 30, o: 0.5 }, { h: 50, o: 1 },
  ];
  return (
    <div className="flex items-end gap-1 mt-2.5" style={{ height: 52 }}>
      {bars.map((b, i) => (
        <motion.div
          key={i}
          style={{ height: b.h, opacity: b.o, background: "#818cf8", transformOrigin: "bottom", width: 18 }}
          className="rounded-t"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.8 + i * 0.08, duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -50]);
  const y2 = useTransform(scrollY, [0, 500], [0, -90]);
  const y3 = useTransform(scrollY, [0, 500], [0, -60]);
  const y4 = useTransform(scrollY, [0, 500], [0, -70]);

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HEADLINES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const current = HEADLINES[idx];

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white flex items-center px-14"
      style={{
        background: "linear-gradient(135deg, #f97316 0%, #a855f7 38%, #6366f1 65%, #1e1b4b 100%)",
      }}
    >
      {/* Glows */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ top: -40, right: "28%", width: 280, height: 280, background: "rgba(168,85,247,0.3)", filter: "blur(70px)" }} />
      <div className="absolute rounded-full pointer-events-none"
        style={{ bottom: 10, right: "8%", width: 220, height: 220, background: "rgba(99,102,241,0.25)", filter: "blur(60px)" }} />

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0"
        style={{ height: 100, background: "linear-gradient(to top, rgba(220,215,255,0.15), transparent)", borderRadius: "60% 60% 0 0 / 20px 20px 0 0" }} />

      {/* LEFT */}
      <motion.div
        className="relative z-10 flex-none w-full max-w-[600px]"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs border border-white/20"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Финансы в реальном времени
        </div>

        {/* Animated headline */}
        <div className="mb-4">
          <motion.h1
            key={idx}
            className="text-5xl font-bold leading-[1.1]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {current.h}
          </motion.h1>
        </div>

        <motion.p
          key={`sub-${idx}`}
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{ color: "rgba(255,255,255,0.6)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {current.s}
        </motion.p>

        <motion.button
          className="mt-6 flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-3 rounded-xl shadow-lg"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          Попробовать бесплатно →
        </motion.button>
        <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>50+ отчётов · бесплатно 14 дней</p>
      </motion.div>

      {/* CARDS */}
      <div className="relative flex-1 ml-6" style={{ minHeight: 440 }}>

        {/* P&L */}
        <motion.div
          className="absolute rounded-2xl p-4"
          style={{ ...cardStyle, top: 0, left: 0, width: 200, rotate: -1, y: y1 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.3 },
            y: { duration: 6, delay: 0.9, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>P&L</p>
          <p className="text-xl font-bold text-green-400">+$24,200</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Прибыль за месяц</p>
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full text-green-400" style={{ background: "rgba(74,222,128,0.18)" }}>
            ↑ 18% к прошлому
          </span>
          <BarChart />
        </motion.div>

        {/* ДДС — main */}
        <motion.div
        className="absolute rounded-2xl p-5 z-30"
        style={{ ...cardStyle, top: 30, left: 170, width: 300, y: y2 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.3 },
          y: { duration: 6, delay: 0.9, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {/* Header */}
         <div className="flex justify-between items-center mb-3">
         <p className="text-sm text-white/60">ДДС</p>
         <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
          +12%
         </span>
         </div>

        {/* Main value */}
         <p className="text-2xl font-bold text-indigo-300">$12,430</p>
         <p className="text-xs text-white/50 mb-3">Остаток на счетах</p>

        {/* Flow */}
        <div className="space-y-2">
        <ProgressRow
        label="Поступления"
        amount="+$38,400"
        value={78}
        color="linear-gradient(90deg,#818cf8,#a5b4fc)"
        delay={0.6}
      />
        <ProgressRow
        label="Расходы"
        amount="−$25,970"
        value={53}
        color="linear-gradient(90deg,#f87171,#fb923c)"
        delay={0.8}
      />
      </div>

        {/* Net */}
      <div className="flex justify-between mt-3 pt-3 border-t border-white/10">
      <span className="text-xs text-white/50">Чистый поток</span>
      <span className="text-sm font-semibold text-green-400">
       +$12,430
      </span>
      </div>

      {/* Mini chart */}
      <div className="mt-3 flex items-end gap-1 h-10">
       {[20, 35, 28, 45, 38, 55].map((h, i) => (
      <div
        key={i}
        style={{ height: h, width: 6 }}
        className="bg-indigo-400/70 rounded"
       />
        ))}
        </div>
        </motion.div>

        {/* Баланс */}
        <motion.div
          className="absolute rounded-2xl p-4 z-40"
          style={{ ...cardStyle, bottom: 20, left: 155, width: 195, rotate: -0.5, y: y3 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.7 },
            y: { duration: 5.5, delay: 1.3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Баланс</p>
          <p className="text-xl font-bold text-indigo-100">$84,320</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Чистые активы</p>
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2.5">
            <motion.div className="flex-[2]"
              style={{ background: "linear-gradient(90deg,#818cf8,#a5b4fc)" }}
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }} />
            <div className="flex-1" style={{ background: "rgba(248,113,113,0.6)" }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Активы 67%</span>
            <span className="text-red-400">Пассивы 33%</span>
          </div>
        </motion.div>

        {/* Выручка — 4th card */}
        <motion.div
          className="absolute rounded-2xl p-4 z-20"
          style={{ ...cardStyle, top: 10, right: 0, width: 170, rotate: 2, y: y4 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -12, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.9 },
            y: { duration: 6.5, delay: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Выручка</p>
          <p className="text-lg font-bold text-yellow-200">$142,800</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>За текущий квартал</p>
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full text-green-400" style={{ background: "rgba(74,222,128,0.18)" }}>
            ↑ Q3 рост 24%
          </span>
          <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span>Цель</span><span className="text-yellow-200">$160k</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#fbbf24,#fde68a)" }}
                initial={{ width: 0 }} animate={{ width: "89%" }}
                transition={{ delay: 1.8, duration: 1 }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>89% выполнено</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
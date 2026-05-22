import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const LOGOS = [
  { name: "Carrot", desc: "EdTech, 300+ сотрудников" },
  { name: "Skillbox", desc: "Онлайн-образование" },
  { name: "mpstats", desc: "Аналитика маркетплейсов" },
  { name: "Rehapa", desc: "Медицина и клиники" },
  { name: "Uzum", desc: "E-commerce, Узбекистан" },
  { name: "MyTaxi", desc: "Транспорт и логистика" },
];

const STATS = [
  { value: 500, suffix: "+", label: "компаний доверяют", color: "#6366f1" },
  { value: 98, suffix: "%", label: "остаются после триала", color: "#4ade80" },
  { value: 12, suffix: "ч", label: "среднее время настройки", color: "#fb923c" },
  { value: 4.9, suffix: "★", label: "средняя оценка клиентов", color: "#facc15", decimal: true },
];

function CountUp({ value, suffix, decimal, color }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 50;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const progress = i / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;
      setDisplay(decimal ? current.toFixed(1) : Math.floor(current).toString());
      if (i >= steps) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [inView, value, decimal]);

  return (
    <span ref={ref} style={{ color }}>
      {display}{suffix}
    </span>
  );
}

const TESTIMONIALS = [
  {
    text: "Finlab заменил нам целый финансовый отдел. Теперь я вижу прибыль по каждому проекту в реальном времени.",
    name: "Алексей К.",
    role: "CEO, IT-компания, 85 чел.",
    avatar: "АК",
    color: "#6366f1"
  },
  {
    text: "Кассовые разрывы стали историей. AI предупреждает за 3-4 недели — успеваем подготовиться.",
    name: "Мадина Р.",
    role: "CFO, Торговая сеть",
    avatar: "МР",
    color: "#4ade80"
  },
  {
    text: "Внедрили за один день. Команда сразу начала пользоваться без обучения — всё интуитивно.",
    name: "Тимур С.",
    role: "Основатель, SaaS-стартап",
    avatar: "ТС",
    color: "#fb923c"
  },
];

export default function Logos() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <div style={{ background: "#080b14", padding: "80px 24px", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div ref={ref} style={{ textAlign: "center", marginBottom: 56 }}>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16, fontWeight: 600 }}
          >
            Нам доверяют
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}
          >
            Компании, которые уже растут с Finlab
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.2 }}
            style={{ fontSize: 16, color: "rgba(255,255,255,0.35)" }}
          >
            От стартапов до холдингов с 1000+ сотрудниками
          </motion.p>
        </div>

        {/* Logo ticker */}
        <div style={{ position: "relative", marginBottom: 64, overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(90deg, #080b14, transparent)",
            zIndex: 2, pointerEvents: "none"
          }} />
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
            background: "linear-gradient(-90deg, #080b14, transparent)",
            zIndex: 2, pointerEvents: "none"
          }} />
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ display: "flex", gap: 16, width: "max-content" }}
          >
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "16px 28px",
                flexShrink: 0,
                minWidth: 160,
              }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.7)", marginBottom: 4, letterSpacing: "-0.02em" }}>
                  {logo.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{logo.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 64,
        }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "24px 20px", textAlign: "center"
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>
                <CountUp value={s.value} suffix={s.suffix} color={s.color} decimal={s.decimal} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16
        }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20, padding: "24px",
              }}
            >
              {/* Stars */}
              <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                {[...Array(5)].map((_, j) => (
                  <svg key={j} width="14" height="14" viewBox="0 0 14 14" fill="#facc15">
                    <path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10.1 3.4 12l.7-4L1.2 5.2l4-.6L7 1z" />
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>
                «{t.text}»
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: `${t.color}25`, border: `1px solid ${t.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: t.color, flexShrink: 0
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

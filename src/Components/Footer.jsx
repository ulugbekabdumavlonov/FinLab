import { motion } from "framer-motion";

const FOOTER_LINKS = {
  "Аналитика": [
    "Отчёт о движении денежных средств",
    "P&L и прибыль",
    "Баланс компании",
    "Финансовые сделки",
    "AI-аналитик",
  ],
  "Планирование": [
    "Платёжный календарь",
    "Бюджет ДДС",
    "Бюджет доходов и расходов",
    "Cashflow прогнозирование",
    "Финансовые сценарии",
  ],
  "Компания": [
    "О платформе",
    "Безопасность",
    "Интеграции",
    "API документация",
    "Поддержка",
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, rgba(99,102,241,0.15), transparent 35%), #080b14",
        borderTop: "none", // убрали резкую линию — заменяем плавным переходом
      }}
    >
      {/* ─── ПЛАВНЫЙ ПЕРЕХОД СВЕРХУ ─── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background:
            "linear-gradient(to bottom, #080b14 0%, transparent 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
          background: "rgba(99,102,241,0.12)",
          filter: "blur(140px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Noise overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.4) 0.7px, transparent 0.7px)",
          backgroundSize: "14px 14px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "100px 24px 40px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Top CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            marginBottom: 64,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "40px 32px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <p
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.35)",
                marginBottom: 14,
                fontWeight: 700,
              }}
            >
              Начните сейчас
            </p>

            <h2
              style={{
                fontSize: "clamp(28px,4vw,48px)",
                lineHeight: 1.05,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.05em",
                marginBottom: 16,
              }}
            >
              Управляйте финансами
              <br />
              как enterprise-компания
            </h2>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.42)",
                maxWidth: 520,
              }}
            >
              FinLab помогает контролировать прибыль, cashflow,
              закупки и финансовые риски в реальном времени.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "18px 28px",
              borderRadius: 18,
              background:
                "linear-gradient(135deg,#6366f1 0%, #8b5cf6 100%)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              boxShadow: "0 10px 40px rgba(99,102,241,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            Записаться на демо
          </motion.button>
        </motion.div>

        {/* Main footer grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 50,
          }}
        >
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 24,
              padding: 24,
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#fff",
                  fontSize: 16,
                  boxShadow: "0 10px 30px rgba(99,102,241,0.35)",
                }}
              >
                F
              </div>

              <div>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: "-0.03em",
                  }}
                >
                  FinLab
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 12,
                  }}
                >
                  AI Finance Platform
                </div>
              </div>
            </div>

            <p
              style={{
                color: "rgba(255,255,255,0.42)",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Финансовая операционная система для
              современных компаний, команд и холдингов.
            </p>
          </motion.div>

          {/* Footer columns */}
          {Object.entries(FOOTER_LINKS).map(([title, items], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 24,
                padding: 24,
                backdropFilter: "blur(20px)",
              }}
            >
              <h3
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 18,
                  letterSpacing: "-0.02em",
                }}
              >
                {title}
              </h3>

              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                }}
              >
                {items.map((item) => (
                  <motion.li
                    key={item}
                    whileHover={{ x: 4 }}
                    style={{
                      color: "rgba(255,255,255,0.38)",
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.38)";
                    }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          style={{
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.28)",
              fontSize: 13,
            }}
          >
            © 2026 FinLab. All rights reserved.
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Privacy Policy", "Terms of Service", "support@finlab.ai"].map(
              (item) => (
                <motion.div
                  key={item}
                  whileHover={{ y: -1 }}
                  style={{
                    color: "rgba(255,255,255,0.32)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.68)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.32)";
                  }}
                >
                  {item}
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

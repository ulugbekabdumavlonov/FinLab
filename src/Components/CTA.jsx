import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#080b14",
        padding: "40px 24px 0",
      }}
    >
      {/* Glow background */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background: "rgba(99,102,241,0.18)",
          filter: "blur(160px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Secondary glow */}
      <div
        style={{
          position: "absolute",
          bottom: -300,
          right: -200,
          width: 500,
          height: 500,
          background: "rgba(139,92,246,0.12)",
          filter: "blur(140px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
          borderRadius: 36,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.12))",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          padding: "72px 48px",
        }}
      >
        {/* Noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.5) 0.7px, transparent 0.7px)",
            backgroundSize: "14px 14px",
            pointerEvents: "none",
          }}
        />

        {/* Floating gradient line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{
              marginBottom: 22,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.62)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              backdropFilter: "blur(10px)",
            }}
          >
            7 дней бесплатного доступа
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            style={{
              fontSize: "clamp(34px, 5vw, 64px)",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.06em",
              color: "#fff",
              maxWidth: 900,
              marginBottom: 24,
            }}
          >
            Управляйте финансами
            <br />
            быстрее, чем растёт бизнес
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            style={{
              maxWidth: 700,
              fontSize: 17,
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.42)",
              marginBottom: 40,
            }}
          >
            Контролируйте cashflow, прибыль, бюджеты,
            задолженности и финансовые риски в одной
            AI-платформе.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 16,
              marginBottom: 36,
            }}
          >
            {/* Primary CTA */}
            <motion.button
              whileHover={{
                scale: 1.04,
                y: -2,
              }}
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
                boxShadow:
                  "0 10px 40px rgba(99,102,241,0.35)",
              }}
            >
              Начать бесплатно
            </motion.button>

            {/* Secondary CTA */}
            <motion.button
              whileHover={{
                scale: 1.03,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
              whileTap={{ scale: 0.98 }}
              style={{
                border:
                  "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                padding: "18px 28px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                backdropFilter: "blur(10px)",
              }}
            >
              Посмотреть демо
            </motion.button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 22,
              color: "rgba(255,255,255,0.3)",
              fontSize: 13,
            }}
          >
            {[
              "Без привязки карты",
              "Настройка за 1 день",
              "Поддержка 24/7",
              "Enterprise-grade security",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow:
                      "0 0 12px rgba(74,222,128,0.8)",
                  }}
                />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

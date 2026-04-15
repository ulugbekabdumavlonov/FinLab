import { motion } from "framer-motion";

const items = [
  "Интеграции с банками",
  "Авторазнос операций",
  "Финансовые отчёты",
  "AI аналитика"
];

export default function Features() {
  return (
    <div className="px-16 py-20 grid grid-cols-4 gap-6">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05 }}
          className="p-6 bg-white rounded-2xl shadow cursor-pointer"
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
}
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <div className="px-16 py-20 text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-3xl">
      
      <h2 className="text-3xl font-bold mb-6">
        Попробуй Finlab бесплатно
      </h2>

      <p className="mb-6 opacity-80">
        7 дней полного доступа
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold"
      >
        Начать сейчас
      </motion.button>

    </div>
  );
}
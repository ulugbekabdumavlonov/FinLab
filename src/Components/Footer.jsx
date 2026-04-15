export default function Footer() {
    return (
      <div className="bg-[#0f2454] text-white px-10 py-16">
        <div className="grid grid-cols-4 gap-10">
  
          {/* Лого */}
          <div>
            <h2 className="text-2xl font-bold mb-6">FinLab</h2>
          </div>
  
          {/* Аналитика */}
          <div>
            <p className="font-semibold mb-4">Аналитика и отчёты</p>
            <ul className="space-y-2 text-gray-300">
              <li>Отчёт о движении денежных средств</li>
              <li>Отчёт о прибылях и убытках</li>
              <li>Баланс</li>
              <li>Сделки</li>
              <li>ИИ-аналитик</li>
            </ul>
          </div>
  
          {/* Планирование */}
          <div>
            <p className="font-semibold mb-4">Планирование</p>
            <ul className="space-y-2 text-gray-300">
              <li>Платёжный календарь</li>
              <li>Бюджет ДДС</li>
              <li>Бюджет доходов и расходов</li>
            </ul>
          </div>
  
          {/* CTA */}
          <div>
            <p className="mb-4 text-gray-300">
              Мы перезвоним, покажем сервис и поможем разобраться
            </p>
            <button className="bg-blue-600 px-6 py-3 rounded-xl hover:scale-105 transition">
              Записаться на консультацию
            </button>
          </div>
  
        </div>
      </div>
    );
  }
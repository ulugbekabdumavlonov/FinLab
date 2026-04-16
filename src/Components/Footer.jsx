export default function Footer() {
  return (
    <div className="bg-[#0f2454] text-white px-6 md:px-10 py-10 md:py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">

        {/* Лого */}
        <div className="col-span-2 md:col-span-1">
          <h2 className="text-2xl font-bold mb-4 md:mb-6">FinLab</h2>
        </div>

        {/* Аналитика */}
        <div>
          <p className="font-semibold mb-3 md:mb-4">Аналитика и отчёты</p>
          <ul className="space-y-2 text-gray-300 text-sm md:text-base">
            <li>Отчёт о движении денежных средств</li>
            <li>Отчёт о прибылях и убытках</li>
            <li>Баланс</li>
            <li>Сделки</li>
            <li>ИИ-аналитик</li>
          </ul>
        </div>

        {/* Планирование */}
        <div>
          <p className="font-semibold mb-3 md:mb-4">Планирование</p>
          <ul className="space-y-2 text-gray-300 text-sm md:text-base">
            <li>Платёжный календарь</li>
            <li>Бюджет ДДС</li>
            <li>Бюджет доходов и расходов</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="col-span-2 md:col-span-1">
          <p className="mb-4 text-gray-300 text-sm md:text-base">
            Мы перезвоним, покажем сервис и поможем разобраться
          </p>
          <button className="w-full md:w-auto bg-blue-600 px-6 py-3 rounded-xl hover:scale-105 transition text-sm md:text-base">
            Записаться на консультацию
          </button>
        </div>

      </div>
    </div>
  );
}

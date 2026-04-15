import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

/**
 * useCurrency()
 *
 * Returns:
 *   targetCurrency  — "USD" | "UZS" | "EUR" | ...  (from user settings)
 *   rates           — { USD: 1, UZS: 12900, EUR: 0.92, ... }  (base = USD)
 *   convert(amount, fromCurrency) — converts amount → targetCurrency
 *   symbol          — currency symbol for display
 *   loading         — true while fetching
 */

const SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£",
  UZS: "so'm", KZT: "₸", RUB: "₽", JPY: "¥",
};

export function useCurrency() {
  const [targetCurrency, setTargetCurrency] = useState("UZS");
  const [rates, setRates]                   = useState({});
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 1. Читаем выбранную валюту из Firestore
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        const currency = userSnap.data()?.locale?.currency || "UZS";
        setTargetCurrency(currency);

        // 2. Фетчим курсы (base = USD, бесплатный API)
        const res  = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data?.rates) setRates(data.rates);
      } catch (e) {
        console.error("useCurrency error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * convert(amount, fromCurrency)
   * Если курсы ещё не загружены — возвращает amount как есть.
   */
  const convert = (amount, fromCurrency = "UZS") => {
    if (!rates || Object.keys(rates).length === 0) return amount;
    if (fromCurrency === targetCurrency) return amount;

    const from = rates[fromCurrency];
    const to   = rates[targetCurrency];
    if (!from || !to) return amount;

    // amount → USD → targetCurrency
    return (amount / from) * to;
  };

  const symbol = SYMBOLS[targetCurrency] || targetCurrency;

  return { targetCurrency, rates, convert, symbol, loading };
}
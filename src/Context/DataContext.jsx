import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    let loadedCount = 0;
    const total = 3;

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount === total) {
        setLoading(false);
      }
    };

    // 🔥 Transactions
    const unsubTx = onSnapshot(
      collection(db, "users", user.uid, "transactions"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(data);
        markLoaded();
      }
    );

    // 🔥 Accounts
    const unsubAcc = onSnapshot(
      collection(db, "users", user.uid, "accounts"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAccounts(data);
        markLoaded();
      }
    );

    // 🔥 Categories
    const unsubCat = onSnapshot(
      collection(db, "users", user.uid, "categories"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(data);
        markLoaded();
      }
    );

    return () => {
      unsubTx();
      unsubAcc();
      unsubCat();
    };
  }, [user]);

  const value = {
    transactions,
    accounts,
    categories,
    loading,
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        color: "#6b7280"
      }}>
        Загрузка данных...
      </div>
    );
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// хук
export function useData() {
  return useContext(DataContext);
}

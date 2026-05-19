import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(false); // ← false по умолчанию

  useEffect(() => {
    if (!user) {
      setLoading(false); // ← если нет пользователя — не грузим
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const total = 3;

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount === total) setLoading(false);
    };

    const unsubTx = onSnapshot(
      collection(db, "users", user.uid, "transactions"),
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubAcc = onSnapshot(
      collection(db, "users", user.uid, "accounts"),
      (snapshot) => {
        setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    const unsubCat = onSnapshot(
      collection(db, "users", user.uid, "categories"),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        markLoaded();
      },
      () => markLoaded()
    );

    return () => {
      unsubTx();
      unsubAcc();
      unsubCat();
    };
  }, [user]);

  return (
    <DataContext.Provider value={{ transactions, accounts, categories, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

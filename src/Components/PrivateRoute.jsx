import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function PrivateRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ⏳ пока проверяем — ничего не показываем
  if (loading) return <div>Loading...</div>;

  // ❌ если не залогинен → на login
  if (!user) return <Navigate to="/login" />;

  // ✅ если есть пользователь → пускаем
  return children;
}
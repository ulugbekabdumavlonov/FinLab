import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { store } from "../useAppStore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (currentUser) => {
      // Отписываемся от предыдущего пользователя
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (!currentUser) {
        // Очищаем при logout
        window.__finlab_user = null;
        store.reset();
        setUser(null);
        setLoading(false);
        return;
      }

      // Подписка на документ пользователя в реальном времени.
      // Как только owner меняет права → сотрудник получает обновление автоматически.
      userUnsub = onSnapshot(
        doc(db, "users", currentUser.uid),
        (snap) => {
          const data = snap.exists() ? snap.data() : {};

          const userData = {
            ...currentUser,
            permissions:  data.permissions  || {},
            userRole:     data.userRole     || "employee",
            firstName:    data.firstName    || "",
            lastName:     data.lastName     || "",
            // companyId: для owner = его uid, для сотрудника = uid владельца
            companyId:    data.companyId    || currentUser.uid,
          };

          // Записываем в window чтобы useAppStore (синглтон вне React)
          // мог прочитать companyId без хука
          window.__finlab_user = userData;

          // Если companyId изменился — сбрасываем кэш стора
          // (например, сотрудника перевели в другую компанию)
          if (
            window.__finlab_user_prev_companyId &&
            window.__finlab_user_prev_companyId !== userData.companyId
          ) {
            store.reset();
          }
          window.__finlab_user_prev_companyId = userData.companyId;

          setUser(userData);
          setLoading(false);
        },
        (error) => {
          console.error("Ошибка подписки на пользователя:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  const logout = async () => {
    window.__finlab_user = null;
    store.reset();
    await signOut(auth);
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        color: "#6b7280",
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

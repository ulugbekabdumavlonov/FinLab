import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <Sidebar />

      <div style={styles.main}>
        <Outlet />
      </div>
    </div>
  );
}

const styles = {
  main: {
    marginLeft: "260px", // 🔥 ключевое
    padding: "20px",
    minHeight: "100vh",
    background: "#f8fafc",
  },
};
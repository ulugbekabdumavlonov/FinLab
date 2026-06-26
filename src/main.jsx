import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./Context/AuthContext";
import { DataProvider } from "./Context/DataContext";
import { WarehouseProvider } from "./Pages/Warehouse/context/warehouseContext.jsx";
import { ThemeProvider } from "./Context/ThemeContext";
import { LanguageProvider } from "./Context/LanguageContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <WarehouseProvider>
              <App />
            </WarehouseProvider>
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);

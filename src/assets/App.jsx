import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import LandingPage from "./Pages/LandingPage";


import Dashboard from "./Pages/Dashboard";
import Cashflow from "./Pages/Cashflow";
import PL from "./pages/PL";
import Balance from "./pages/Balance";
import Settings from "./Pages/Settings";
import Database from "./Pages/Database";
import Operations from "./Pages/Operations";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyWallet from "./pages/MyWallet";
import MyCompany from "./pages/MyCompany";
import PrivateRoute from "./components/PrivateRoute";
import MyCategories from "./Pages/MyCategories";
import MyProjects from "./Pages/MyProjects";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔥 ЛЕНДИНГ */}
        <Route path="/" element={<LandingPage />} />

        {/* 🔐 AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 ПРИЛОЖЕНИЕ (ЗАЩИЩЕННОЕ) */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cashflow" element={<Cashflow />} />
          <Route path="pl" element={<PL />} />
          <Route path="balance" element={<Balance />} />
          <Route path="settings" element={<Settings />} />
          <Route path="Database" element={<Database />} />
          <Route path="Operations" element={<Operations />} />
          <Route path="MyWallet" element={<MyWallet />} />
          <Route path="MyCompany" element={<MyCompany />} />
          <Route path="MyCategories" element={<MyCategories />} />
          <Route path="MyProjects" element={<MyProjects />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
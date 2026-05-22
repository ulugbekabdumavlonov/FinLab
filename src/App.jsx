import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Components/Layout";
import LandingPage from "./Pages/LandingPage";
import Dashboard from "./Pages/Dashboard";
import Cashflow from "./Pages/Cashflow";
import PL from "./Pages/PL";
import Balance from "./Pages/Balance";
import Settings from "./Pages/Settings";
import Database from "./Pages/Database";
import Operations from "./Pages/Operations";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import MyWallet from "./Pages/MyWallet";
import MyCompany from "./Pages/MyCompany";
import PrivateRoute from "./Components/PrivateRoute";
import MyCategories from "./Pages/MyCategories";
import MyProjects from "./Pages/MyProjects";
import AccrualsPage from "./Pages/Accrualspage";
import Employees from "./Pages/Employees";
import SalaryStatement from "./Pages/SalaryStatement";
import Counterpartiespage from "./Pages/Counterpartiespage";
import Settlements from "./Pages/Settlements";
import InvitePage from "./Pages/Invitepage";
import Onboarding from "./Pages/Onboarding";
import Warehouse from "./Pages/Warehouse";
import Sales from "./Pages/Sales";
import Purchases from "./Pages/Purchases";
import Items from "./Pages/Items";
import Helppage from "./Pages/Helppage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔥 ЛЕНДИНГ */}
        <Route path="/" element={<LandingPage />} />

        {/* 🔐 AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* ✅ ИНВАЙТ — публичный, без авторизации */}
        <Route path="/invite/:token" element={<InvitePage />} />

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
          <Route path="AccrualsPage" element={<AccrualsPage />} />
          <Route path="Employees" element={<Employees />} />
          <Route path="Salarystatement" element={<SalaryStatement />} />
          <Route path="Counterpartiespage" element={<Counterpartiespage />} />
          <Route path="Settlements" element={<Settlements />} />
          <Route path="Warehouse" element={<Warehouse />} />
          <Route path="Sales" element={<Sales />} />
          <Route path="Purchases" element={<Purchases />} />
          <Route path="Items" element={<Items />} />
          <Route path="Helppage" element={<Helppage />} />
          <Route path="help" element={<Helppage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

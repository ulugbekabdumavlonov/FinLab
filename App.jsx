// src/App.jsx
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./Components/Layout";
import PrivateRoute from "./Components/PrivateRoute";
import AccrualsPage from "./Pages/Finance/PnL/accruals/AccrualsPage";
import MyCategories from "./Pages/Directories/MyCategories";
import MyCompany from "./Pages/Directories/MyCompany";
import Counterpartiespage from "./Pages/Directories/MyCounterparties";
import MyProjects from "./Pages/Directories/MyProjects";
import MyWallet from "./Pages/Directories/MyWallet";
import Balance from "./Pages/Finance/Balance";
import Cashflow from "./Pages/Finance/Cashflow/Cashflow";
import Dashboard from "./Pages/Finance/Dashboard";
import Database from "./Pages/Finance/Database";
import Operations from "./Pages/Finance/Operations/Operations";
import PL from "./Pages/Finance/PnL/PL";
import Employees from "./Pages/HR/Employees";
import SalaryStatement from "./Pages/HR/SalaryStatement";
import LandingPage from "./Pages/../Components/LandingPage";
import Advances from "./Pages/HR/Advances";
import Helppage from "./Pages/LoginandRegister/Helppage";
import InviteRegistration from "./Pages/Auth/InviteRegistration";
import Leaves from "./Pages/HR/Leaves";
import Login from "./Pages/LoginandRegister/Login";
import Onboarding from "./Pages/LoginandRegister/OnboardingEmployee";
import OnboardingOwner from "./Pages/LoginandRegister/OnboardingOwner";
import OnboardingEmployee from "./Pages/LoginandRegister/OnboardingEmployee";
import Orgchart from "./Pages/HR/Orgchart";
import Register from "./Pages/LoginandRegister/Register";
import Settings from "./Pages/Settings/Settings";
import Timesheet from "./Pages/HR/Timesheet";
import Settlements from "./Pages/Settlements";
import Items from "./Pages/Warehouse/pages/ProductsPage/ProductsPage";
import Purchases from "./Pages/Warehouse/pages/PurchasesPage/PurchasesPage";
import Sales from "./Pages/Warehouse/pages/SalesPage/SalesPage";
import Warehouse from "./Pages/Warehouse/pages/WarehousePage/WarehousePage";
import WarehouseLayout from "./Pages/Warehouse/WarehouseLayout";
import EmployeePortal from "./Pages/HR/Employeeportal";
import ChatPage from "./Pages/Chat/ChatPage";
import InviteManager from "./Pages/Settings/components/InviteManager";
import TasksPage from "./Pages/Task/Taskspage";
import Departments from "./Pages/HR/Departments";
import Positions from "./Pages/HR/Positions";
import Levels from "./Pages/HR/Levels";
import HRDashboard from "./Pages/HR/HRDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔥 ЛЕНДИНГ */}
        <Route path="/" element={<LandingPage />} />

        {/* 🔐 AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* ✅ СТАРЫЙ ONBOARDING — редирект на owner */}
        <Route path="/onboarding" element={<Navigate to="/onboarding/owner" replace />} />
        
        {/* ✅ НОВЫЕ ONBOARDING */}
        <Route path="/onboarding/owner" element={<OnboardingOwner />} />
        <Route path="/onboarding/employee" element={<OnboardingEmployee />} />

        {/* ✅ ИНВАЙТ */}
        <Route path="/invite/:token" element={<InviteRegistration />} />

        {/* EmployeePortal */}
        <Route path="/portal" element={<EmployeePortal />} />
        <Route path="/portal/:token" element={<EmployeePortal />} />

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
          <Route path="AccrualsPage" element={<AccrualsPage />} />
          <Route path="Employees" element={<Employees />} />
          <Route path="Salarystatement" element={<SalaryStatement />} />
          <Route path="Settlements" element={<Settlements />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="Departments" element={<Departments />} />
          <Route path="Positions" element={<Positions />} />
          <Route path="Levels" element={<Levels />} />
          <Route path="HRDashboard" element={<HRDashboard />} />
          {/* Профиль сотрудника */}
          <Route path="profile" element={<EmployeePortal />} />

          <Route path="directories">
            <Route index element={<Navigate to="counterparties" replace />} />
            <Route path="counterparties" element={<Counterpartiespage />} />
            <Route path="categories"     element={<MyCategories />} />
            <Route path="projects"       element={<MyProjects />} />
            <Route path="wallets"        element={<MyWallet />} />
            <Route path="company"        element={<MyCompany />} />
          </Route>

          {/* Старые роуты справочников — редиректы */}
          <Route path="MyWallet"          element={<Navigate to="/app/directories/wallets"        replace />} />
          <Route path="MyCompany"         element={<Navigate to="/app/directories/company"        replace />} />
          <Route path="MyCategories"      element={<Navigate to="/app/directories/categories"     replace />} />
          <Route path="MyProjects"        element={<Navigate to="/app/directories/projects"       replace />} />
          <Route path="Counterpartiespage" element={<Navigate to="/app/directories/counterparties" replace />} />

          {/* СКЛАД */}
          <Route element={<WarehouseLayout />}>
            <Route path="warehouse"  element={<Warehouse />} />
            <Route path="sales"      element={<Sales />} />
            <Route path="purchases"  element={<Purchases />} />
            <Route path="items"      element={<Items />} />
            <Route path="Warehouse"  element={<Warehouse />} />
            <Route path="Sales"      element={<Sales />} />
            <Route path="Purchases"  element={<Purchases />} />
            <Route path="Items"      element={<Items />} />
          </Route>

          <Route path="Helppage"       element={<Helppage />} />
          <Route path="help"           element={<Helppage />} />
          <Route path="advances"       element={<Advances />} />
          <Route path="leaves"         element={<Leaves />} />
          <Route path="orgchart"       element={<Orgchart />} />
          <Route path="timesheet"      element={<Timesheet />} />
          <Route path="invites"        element={<InviteManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

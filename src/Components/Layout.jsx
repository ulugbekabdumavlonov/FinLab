import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <Sidebar />

      {/* 
        На десктопе: отступ слева 260px (сайдбар фиксированный)
        На мобильных: отступ сверху 56px (верхняя панель с бургером), нет отступа слева
      */}
      <div className="
        md:ml-[260px] md:pt-0
        ml-0 pt-[56px]
        min-h-screen bg-[#f8fafc] p-5
      ">
        <Outlet />
      </div>
    </div>
  );
}

import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      {/*
        pt-14       = отступ под фиксированным navbar (56px)
        w-full      = на всю ширину экрана
        px-4/6/8    = адаптивные боковые отступы по брейкпоинтам
      */}
      <main className="pt-14 w-full min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

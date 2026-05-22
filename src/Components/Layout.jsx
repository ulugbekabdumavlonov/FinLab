import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const isFullscreen = location.pathname.toLowerCase().includes("operations") 
                  || location.pathname.toLowerCase().includes("warehouse")
                  || location.pathname.toLowerCase().includes("sales")
                  || location.pathname.toLowerCase().includes("purchases")
                  || location.pathname.toLowerCase().includes("items")
                  || location.pathname.toLowerCase().includes("mywallet")
                  || location.pathname.toLowerCase().includes("mycompany")
                  || location.pathname.toLowerCase().includes("myproject")
                  || location.pathname.toLowerCase().includes("mycategories")
                  || location.pathname.toLowerCase().includes("counterpartiespage")
                  || location.pathname.toLowerCase().includes("dashboard");
  

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className={`mt-14 flex-1 overflow-hidden ${isFullscreen ? "flex flex-col" : "overflow-y-auto"}`}>
        {isFullscreen
          ? <Outlet />
          : (
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
              <Outlet />
            </div>
          )
        }
      </main>
    </div>
  );
}

import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

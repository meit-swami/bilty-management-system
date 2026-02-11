import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useCompanyName } from "@/hooks/use-company-settings";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function AppLayout() {
  const companyName = useCompanyName();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4">
            <SidebarTrigger />
            <NotificationBell />
          </header>
          <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
            <Outlet />
          </main>
          <footer className="border-t py-3 px-4 text-center text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} {companyName} · Developed by{" "}
            <a href="https://brandzaha.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
              BRANDZAHA CREATIVE AGENCY
            </a>{" "}
            with ❤️
          </footer>
          <ChatWidget />
        </div>
      </div>
    </SidebarProvider>
  );
}

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Database,
  BarChart3,
  FileText,
  Truck,
  Users2,
  Wallet,
  Settings,
  HardDrive,
  UserCog,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Master Data", path: "/master-data", icon: Database },
  { label: "All Bilties", path: "/bilties", icon: Truck },
  { label: "Parties", path: "/parties", icon: Users2 },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Expenses", path: "/expenses", icon: Wallet },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Backup", path: "/backup", icon: HardDrive },
  { label: "Users", path: "/users", icon: UserCog },
];

export function TopNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 mr-6 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">Simple Capital</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Solutions</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden ml-auto"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t bg-card p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName } from "@/hooks/use-company-settings";
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
  ClipboardList,
  LogOut,
  ShoppingCart,
  CreditCard,
  FileSignature,
  Target,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Master Data", path: "/master-data", icon: Database },
  { label: "All Bilties", path: "/bilties", icon: Truck },
  { label: "Parties", path: "/parties", icon: Users2 },
];

const salesNav = [
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Payment Records", path: "/payments", icon: CreditCard },
  { label: "Proposals", path: "/proposals", icon: FileSignature },
  { label: "Leads", path: "/leads", icon: Target },
];

const otherNav = [
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Expenses", path: "/expenses", icon: Wallet },
  { label: "Email", path: "/email", icon: Mail },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Backup", path: "/backup", icon: HardDrive },
  { label: "Users", path: "/users", icon: UserCog },
  { label: "Audit Log", path: "/audit-log", icon: ClipboardList },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const companyName = useCompanyName();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderNavItems = (items: typeof mainNav) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label}>
            <Link to={item.path}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold leading-tight text-sidebar-primary-foreground">{companyName}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">Transport Management</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(mainNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(salesNav)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(otherNav)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3 space-y-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
        {!collapsed && (
          <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
            <p>© {new Date().getFullYear()} {companyName}</p>
            <p>
              Developed by{" "}
              <a href="https://brandzaha.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                BRANDZAHA CREATIVE AGENCY
              </a>{" "}
              with ❤️
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

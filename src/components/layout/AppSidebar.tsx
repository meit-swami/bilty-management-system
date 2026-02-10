import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
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

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold leading-tight text-foreground">Simple Capital</p>
              <p className="text-[10px] leading-tight text-muted-foreground">Solutions</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={item.label}
                  >
                    <Link to={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">© Simple Capital Solutions</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

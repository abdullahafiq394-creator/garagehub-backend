import { 
  LayoutDashboard, 
  CheckCircle,
  BarChart3,
  Users,
  DollarSign,
  Wallet,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const SIDEBAR_WIDTH_EXPANDED = 288;
export const SIDEBAR_WIDTH_COLLAPSED = 80;

interface AdminSidebarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCloseMobileMenu?: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Users, label: "Users", href: "/admin/dashboard?tab=users" },
  { icon: CheckCircle, label: "Workshops", href: "/admin/dashboard?tab=workshops" },
  { icon: BarChart3, label: "Suppliers", href: "/admin/dashboard?tab=suppliers" },
  { icon: Shield, label: "Escrow", href: "/admin/dashboard?tab=escrow" },
  { icon: DollarSign, label: "Transactions", href: "/admin/dashboard?tab=transactions" },
  { icon: Wallet, label: "Wallets", href: "/admin/dashboard?tab=wallets" },
  { icon: MapPin, label: "Live Map", href: "/admin/dashboard?tab=map" },
];

export function AdminSidebar({ 
  isSidebarOpen = true, 
  onToggleSidebar,
  onCloseMobileMenu 
}: AdminSidebarProps = {}) {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-300",
        "w-72 lg:block",
        !isSidebarOpen && "lg:w-20"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-2 flex-1 min-w-0", !isSidebarOpen && "lg:justify-center")}>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
              <Shield className="h-6 w-6" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Admin</p>
                <p className="text-xs text-muted-foreground">Platform Control</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={onToggleSidebar}
            data-testid="button-toggle-sidebar"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "cursor-pointer hover-elevate active-elevate-2 text-muted-foreground hover:text-sidebar-foreground"
                )}
                data-testid={`sidebar-item-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <item.icon className="h-5 w-5 transition-colors duration-200" />
                {isSidebarOpen && (
                  <span className="text-sm font-medium transition-colors duration-200">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          ))}

          <div className="pt-2 border-t border-sidebar-border mt-2">
            <Link href="/settings">
              <div
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "cursor-pointer hover-elevate active-elevate-2 text-muted-foreground hover:text-sidebar-foreground"
                )}
                data-testid="sidebar-item-settings"
              >
                <Settings className="h-5 w-5 transition-colors duration-200" />
                {isSidebarOpen && (
                  <span className="text-sm font-medium transition-colors duration-200">
                    Settings
                  </span>
                )}
              </div>
            </Link>
            
            <button
              onClick={handleLogout}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover-elevate active-elevate-2 text-muted-foreground hover:text-sidebar-foreground"
              )}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 transition-colors duration-200" />
              {isSidebarOpen && (
                <span className="text-sm font-medium transition-colors duration-200">
                  Logout
                </span>
              )}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

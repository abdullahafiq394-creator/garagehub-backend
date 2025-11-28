import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  UserCog, 
  Wrench, 
  Package, 
  ShoppingCart,
  BarChart3,
  Receipt,
  FileText,
  TrendingUp,
  Car,
  DollarSign,
  Wallet,
  Banknote,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Calendar
} from "lucide-react";
import { SidebarLink } from "./SidebarLink";
import { SidebarSection } from "./SidebarSection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const SIDEBAR_WIDTH_EXPANDED = 288; // w-72 = 18rem = 288px
export const SIDEBAR_WIDTH_COLLAPSED = 80; // w-20 = 5rem = 80px

interface WorkshopSidebarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCloseMobileMenu?: () => void;
}

export function WorkshopSidebar({ 
  isSidebarOpen = true, 
  onToggleSidebar,
  onCloseMobileMenu 
}: WorkshopSidebarProps = {}) {
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
            <img 
              src="/assets/logo/garagehub-logo.jpg" 
              alt="GarageHub" 
              className={cn("object-contain flex-shrink-0", isSidebarOpen || "lg:h-8 lg:w-auto")}
              style={{ height: isSidebarOpen ? '40px' : undefined, filter: 'drop-shadow(0 0 8px rgba(0, 183, 255, 0.4))' }}
            />
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Workshop</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex flex-shrink-0"
            onClick={onToggleSidebar}
            data-testid="button-toggle-sidebar"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <SidebarLink
            href="/workshop/dashboard"
            icon={LayoutDashboard}
            label="Overview"
            isCollapsed={!isSidebarOpen}
            onClick={onCloseMobileMenu}
          />

          <SidebarSection 
            icon={FolderOpen} 
            label="Manage" 
            isCollapsed={!isSidebarOpen}
          >
            <SidebarLink
              href="/workshop/dashboard/customers"
              icon={Users}
              label="Customers"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/staff"
              icon={UserCog}
              label="Staff"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/bookings"
              icon={Calendar}
              label="Bookings"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/jobs"
              icon={Wrench}
              label="Jobs"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/parts-requests"
              icon={Package}
              label="Parts Requests"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/inventory"
              icon={Package}
              label="Inventory"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/marketplace"
              icon={ShoppingCart}
              label="Marketplace"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/sales"
              icon={Receipt}
              label="Sales"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/manual-invoices"
              icon={FileText}
              label="Manual Invoices"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/commissions"
              icon={TrendingUp}
              label="Commissions"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/bays"
              icon={Car}
              label="Bay Status"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/expenses"
              icon={DollarSign}
              label="Expenses"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/finance"
              icon={Wallet}
              label="Finance"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/payroll"
              icon={Banknote}
              label="Payroll"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/reports"
              icon={BarChart3}
              label="Reports"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            <SidebarLink
              href="/workshop/dashboard/activity"
              icon={Activity}
              label="Activity Log"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
          </SidebarSection>

          <div className="pt-2 border-t border-sidebar-border mt-2">
            <SidebarLink
              href="/workshop/settings"
              icon={Settings}
              label="Settings"
              isCollapsed={!isSidebarOpen}
              onClick={onCloseMobileMenu}
            />
            
            <button
              onClick={handleLogout}
              className={cn(
                "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover-elevate active-elevate-2"
              )}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200" />
              {isSidebarOpen && (
                <span className="text-sm font-medium text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200">
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

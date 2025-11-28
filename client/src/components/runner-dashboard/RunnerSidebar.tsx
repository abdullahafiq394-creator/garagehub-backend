import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Truck,
  MapPin,
  Wallet,
  Bell,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { SidebarLink } from "../workshop-dashboard/SidebarLink";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const SIDEBAR_WIDTH_EXPANDED = 288;
export const SIDEBAR_WIDTH_COLLAPSED = 80;

export function RunnerSidebar() {
  const [, navigate] = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("runnerSidebarOpen");
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("runnerSidebarOpen", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const sidebarContent = (isCollapsed: boolean = false) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img 
            src="/assets/logo/garagehub-logo.jpg?v=20251110" 
            alt="GarageHub" 
            className="h-10 w-auto object-contain flex-shrink-0"
            style={{ filter: 'drop-shadow(0 0 8px rgba(102, 255, 0, 0.6))' }}
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Runner</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={closeMobileMenu}
          data-testid="button-close-mobile-menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <SidebarLink
          href="/runner/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          isCollapsed={isCollapsed}
          onClick={closeMobileMenu}
        />
        <SidebarLink
          href="/runner/jobs"
          icon={Truck}
          label="My Deliveries"
          isCollapsed={isCollapsed}
          onClick={closeMobileMenu}
        />
        <SidebarLink
          href="/runner/gps"
          icon={MapPin}
          label="Live Map"
          isCollapsed={isCollapsed}
          onClick={closeMobileMenu}
        />
        <SidebarLink
          href="/runner/wallet"
          icon={Wallet}
          label="Wallet"
          isCollapsed={isCollapsed}
          onClick={closeMobileMenu}
        />
        <SidebarLink
          href="/notifications"
          icon={Bell}
          label="Notifications"
          isCollapsed={isCollapsed}
          onClick={closeMobileMenu}
        />

        <div className="pt-2 border-t border-sidebar-border mt-2">
          <SidebarLink
            href="/runner/settings"
            icon={Settings}
            label="Settings"
            isCollapsed={isCollapsed}
            onClick={closeMobileMenu}
          />
          
          <button
            onClick={() => {
              closeMobileMenu();
              handleLogout();
            }}
            className={cn(
              "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover-elevate active-elevate-2"
            )}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200" />
            {!isCollapsed && (
              <span className="text-sm font-medium text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200">
                Logout
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(true)}
        data-testid="button-open-mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={closeMobileMenu}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar z-50 md:hidden shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--role-gradient-from)), hsl(var(--role-gradient-to)))'
              }}
            >
              {sidebarContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "hidden md:block h-screen border-r border-sidebar-border shrink-0 transition-all duration-300",
          isSidebarOpen ? "w-72" : "w-20"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(var(--role-gradient-from)), hsl(var(--role-gradient-to)))'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className={cn("flex items-center gap-2 flex-1 min-w-0", !isSidebarOpen && "justify-center")}>
              <img 
                src="/assets/logo/garagehub-logo.jpg" 
                alt="GarageHub" 
                className={cn("object-contain flex-shrink-0", isSidebarOpen ? "h-10 w-auto" : "h-8 w-auto")}
                style={{ filter: 'drop-shadow(0 0 8px rgba(102, 255, 0, 0.6))' }}
              />
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Runner</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarLink
              href="/runner/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isCollapsed={!isSidebarOpen}
            />
            <SidebarLink
              href="/runner/jobs"
              icon={Truck}
              label="My Deliveries"
              isCollapsed={!isSidebarOpen}
            />
            <SidebarLink
              href="/runner/gps"
              icon={MapPin}
              label="Live Map"
              isCollapsed={!isSidebarOpen}
            />
            <SidebarLink
              href="/runner/wallet"
              icon={Wallet}
              label="Wallet"
              isCollapsed={!isSidebarOpen}
            />
            <SidebarLink
              href="/notifications"
              icon={Bell}
              label="Notifications"
              isCollapsed={!isSidebarOpen}
            />

            <div className="pt-2 border-t border-sidebar-border mt-2">
              <SidebarLink
                href="/runner/settings"
                icon={Settings}
                label="Settings"
                isCollapsed={!isSidebarOpen}
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
                {!isSidebarOpen && (
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200">
                    Logout
                  </span>
                )}
              </button>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

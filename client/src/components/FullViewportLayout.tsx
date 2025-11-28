import { ReactNode, useState, useEffect, cloneElement, isValidElement } from "react";
import { motion } from "framer-motion";
import { Wallet, Menu, X, Plus, Languages } from "lucide-react";
import type { UserRole } from "@shared/schema";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Link, useLocation } from "wouter";

interface FullViewportLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  header?: ReactNode;
  role?: UserRole;
}

export function FullViewportLayout({ children, sidebar, header, role }: FullViewportLayoutProps) {
  const { balance, isLoading: walletLoading } = useWalletBalance();
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist sidebar state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`sidebar-${role || 'default'}`);
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
    }
  }, [role]);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem(`sidebar-${role || 'default'}`, String(newState));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Clone sidebar element with injected props
  const sidebarWithProps = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<any>, {
        isSidebarOpen: sidebarOpen,
        onToggleSidebar: toggleSidebar,
        onCloseMobileMenu: closeMobileMenu,
      })
    : sidebar;

  return (
    <div 
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground"
      data-role={role}
    >
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <div
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarWithProps}
      </div>
      
      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar with Wallet & Notifications */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden"
              onClick={toggleMobileMenu}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            {/* Desktop Sidebar Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className="hidden lg:flex"
              onClick={toggleSidebar}
              data-testid="button-sidebar-toggle"
            >
              <Menu size={20} />
            </Button>

            <h1 className="text-sm sm:text-base font-semibold capitalize" data-testid="text-page-title">
              {role ? `${role} Dashboard` : 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Wallet Balance with Top-up Button */}
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20"
                data-testid="wallet-balance-display"
              >
                <Wallet size={16} className="text-accent flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                  {walletLoading ? (
                    "Loading..."
                  ) : (
                    `RM ${balance.toFixed(2)}`
                  )}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                asChild
                data-testid="button-wallet-topup"
              >
                <Link href="/wallet/topup">
                  <Plus size={16} />
                </Link>
              </Button>
            </div>

            {/* Language Toggle Button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setLanguage(language === "ms" ? "en" : "ms")}
              title={language === "ms" ? "Switch to English" : "Tukar ke Bahasa Malaysia"}
              data-testid="button-language-toggle"
            >
              <Languages size={16} />
            </Button>

            {/* Notification Bell with Panel */}
            <NotificationPanel />
          </div>
        </header>

        {/* Optional Secondary Header */}
        {header && (
          <div className="flex-shrink-0 border-b border-border">
            {header}
          </div>
        )}
        
        {/* Scrollable Content Area */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-y-auto"
          data-testid="main-content-area"
        >
          <div className="w-full h-full px-4 sm:px-6 py-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {children}
            </motion.div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}

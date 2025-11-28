import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import MobileBottomNav from "@/components/MobileBottomNav";

interface DashboardLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
  maxWidth?: "7xl" | "full";
}

export default function DashboardLayout({ 
  children, 
  headerSlot,
  maxWidth = "7xl" 
}: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {/* Optional header slot for top utility bar */}
        {headerSlot && (
          <div className="sticky top-0 z-40 backdrop-blur-lg border-b bg-background/95 border-border">
            {headerSlot}
          </div>
        )}

        {/* Main content area */}
        <main className={`${maxWidth === "7xl" ? "max-w-7xl" : "max-w-full"} mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav userRole={user?.role} />
      </motion.div>
    </div>
  );
}

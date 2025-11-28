import { useState, useEffect, ReactNode } from "react";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarSectionProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  isCollapsed?: boolean;
  storageKey?: string;
}

export function SidebarSection({ 
  icon: Icon, 
  label, 
  children, 
  isCollapsed = false,
  storageKey = "sidebarManageExpanded"
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(isExpanded));
    }
  }, [isExpanded, storageKey]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return (
    <div>
      <button
        onClick={toggleExpanded}
        className={cn(
          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover-elevate active-elevate-2"
        )}
        data-testid="sidebar-section-manage"
      >
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200" />
        
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200">
              {label}
            </span>
            <ChevronRight 
              className={cn(
                "h-4 w-4 text-muted-foreground group-hover:text-sidebar-foreground transition-all duration-200",
                isExpanded && "rotate-90"
              )} 
            />
          </>
        )}
      </button>

      {!isCollapsed && (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-8 mt-1 space-y-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

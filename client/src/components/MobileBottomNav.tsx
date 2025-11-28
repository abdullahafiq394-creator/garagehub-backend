import { Home, ShoppingCart, MessageSquare, User, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const workshopNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/workshop/dashboard" },
  { icon: ShoppingCart, label: "Orders", path: "/workshop/orders" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/workshop/profile" },
];

const supplierNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/supplier/dashboard" },
  { icon: ShoppingCart, label: "Orders", path: "/supplier/orders" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/supplier/profile" },
];

const customerNavItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/customer/dashboard" },
  { icon: ShoppingCart, label: "Jobs", path: "/customer/jobs" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/customer/profile" },
];

const staffNavItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/staff/dashboard" },
  { icon: Clock, label: "Kehadiran", path: "/staff/attendance" },
  { icon: User, label: "Profil", path: "/staff/profile" },
];

interface MobileBottomNavProps {
  userRole?: string;
}

export default function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const [location, navigate] = useLocation();

  // Only show for workshop, supplier, customer, and staff roles
  if (!userRole || !['workshop', 'supplier', 'customer', 'staff'].includes(userRole)) {
    return null;
  }

  let navItems: NavItem[] = workshopNavItems;
  if (userRole === "supplier") {
    navItems = supplierNavItems;
  } else if (userRole === "customer") {
    navItems = customerNavItems;
  } else if (userRole === "staff") {
    navItems = staffNavItems;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-lg border-t"
      style={{ 
        backgroundColor: 'rgba(20, 20, 30, 0.9)',
        borderColor: 'rgba(0, 183, 255, 0.2)'
      }}
      data-testid="mobile-bottom-nav"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || location.startsWith(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all active:scale-95 nav-icon glow",
                isActive ? "active" : ""
              )}
              style={isActive ? {} : { color: '#a0a0a0' }}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useState } from "react";
import {
  Building2,
  Package,
  Truck,
  User,
  Home,
  ShoppingCart,
  Wrench,
  Bell,
  Settings,
  LogOut,
  Store,
  ClipboardList,
  PackageOpen,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserRole } from "@shared/schema";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ["workshop", "supplier", "runner", "towing", "customer", "admin"],
  },
  // Workshop menu items
  {
    title: "Marketplace",
    url: "/workshop/marketplace",
    icon: Store,
    roles: ["workshop"],
  },
  {
    title: "My Orders",
    url: "/workshop/orders",
    icon: ShoppingCart,
    roles: ["workshop"],
  },
  {
    title: "Inventory",
    url: "/workshop/inventory",
    icon: PackageOpen,
    roles: ["workshop"],
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: Wrench,
    roles: ["workshop"],
  },
  // Supplier menu items
  {
    title: "Products",
    url: "/supplier/products",
    icon: Package,
    roles: ["supplier"],
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ClipboardList,
    roles: ["supplier"],
  },
  // Runner menu items
  {
    title: "Deliveries",
    url: "/deliveries",
    icon: Truck,
    roles: ["runner"],
  },
  // Customer menu items
  {
    title: "Book Service",
    url: "/book-service",
    icon: Wrench,
    roles: ["customer"],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    roles: ["workshop", "supplier", "runner", "customer", "admin"],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const filteredMenuItems = menuItems.filter((item) =>
    user?.role ? item.roles.includes(user.role as UserRole) : false
  );

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      // Force full page reload to /login (clears all state naturally)
      window.location.href = "/login";
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">GarageHub</h2>
            <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || user?.lastName
                ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link href="/settings" data-testid="link-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={isLoggingOut}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

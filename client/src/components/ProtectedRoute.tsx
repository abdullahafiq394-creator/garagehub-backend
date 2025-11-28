import type { ComponentType } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@shared/schema";
import { useEffect } from "react";

interface ProtectedRouteProps {
  component: ComponentType;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access if allowedRoles is specified
  useEffect(() => {
    if (allowedRoles && allowedRoles.length > 0) {
      if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
        // Redirect to appropriate dashboard if user doesn't have permission
        const roleRedirects: Record<string, string> = {
          customer: "/customer/dashboard",
          workshop: "/workshop/dashboard",
          supplier: "/supplier/dashboard",
          runner: "/runner/dashboard",
          towing: "/towing/dashboard",
          admin: "/admin/dashboard",
          staff: "/staff/dashboard",
        };
        
        const redirectPath = user?.role ? roleRedirects[user.role] : "/customer/dashboard";
        setLocation(redirectPath);
      }
    }
  }, [allowedRoles, user, setLocation]);

  // Don't render if user doesn't have permission
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
      return null;
    }
  }

  // Render the component if authenticated (and authorized if roles specified)
  return <Component />;
}

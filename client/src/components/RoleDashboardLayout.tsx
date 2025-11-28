import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FullViewportLayout } from "@/components/FullViewportLayout";
import { WorkshopSidebar } from "@/components/workshop-dashboard/WorkshopSidebar";
import { CustomerSidebar } from "@/components/customer-dashboard/CustomerSidebar";
import { SupplierSidebar } from "@/components/supplier-dashboard/SupplierSidebar";
import { RunnerSidebar } from "@/components/runner-dashboard/RunnerSidebar";
import { AdminSidebar } from "@/components/admin-dashboard/AdminSidebar";
import type { UserRole } from "@shared/schema";

interface RoleDashboardLayoutProps {
  children: ReactNode;
}

function getSidebarForRole(role: UserRole | undefined): ReactNode {
  switch (role) {
    case "workshop":
      return <WorkshopSidebar />;
    case "supplier":
      return <SupplierSidebar />;
    case "runner":
      return <RunnerSidebar />;
    case "customer":
      return <CustomerSidebar />;
    case "towing":
      return <WorkshopSidebar />;
    case "admin":
      return <AdminSidebar />;
    case "staff":
      return <WorkshopSidebar />;
    default:
      return <WorkshopSidebar />;
  }
}

export function RoleDashboardLayout({ children }: RoleDashboardLayoutProps) {
  const { user, isLoading } = useAuth();

  // Gate rendering until user.role is known to prevent sidebar flashing
  if (isLoading) {
    return null;
  }

  const sidebar = getSidebarForRole(user?.role);

  return (
    <FullViewportLayout 
      sidebar={sidebar}
      role={user?.role}
    >
      {children}
    </FullViewportLayout>
  );
}

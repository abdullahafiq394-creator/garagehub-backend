import { Badge } from "@/components/ui/badge";
import type { OrderStatus, JobStatus, TowingStatus, BookingStatus } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

type Status = OrderStatus | JobStatus | TowingStatus | BookingStatus;

interface StatusBadgeProps {
  status: Status;
}

const statusVariants: Partial<Record<
  Status,
  "default" | "secondary" | "destructive" | "outline"
>> = {
  // Order statuses (SupplierOrderStatus)
  created: "secondary",
  accepted: "default",
  preparing: "default",
  assigned_runner: "default",
  delivering: "default",
  delivered: "outline",
  cancelled: "destructive",
  
  // Job statuses
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  
  // Towing statuses
  assigned: "default",
  en_route: "default",
  
  // Booking statuses
  approved: "default",
  rejected: "destructive",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage();
  const variant = statusVariants[status] || "secondary";
  const label = t(`statuses.${status}`);
  
  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      {label}
    </Badge>
  );
}

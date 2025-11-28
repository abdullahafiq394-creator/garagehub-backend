import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  testIdPrefix?: string;
  action?: {
    label: string;
    onClick: () => void;
    testId: string;
  };
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  testIdPrefix = "empty-state",
  action,
}: DashboardEmptyStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4"
      data-testid={`section-${testIdPrefix}`}
    >
      <Icon className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p 
        className="text-lg font-semibold text-muted-foreground mb-2"
        data-testid={`text-${testIdPrefix}-title`}
      >
        {title}
      </p>
      <p 
        className="text-sm text-muted-foreground text-center max-w-sm mb-4"
        data-testid={`text-${testIdPrefix}-description`}
      >
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          data-testid={action.testId}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

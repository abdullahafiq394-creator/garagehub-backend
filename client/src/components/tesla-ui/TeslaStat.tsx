import { motion } from "framer-motion";
import { ReactNode } from "react";
import { TeslaCard } from "./TeslaCard";
import { cn } from "@/lib/utils";

interface TeslaStatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export function TeslaStat({ 
  label, 
  value, 
  icon, 
  trend,
  trendUp 
}: TeslaStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      data-testid="tesla-stat"
    >
      <TeslaCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">
          {value}
        </div>
        {trend && (
          <div className={cn(
            "text-xs mt-2",
            trendUp ? "text-chart-3" : "text-muted-foreground"
          )}>
            {trend}
          </div>
        )}
      </TeslaCard>
    </motion.div>
  );
}

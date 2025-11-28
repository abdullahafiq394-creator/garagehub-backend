import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface TeslaCardProps {
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function TeslaCard({ 
  children, 
  className = "", 
  hover = false,
  glow = false 
}: PropsWithChildren<TeslaCardProps>) {
  return (
    <div 
      className={cn(
        "glass",
        hover && "glass-hover cursor-pointer",
        glow && "neon-glow",
        className
      )}
      data-testid="tesla-card"
    >
      {children}
    </div>
  );
}

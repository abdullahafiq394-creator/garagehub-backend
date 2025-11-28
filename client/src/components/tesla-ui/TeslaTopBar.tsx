import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropsWithChildren } from "react";

interface TeslaTopBarProps {
  title: string;
  subtitle?: string;
}

export function TeslaTopBar({ title, subtitle, children }: PropsWithChildren<TeslaTopBarProps>) {
  return (
    <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,255,255,0.1)] sticky top-0 z-50 -mx-6 -mt-8 mb-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6">
        <div>
          <h1 className="text-white font-semibold text-xl glow-text tracking-wide">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className="text-chart-3 border-chart-3/30 bg-chart-3/10"
            data-testid="badge-online-status"
          >
            ● Online
          </Badge>
          
          {children}
          
          <Button 
            variant="ghost" 
            size="icon"
            className="glass-hover"
            data-testid="button-notifications"
          >
            <Bell size={18} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="glass-hover"
            data-testid="button-user-menu"
          >
            <User size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}

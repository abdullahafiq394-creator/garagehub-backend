import { Link, useRoute } from "wouter";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function SidebarLink({ href, icon: Icon, label, isCollapsed = false, onClick }: SidebarLinkProps) {
  const [isActive] = useRoute(href);

  return (
    <Link href={href} onClick={onClick}>
      <div
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "cursor-pointer hover-elevate active-elevate-2",
          isActive && "bg-sidebar-accent"
        )}
        data-testid={`sidebar-link-${href.split('/').pop()}`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-sidebar-primary" />
        )}
        
        <Icon 
          className={cn(
            "h-5 w-5 transition-colors duration-200",
            isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
          )} 
        />
        
        {!isCollapsed && (
          <span 
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              isActive ? "text-sidebar-primary font-semibold" : "text-muted-foreground group-hover:text-sidebar-foreground"
            )}
          >
            {label}
          </span>
        )}
      </div>
    </Link>
  );
}

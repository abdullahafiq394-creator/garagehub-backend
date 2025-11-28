import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationRead } from "@/hooks/api/useNotifications";
import { useLocation } from "wouter";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const [, setLocation] = useLocation();

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const recentNotifications = notifications?.slice(0, 5) || [];

  const handleMarkAsRead = (notificationId: string) => {
    markReadMutation.mutate(notificationId);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    setLocation("/notifications");
  };

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order":
        return "bg-primary/10 text-primary";
      case "delivery":
        return "bg-green-500/10 text-green-600";
      case "alert":
        return "bg-destructive/10 text-destructive";
      case "job":
        return "bg-primary/10 text-primary";
      case "reminder":
        return "bg-yellow-500/10 text-yellow-600";
      case "stock":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "bg-muted";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notification-bell">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover-elevate ${
                    !notification.isRead ? "bg-accent/10" : ""
                  }`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium leading-tight">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.createdAt ? formatTime(notification.createdAt) : "Just now"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications && notifications.length > 5 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleViewAll}
              data-testid="button-view-all-notifications"
            >
              View All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

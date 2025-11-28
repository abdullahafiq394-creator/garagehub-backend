import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, Check, CheckCheck, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

export function NotificationPanel() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification.mutateAsync(id);
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_update":
        return "📦";
      case "wallet_transaction":
        return "💰";
      case "delivery_update":
        return "🚚";
      case "booking_update":
        return "📅";
      case "chat_message":
        return "💬";
      default:
        return "🔔";
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-semibold"
              data-testid="text-unread-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[450px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCheck size={16} className="mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-88px)]">
          <div className="p-4 space-y-2">
            {isLoading ? (
              // Loading skeletons
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </Card>
                ))}
              </>
            ) : notifications.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BellOff size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No notifications</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You're all caught up! Check back later for updates.
                </p>
              </div>
            ) : (
              // Notifications list
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    !notification.isRead ? "bg-accent/5 border-accent/20" : ""
                  }`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          {notification.title}
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              New
                            </Badge>
                          )}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {notification.createdAt 
                            ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                            : "Just now"
                          }
                        </span>
                        <div className="flex gap-1">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsRead.isPending}
                              className="h-7 px-2"
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <Check size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(notification.id)}
                            disabled={deleteNotification.isPending}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            data-testid={`button-delete-${notification.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

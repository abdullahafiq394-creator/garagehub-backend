import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/api/useNotifications";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const { toast } = useToast();
  const { t } = useLanguage();

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const handleMarkAsRead = (notificationId: string) => {
    markReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!notifications) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    try {
      for (const notification of unreadNotifications) {
        await markReadMutation.mutateAsync(notification.id);
      }
      toast({
        title: t("runner.notifications.toasts.allMarkedRead"),
        description: `${unreadNotifications.length} ${t("runner.notifications.toasts.notificationsMarkedRead")}.`,
      });
    } catch (error) {
      toast({
        title: t("runner.notifications.toasts.error"),
        description: t("runner.notifications.toasts.markAllFailed"),
        variant: "destructive",
      });
    }
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
      default:
        return "bg-muted";
    }
  };

  const formatTime = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${t("runner.notifications.time.minutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("runner.notifications.time.hoursAgo")}`;
    return `${diffDays} ${t("runner.notifications.time.daysAgo")}`;
  };

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("runner.notifications.title")}</h1>
          <p className="text-foreground text-xs mt-0.5">
            {unreadCount > 0 ? `${unreadCount} ${t("runner.notifications.unreadNotifications")}` : t("runner.notifications.allCaughtUp")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            data-testid="button-mark-all-read"
            onClick={handleMarkAllAsRead}
            disabled={markReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            {markReadMutation.isPending ? t("runner.notifications.marking") : t("runner.notifications.markAllRead")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-base">{t("runner.notifications.allNotifications")}</CardTitle>
          <CardDescription className="text-foreground text-xs">{t("runner.notifications.allNotificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 rounded-md border">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-md border ${
                      !notification.isRead ? "bg-accent/20" : ""
                    }`}
                    data-testid={`notification-${notification.id}`}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">{t("runner.notifications.new")}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground">{notification.message}</p>
                        <p className="text-[10px] text-foreground">
                          {notification.createdAt ? formatTime(notification.createdAt) : t("runner.notifications.time.justNow")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 mx-auto text-foreground mb-3" />
                  <p className="text-foreground text-sm">{t("runner.notifications.noNotifications")}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

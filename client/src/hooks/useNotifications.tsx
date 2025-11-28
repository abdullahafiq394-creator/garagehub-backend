import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useSocket } from "@/contexts/SocketContext";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    staleTime: 30000,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    staleTime: 10000,
  });

  const unreadCount = unreadData?.count || 0;

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!user?.id || !socket) return;

    // Listen for new notifications (server will auto-join user to their notification room)
    const handleNotification = (notification: Notification) => {
      console.log("[Notifications] New notification received:", notification);
      
      // Update notifications list
      queryClient.setQueryData(["/api/notifications"], (old: Notification[] = []) => {
        return [notification, ...old];
      });

      // Update unread count
      queryClient.setQueryData(["/api/notifications/unread-count"], (old: { count: number } = { count: 0 }) => {
        return { count: old.count + 1 };
      });
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [user?.id, socket, queryClient]);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", "/api/notifications/mark-all-read", null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("DELETE", `/api/notifications/${notificationId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

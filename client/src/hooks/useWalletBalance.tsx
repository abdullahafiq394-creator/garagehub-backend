import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useSocket } from "@/contexts/SocketContext";

export function useWalletBalance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket, isConnected: socketConnected } = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial wallet balance
  const { data, isLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/wallet/balance"],
    enabled: !!user,
    staleTime: 30000, // Consider stale after 30s
  });

  const balance = data?.balance ?? 0;

  useEffect(() => {
    if (!user?.id || !socket) return;

    setIsConnected(socketConnected);

    // Join wallet room for real-time updates (server will enforce userId from session)
    socket.emit("join_wallet_room");
    console.log(`[Wallet] Joined wallet room`);

    // Listen for wallet balance updates
    const handleBalanceUpdate = (newBalance: number) => {
      console.log(`[Wallet] Balance updated: RM ${newBalance}`);
      queryClient.setQueryData(["/api/wallet/balance"], { balance: newBalance });
    };

    socket.on("wallet_balance_update", handleBalanceUpdate);

    // Cleanup on unmount
    return () => {
      socket.off("wallet_balance_update", handleBalanceUpdate);
      socket.emit("leave_wallet_room");
    };
  }, [user?.id, socket, socketConnected, queryClient]);

  // Polling fallback every 30 seconds if socket disconnected
  useEffect(() => {
    if (!user?.id || isConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wallet/balance", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(["/api/wallet/balance"], data.balance);
          console.log("[Wallet] Polling fallback updated balance");
        }
      } catch (error) {
        console.warn("[Wallet] Polling fallback failed:", error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, isConnected, queryClient]);

  return {
    balance,
    isLoading,
    isConnected,
  };
}

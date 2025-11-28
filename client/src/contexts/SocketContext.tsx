import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import type { User, Workshop, Supplier } from "@shared/schema";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: workshop } = useQuery<Workshop>({
    queryKey: ['/api/workshops/mine'],
    enabled: user?.role === 'workshop',
  });

  const { data: supplier } = useQuery<Supplier>({
    queryKey: ['/api/suppliers/mine'],
    enabled: user?.role === 'supplier',
  });

  useEffect(() => {
    // Connect to the same origin (Vite dev server proxies WebSocket)
    const socketInstance = io({
      transports: ['websocket', 'polling'],
      auth: {
        userId: user?.id,
      },
    });

    socketInstance.on("connect", () => {
      console.log("[socket.io] Connected:", socketInstance.id);
      setIsConnected(true);
      
      // Join workshop-specific room if user is a workshop
      if (user?.role === 'workshop' && workshop) {
        socketInstance.emit("join.workshop", workshop.id);
        console.log("[socket.io] Joined workshop room:", workshop.id);
      }

      // Join supplier-specific room if user is a supplier
      if (user?.role === 'supplier' && supplier) {
        socketInstance.emit("join", `shop:${supplier.id}`);
        console.log("[socket.io] Joined supplier room:", `shop:${supplier.id}`);
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("[socket.io] Disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("[socket.io] Connection error:", error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [user, workshop, supplier]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(globalSocket);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io({
        transports: ['websocket', 'polling'],
      });

      globalSocket.on("connect", () => {
        console.log("[socket.io] Connected:", globalSocket?.id);
        setIsConnected(true);
      });

      globalSocket.on("disconnect", () => {
        console.log("[socket.io] Disconnected");
        setIsConnected(false);
      });

      setSocket(globalSocket);
    }

    return () => {
      // Don't disconnect - keep the socket alive for other components
    };
  }, []);

  return { socket, isConnected };
}

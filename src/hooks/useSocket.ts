import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types";

export type SocketConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface UseSocketOptions {
  roomId?: string;
  explicitToken?: string;
}

export function useSocket(options?: UseSocketOptions | string) {
  const roomId = typeof options === "string" ? undefined : options?.roomId;
  const explicitToken = typeof options === "string" ? options : options?.explicitToken;

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRoomIdRef = useRef<string | undefined>(roomId);
  const currentTokenRef = useRef<string | undefined>(explicitToken);

  activeRoomIdRef.current = roomId;

  useEffect(() => {
    let isMounted = true;
    let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
    const supabase = createClient();

    async function initSocket() {
      setConnectionStatus("connecting");
      setErrorMessage(null);

      // 1. Retrieve valid Supabase session access token
      let token = explicitToken;
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token;
        } catch {
          // If Supabase client fails, check for explicit token or test mock
        }
      }

      // Check development localStorage user if no session token
      if (!token && typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("syncwatch_user");
          if (stored) {
            const parsed = JSON.parse(stored);
            token = parsed.accessToken || parsed.id;
          }
        } catch {}
      }

      currentTokenRef.current = token;

      if (!token) {
        if (isMounted) {
          setConnectionStatus("disconnected");
          setErrorMessage("No active authentication session.");
        }
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

      socketInstance = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current = socketInstance;

      socketInstance.on("connect", () => {
        if (!isMounted) return;
        setConnectionStatus("connected");
        setErrorMessage(null);

        // Rejoin active room on connect/reconnect
        if (activeRoomIdRef.current) {
          socketInstance?.emit("join-room", {
            roomId: activeRoomIdRef.current,
            token: currentTokenRef.current || "",
          });
        }
      });

      socketInstance.on("disconnect", (reason) => {
        if (!isMounted) return;
        if (reason === "io server disconnect") {
          // Disconnected by server (e.g. auth failed)
          setConnectionStatus("disconnected");
          socketInstance?.connect();
        } else {
          setConnectionStatus("reconnecting");
        }
      });

      socketInstance.on("connect_error", (err) => {
        if (!isMounted) return;
        setConnectionStatus("error");
        setErrorMessage(err.message || "Failed to connect to real-time sync server.");
      });

      socketInstance.on("room:error", (err) => {
        if (!isMounted) return;
        setErrorMessage(err.message);
      });
    }

    initSocket();

    // Listen for auth state changes to keep token refreshed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newToken = session?.access_token;
      if (newToken && newToken !== currentTokenRef.current && socketRef.current) {
        currentTokenRef.current = newToken;
        socketRef.current.auth = { token: newToken };
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketRef.current = null;
      }
    };
  }, [explicitToken]);

  const emit = useCallback(
    <K extends keyof ClientToServerEvents>(
      event: K,
      ...args: Parameters<ClientToServerEvents[K]>
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, ...args);
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    errorMessage,
    emit,
  };
}

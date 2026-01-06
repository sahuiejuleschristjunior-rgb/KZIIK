// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../api/config";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const SOCKET_URL =
      (import.meta.env.VITE_SOCKET_URL || API_URL || "")
        .replace(/\/api\/?$/, "")
        .replace(/\/$/, "") || "https://kziik.com";

    const socket = io(SOCKET_URL, {
      auth: { token },
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    setSocket(socket);

    const handleConnect = () => {
      console.log("🌐 SOCKET GLOBAL CONNECTÉ :", socket.id);
    };

    const handleError = (err) => {
      console.warn("⚠️ socket connection issue", err?.message || err);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

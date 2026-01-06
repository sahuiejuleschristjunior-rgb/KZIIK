import { API_URL } from "../api/config";
// src/context/NotificationContext.jsx
import { useCallback, createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import { useActiveConversation } from "./ActiveConversationContext";

const API_ROOT = API_URL;
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const sharedSocket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { activeConversationId } = useActiveConversation() || {};

  const computeUnread = useCallback((items) => items.length, []);

  const setNotificationsAndUnread = useCallback(
    (updater) => {
      setNotifications((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setUnreadCount(computeUnread(next));
        return next;
      });
    },
    [computeUnread]
  );

  const removeNotifications = useCallback(
    (predicate) => {
      setNotificationsAndUnread((prev) =>
        prev.filter((n) => !predicate(n))
      );
    },
    [setNotificationsAndUnread]
  );

  useEffect(() => {
    if (!activeConversationId) return;

    removeNotifications((n) => {
      const actionType = n.actionType || n.type;
      if (actionType !== "message") return false;

      const notifConversationId =
        n.conversationId ||
        (typeof n.conversation === "object"
          ? n.conversation?._id
          : n.conversation) ||
        n.relatedId ||
        n.from?._id ||
        n.from;

      return (
        notifConversationId &&
        String(notifConversationId) === String(activeConversationId)
      );
    });
  }, [activeConversationId, removeNotifications]);

  /* ============================================================
     INIT SOCKET + FETCH NOTIFICATIONS
  ============================================================ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return undefined;
    }

    // 1) Charger compteur non lus
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_ROOT}/notifications/unread/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) setUnreadCount(data.count || 0);
      } catch (e) {
        console.error("UNREAD COUNT ERROR:", e);
      }
    };

    // 2) Charger toutes les notifications
    const fetchList = async () => {
      try {
        const res = await fetch(`${API_ROOT}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          // Trier desc
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotificationsAndUnread(data);
        }
      } catch (e) {
        console.error("NOTIF LIST ERROR:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUnread();
    fetchList();

    if (!sharedSocket) return undefined;

    // 3) Écouter notifications en temps réel
    const handleIncoming = (notif) => {
      if (!notif) return;

      const fromId = notif.from?._id || notif.from;
      const storedUser = localStorage.getItem("user");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;

      const actionType = notif.actionType || notif.type;

      if (actionType === "message" && currentUser?._id && fromId === currentUser._id) {
        return;
      }

      if (actionType === "friend_accept" || actionType === "friend_reject") {
        removeNotifications(
          (n) =>
            (n.actionType || n.type) === "friend_request" &&
            String(n.from?._id || n.from) === String(fromId)
        );
      }

      setNotificationsAndUnread((prev) => {
        const exists = prev.some((n) => n._id === notif._id);
        if (exists) return prev;

        return [notif, ...prev].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      });
    };

    sharedSocket.on("notification:new", handleIncoming);
    console.log("🔔 socket notifications ready");

    return () => {
      sharedSocket.off("notification:new", handleIncoming);
    };
  }, [sharedSocket, removeNotifications, setNotificationsAndUnread]);

  /* ============================================================
     MARQUER TOUT COMME LU
  ============================================================ */
  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_ROOT}/notifications/cleanup`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setNotificationsAndUnread([]);
      }
    } catch (e) {
      console.error("MARK ALL READ ERROR:", e);
    }
  };

  const deleteById = useCallback(
    async (id) => {
      const token = localStorage.getItem("token");
      if (!token || !id) return;

      try {
        const res = await fetch(`${API_ROOT}/notifications/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          removeNotifications((n) => n._id !== id);
        }
      } catch (e) {
        console.error("DELETE NOTIFICATION ERROR:", e);
      }
    },
    [removeNotifications]
  );

  const deleteByRelated = useCallback(
    async (relatedId) => {
      const token = localStorage.getItem("token");
      if (!token || !relatedId) return;

      try {
        const res = await fetch(
          `${API_ROOT}/notifications/by-related/${relatedId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.ok) {
          removeNotifications(
            (n) => String(n.relatedId) !== String(relatedId)
          );
        }
      } catch (e) {
        console.error("DELETE NOTIFICATION BY RELATED ERROR:", e);
      }
    },
    [removeNotifications]
  );

  const deleteByType = useCallback(
    async (type) => {
      const token = localStorage.getItem("token");
      if (!token || !type) return;

      try {
        const res = await fetch(`${API_ROOT}/notifications/by-type/${type}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          removeNotifications((n) => n.type !== type);
        }
      } catch (e) {
        console.error("DELETE NOTIFICATION BY TYPE ERROR:", e);
      }
    },
    [removeNotifications]
  );

  const value = {
    socket: sharedSocket,
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    removeNotifications,
    deleteById,
    deleteByRelated,
    deleteByType,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../api/config";

export default function useFriendRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ") ? token : `Bearer ${token}`;

  /* ======================================================
     🔥 CHARGER DEMANDES D’AMIS (SOURCE UNIQUE)
  ===================================================== */
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/social/requests`, {
        headers: {
          Authorization: authHeader,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      }
    } catch (e) {
      console.error("LOAD FRIEND REQUESTS ERROR", e);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* ======================================================
     🔥 ACTIONS
  ===================================================== */
  const accept = async (userId) => {
    await fetch(`${API_URL}/social/friends/accept/${userId}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    });

    // 🔥 resync propre
    await loadRequests();
  };

  const reject = async (userId) => {
    await fetch(`${API_URL}/social/friends/reject/${userId}`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
    });

    // 🔥 resync propre
    await loadRequests();
  };

  return {
    requests,
    loading,
    accept,
    reject,
    refreshRequests: loadRequests, // 🔥 IMPORTANT
  };
}
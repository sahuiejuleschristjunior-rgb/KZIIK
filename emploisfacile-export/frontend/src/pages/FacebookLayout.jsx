import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Outlet, useLocation, Navigate } from "react-router-dom";
import NotificationItem from "../components/NotificationItem";
import "../styles/facebook-layout.css";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import PagesFeedSidebar from "../components/PagesFeedSidebar";
import {
  fetchRelationStatus,
  sendFriendRequest,
  cancelFriendRequest,
} from "../api/socialApi";
import { getMyPages } from "../api/pagesApi";
import { useNotifications } from "../context/NotificationContext";

export default function FacebookLayout({ headerOnly = false, children }) {
  const location = useLocation();
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const { token: authToken, user: authUser, logout } = useAuth();
  const { notifications: notifList = [] } = useNotifications() || {};

  const isJobsFeed = location.pathname.startsWith("/emplois");
  const isCompleteProfile = location.pathname === "/complete-profile";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const isFullLayout = location.pathname.startsWith("/fb");
  const isHeaderOnly = headerOnly || isJobsFeed || isCompleteProfile;
  const isCompactLayout = isHeaderOnly || !isFullLayout;
  const isPagesFeed = location.pathname.startsWith("/fb/pages-feed");
  const isCandidateSpace = [
    "/dashboard",
    "/jobconnect",
    "/espace-candidat",
    "/candidate",
  ].some((path) => location.pathname.startsWith(path));
  const isRecruiterSpace = [
    "/recruiter/dashboard",
    "/recruiter/candidatures",
    "/recruiter/offres",
    "/recruiter/cv-theque",
    "/recruiter/job",
    "/recruiter/create-job",
    "/recruiter/messages",
  ].some((path) => location.pathname.startsWith(path));
  const hideHeader = isCandidateSpace || isRecruiterSpace;

  if (location.pathname.startsWith("/login")) return <Outlet />;
  if (!authToken)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (!authUser)
    return (
      <div className="fb-loading-screen">
        <div className="loader">Chargement...</div>
      </div>
    );

  const makeHeaders = (json = false) => {
    if (!authToken)
      return json ? { "Content-Type": "application/json" } : {};

    return json
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        }
      : {
          Authorization: `Bearer ${authToken}`,
        };
  };

  const [currentUser, setCurrentUser] = useState(authUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [realtimeJobMessagesCount, setRealtimeJobMessagesCount] = useState(0);
  const [lastUnreadConversationId, setLastUnreadConversationId] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showJobsMenu, setShowJobsMenu] = useState(false);
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const socketRef = useRef(null);
  const notifIdsRef = useRef(new Set());
  const publicMessageIdsRef = useRef(new Set());
  const jobMessageIdsRef = useRef(new Set());
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const stored = localStorage.getItem("ef_recent_searches");
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Erreur parse recent searches:", err);
      return [];
    }
  });

  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: [],
    jobs: [],
    pages: [],
  });

  const [relationStatuses, setRelationStatuses] = useState({});
  const resolveMessageType = useCallback((message) => {
    const rawType = message?.type || message?.messageType;
    if (rawType === "job" || rawType === "public") return rawType;
    if (message?.jobId || message?.job || message?.job?._id) return "job";
    return "public";
  }, []);

  const unreadNotificationMessageCounts = useMemo(() => {
    const counted = new Set();
    return notifList.reduce(
      (acc, notif) => {
        const actionType = notif.actionType || notif.type;
        if (actionType !== "message") return acc;

        const senderId = notif.from?._id || notif.from;
        if (senderId && senderId === currentUser?._id) return acc;

        const payload = notif?.message || notif?.data || notif;
        const messageId =
          payload?._id || notif?.messageId || notif?.relatedId || notif?._id;
        if (messageId) {
          if (counted.has(messageId)) return acc;
          counted.add(messageId);
        }

        const messageType = notif.type || resolveMessageType(payload);
        if (messageType === "job") {
          acc.job += 1;
        } else {
          acc.public += 1;
        }
        return acc;
      },
      { public: 0, job: 0 }
    );
  }, [currentUser?._id, notifList, resolveMessageType]);

  const publicMessagesCount = unreadNotificationMessageCounts.public;
  const totalUnreadMessages = publicMessagesCount;

  const searchBoxRef = useRef(null);
  const profileSwitcherRef = useRef(null);

  const getNotifConversationId = useCallback((notif) => {
    if (!notif) return null;
    return (
      notif?.conversationId ||
      (typeof notif?.conversation === "object"
        ? notif.conversation?._id
        : notif?.conversation) ||
      notif?.from?._id ||
      notif?.from ||
      null
    );
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setShowMobileSearch(false);
    setShowMobileMenu(false);
    setShowJobsMenu(false);
    setIsDropdownOpen(false);
    setProfileSwitcherOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!headerOnly) return;
    setShowMobileMenu(false);
    setShowMobileSearch(false);
    setSearchOpen(false);
    setIsDropdownOpen(false);
    setProfileSwitcherOpen(false);
  }, [headerOnly]);

  useEffect(() => {
    if (!isJobsFeed) return;
    setShowMobileMenu(false);
    setShowMobileSearch(false);
    setSearchOpen(false);
    setIsDropdownOpen(false);
    setProfileSwitcherOpen(false);
  }, [isJobsFeed]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 768px)");
    const handler = (event) => setIsMobile(event.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handler);
    } else {
      media.addListener(handler);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, []);

  useEffect(() => {
    if (!isJobsFeed || !isMobile) {
      setShowJobsMenu(false);
    }
  }, [isJobsFeed, isMobile]);

  const safeNavigate = useCallback(
    (path, options = {}) => {
      setShowMobileMenu(false);
      setShowMobileSearch(false);
      setSearchOpen(false);
      setIsDropdownOpen(false);
      setProfileSwitcherOpen(false);
      setShowJobsMenu(false);

      requestAnimationFrame(() => {
        nav(path, options);
      });
    },
    [nav]
  );

  const handleLeftMenuNavigate = useCallback(
    (path) => {
      setShowJobsMenu(false);
      nav(path);
    },
    [nav]
  );

  const isPublicMessagesRoute = location.pathname.startsWith("/messages");
  const isJobMessagesRoute =
    location.pathname.startsWith("/candidate/messages") ||
    location.pathname.startsWith("/recruiter/messages");

  useEffect(() => {
    if (isPublicMessagesRoute) {
      publicMessageIdsRef.current.clear();
      setLastUnreadConversationId(null);
    }
  }, [isPublicMessagesRoute]);

  useEffect(() => {
    if (isJobMessagesRoute) {
      setRealtimeJobMessagesCount(0);
      jobMessageIdsRef.current.clear();
    }
  }, [isJobMessagesRoute]);

  useEffect(() => {
    notifList.forEach((notif) => {
      const actionType = notif.actionType || notif.type;
      if (actionType !== "message") return;
      const payload = notif?.message || notif?.data || notif;
      const messageId =
        payload?._id || notif?.messageId || notif?.relatedId || notif?._id;
      if (!messageId) return;
      const messageType = notif.type || resolveMessageType(payload);
      if (messageType === "job") {
        jobMessageIdsRef.current.add(messageId);
      } else {
        publicMessageIdsRef.current.add(messageId);
      }
    });
  }, [notifList, resolveMessageType]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const loadPages = async () => {
      setLoadingPages(true);
      try {
        const res = await getMyPages();
        if (Array.isArray(res)) setPages(res);
      } finally {
        setLoadingPages(false);
      }
    };

    loadPages();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!profileSwitcherRef.current) return;
      if (!profileSwitcherRef.current.contains(e.target)) {
        setProfileSwitcherOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ============================================================
     🔥 SOCKET
  ============================================================ */
  useEffect(() => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    if (!authToken) return;

    const SOCKET_URL = "https://emploisfacile.org";

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: authToken || "" },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
    });

    const handleConnect = () => console.log("📡 Socket connecté :", s.id);
    const handleDisconnect = () => console.log("📡 Socket déconnecté");

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);

    socketRef.current = s;

    return () => {
      try {
        s.off("connect", handleConnect);
        s.off("disconnect", handleDisconnect);
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [authToken]);

  /* ============================================================
     🔥 REALTIME NOTIFS — (Version corrigée : anti-duplicat & anti-retour)
  ============================================================ */
  const pushRealtimeNotification = useCallback(
    (notif) => {
      if (!notif) return;

      const senderId = notif.from?._id || notif.from;
      const actionType = notif.actionType || notif.type;
      if (actionType === "message" && senderId === currentUser?._id) {
        return;
      }

      // 🔥 1 — Empêche les notifs déjà traitées (handled)
      if (notif.handled) return;

      // 🔥 2 — Empêche les notifs déjà lues
      // 🔥 3 — Anti-doublons socket
      const id = notif._id || notif.id;
      if (id) {
        if (notifIdsRef.current.has(id)) return;
        notifIdsRef.current.add(id);
      }

      // 🔥 4 — On ajoute proprement
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      if (actionType !== "message") {
        showToast("Nouvelle notification");
      }

      if (actionType === "friend_request") {
        setPendingRequestsCount((prev) => prev + 1);
      }
    },
    [currentUser?._id]
  );

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handler = (n) => pushRealtimeNotification(n);

    s.on("notification:new", handler);
    s.on("notification", handler);

    return () => {
      try {
        s.off("notification:new", handler);
        s.off("notification", handler);
      } catch {}
    };
  }, [pushRealtimeNotification]);

  /* ============================================================
     🔥 REALTIME MESSAGES
  ============================================================ */
  const pushRealtimeMessage = useCallback(
    (payload) => {
      if (!payload) return;

      const msg = payload.message || payload.data || payload.msg || payload;
      const id = msg?._id || payload.messageId || payload.id;
      const messageType = resolveMessageType(msg);

      const extractConversationId = () => {
        const receiverId =
          typeof msg?.receiver === "object" ? msg?.receiver?._id : msg?.receiver;
        const toId = typeof msg?.to === "object" ? msg?.to?._id : msg?.to;
        const fromId =
          typeof msg?.from === "object" ? msg?.from?._id : msg?.from;
        const senderId =
          typeof msg?.sender === "object" ? msg?.sender?._id : msg?.sender;

        const conversationId =
          msg?.conversationId ||
          (typeof msg?.conversation === "object"
            ? msg?.conversation?._id
            : msg?.conversation) ||
          receiverId ||
          toId ||
          fromId;

        if (conversationId === senderId && receiverId) {
          return receiverId;
        }

        return typeof conversationId !== "undefined"
          ? conversationId
          : senderId;
      };

      const senderId =
        typeof msg?.sender === "object" ? msg?.sender?._id : msg?.sender;
      const fromId = typeof msg?.from === "object" ? msg?.from?._id : msg?.from;
      const originId = senderId || fromId;
      if (originId && originId === currentUser?._id) return;

      const dedupeSet =
        messageType === "job" ? jobMessageIdsRef : publicMessageIdsRef;
      if (id) {
        if (dedupeSet.current.has(id)) return;
        dedupeSet.current.add(id);
      }

      if (messageType === "public" && location.pathname.startsWith("/messages")) {
        return;
      }
      if (
        messageType === "job" &&
        (location.pathname.startsWith("/candidate/messages") ||
          location.pathname.startsWith("/recruiter/messages"))
      ) {
        return;
      }

      if (messageType === "job") {
        setRealtimeJobMessagesCount((prev) => prev + 1);
        const conversationId = extractConversationId();
        if (conversationId) {
          setLastUnreadConversationId(conversationId);
        }
      }
      showToast("Nouveau message reçu");
    },
    [currentUser?._id, location.pathname, resolveMessageType]
  );

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handler = (p) => pushRealtimeMessage(p);

    s.on("message:new", handler);
    s.on("new_message", handler);

    return () => {
      try {
        s.off("message:new", handler);
        s.off("new_message", handler);
      } catch {}
    };
  }, [pushRealtimeMessage]);

  /* ============================================================
     🔥 REALTIME FRIEND REQUESTS (SOCKET)
  ============================================================ */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handleFriendRequest = () => {
      setPendingRequestsCount((prev) => prev + 1);
      showToast("Nouvelle demande d'ami");
    };

    s.on("friend_request", handleFriendRequest);

    return () => {
      try {
        s.off("friend_request", handleFriendRequest);
      } catch {}
    };
  }, [showToast]);

  /* ============================================================
     🔍 SEARCH
  ============================================================ */
  useEffect(() => {
    try {
      localStorage.setItem("ef_recent_searches", JSON.stringify(recentSearches));
    } catch (err) {
      console.error("Erreur save recent searches:", err);
    }
  }, [recentSearches]);

  const addRecentSearch = useCallback((entry) => {
    if (!entry?.id) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => !(item.id === entry.id && item.type === entry.type)
      );

      return [entry, ...filtered].slice(0, 8);
    });
  }, []);

  const handleRecentNavigation = useCallback(
    (entry) => {
      if (!entry?.link) return;

      nav(entry.link);
      setSearchOpen(false);
      setShowMobileSearch(false);
    },
    [nav]
  );

  const handleSearchNavigation = useCallback(
    (entry, path) => {
      addRecentSearch({ ...entry, link: path });
      nav(path);
      setSearchOpen(false);
      setShowMobileSearch(false);
    },
    [addRecentSearch, nav]
  );

  const performSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults({ users: [], posts: [], jobs: [], pages: [] });
      return;
    }

    setLoadingSearch(true);

    try {
      const res = await fetch(
        `${API_URL}/search/global?q=${encodeURIComponent(searchTerm)}`,
        { headers: makeHeaders() }
      );

      const data = await res.json();

      if (res.ok) {
        setSearchResults({
          users: data.users || [],
          posts: data.posts || [],
          jobs: data.jobs || [],
          pages: data.pages || [],
        });
      }
    } catch (err) {
      console.error("Erreur recherche :", err);
    } finally {
      setLoadingSearch(false);
    }
  }, [searchTerm, API_URL]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults({ users: [], posts: [], jobs: [], pages: [] });
    }

    const t = setTimeout(() => {
      if (searchTerm.trim()) performSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, performSearch]);

  useEffect(() => {
    const loadStatuses = async () => {
      if (!searchResults.users || searchResults.users.length === 0) return;

      try {
        const statuses = await Promise.all(
          searchResults.users.map(async (u) => {
            try {
              const res = await fetchRelationStatus(u._id);
              return { id: u._id, status: res.status };
            } catch (e) {
              console.error("STATUS ERROR", e);
              return { id: u._id, status: null };
            }
          })
        );

        setRelationStatuses((prev) => {
          const next = { ...prev };
          statuses.forEach(({ id, status }) => {
            if (status) next[id] = status;
          });
          return next;
        });
      } catch (e) {
        console.error("LOAD STATUS ERROR", e);
      }
    };

    loadStatuses();
  }, [searchResults.users]);

  const getRelationFor = useCallback(
    (userId) => relationStatuses[userId] || {},
    [relationStatuses]
  );

  const handleSendFriendRequest = useCallback(
    async (userId) => {
      try {
        await sendFriendRequest(userId);
        setRelationStatuses((prev) => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            requestSent: true,
            requestReceived: false,
            isFriend: false,
          },
        }));
      } catch (e) {
        console.error("SEND REQUEST ERROR", e);
      }
    },
    []
  );

  const handleCancelFriendRequest = useCallback(
    async (userId) => {
      try {
        await cancelFriendRequest(userId);
        setRelationStatuses((prev) => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            requestSent: false,
          },
        }));
      } catch (e) {
        console.error("CANCEL REQUEST ERROR", e);
      }
    },
    []
  );

  const renderFriendButton = (user) => {
    const status = getRelationFor(user._id);

    if (status.isBlocked) {
      return (
        <button className="fb-search-secondary" disabled>
          Bloqué
        </button>
      );
    }

    if (status.isFriend) {
      return (
        <button className="fb-search-secondary" disabled>
          Amis
        </button>
      );
    }

    if (status.requestReceived) {
      return (
        <button
          className="fb-search-primary"
          onClick={(e) => {
            e.stopPropagation();
            nav("/fb/relations");
          }}
        >
          Répondre
        </button>
      );
    }

    if (status.requestSent) {
      return (
        <button
          className="fb-search-secondary"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelFriendRequest(user._id);
          }}
        >
          Demande envoyée
        </button>
      );
    }

    return (
      <button
        className="fb-search-primary"
        onClick={(e) => {
          e.stopPropagation();
          handleSendFriendRequest(user._id);
        }}
      >
        Ajouter ami
      </button>
    );
  };

  /* ============================================================
     🔥 LOAD NOTIFICATIONS
  ============================================================ */
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: makeHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        setNotifications(data);
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("Erreur notif :", err);
    }
  }, [API_URL]);

  /* ============================================================
     🔥 UNREAD COUNT AUTO REFRESH
  ============================================================ */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread/count`, {
        headers: makeHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();

      if (typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Erreur count :", err);
    }
  }, [API_URL]);

  /* ============================================================
     🔥 FRIEND REQUESTS BADGE
  ============================================================ */
  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/social/requests`, {
        headers: makeHeaders(),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.requests)) {
        setPendingRequestsCount(data.requests.length);
      }
    } catch (err) {
      console.error("Erreur demandes d'amis :", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 60000);
    return () => clearInterval(interval);
  }, [fetchPendingRequests]);

  useEffect(() => {
    if (location.pathname.startsWith("/fb/relations")) {
      setPendingRequestsCount(0);
      window.dispatchEvent(new CustomEvent("friendRequestsViewed"));
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    setCurrentUser(authUser);
  }, [authUser]);

  useEffect(() => {
    const handleViewed = () => setPendingRequestsCount(0);
    const handleCountUpdate = (e) => {
      const nextCount = Number(e.detail?.count);
      if (!Number.isNaN(nextCount)) {
        setPendingRequestsCount(Math.max(0, nextCount));
      }
    };

    window.addEventListener("friendRequestsViewed", handleViewed);
    window.addEventListener("friendRequestsCount", handleCountUpdate);

    return () => {
      window.removeEventListener("friendRequestsViewed", handleViewed);
      window.removeEventListener("friendRequestsCount", handleCountUpdate);
    };
  }, []);

  /* ============================================================
     🔥 LOGOUT
  ============================================================ */
  const handleLogout = () => {
    try {
      logout();
    } catch (err) {
      console.error("Logout error:", err);
    }

    setShowJobsDrawer(false);
    nav("/login", { replace: true });

    setTimeout(() => {
      if (!localStorage.getItem("token")) {
        window.location.href = "/login";
      }
    }, 150);
  };

  const handleMessagesIconClick = () => {
    nav("/messages", { state: { source: "messages_icon" } });
  };

  const avatarStyle = getAvatarStyle(currentUser?.avatar);

  const renderSearchContent = () => {
    if (loadingSearch)
      return <div className="fb-search-loader">Recherche...</div>;

    const hasResults =
      searchResults.users.length > 0 ||
      searchResults.posts.length > 0 ||
      searchResults.jobs.length > 0 ||
      searchResults.pages.length > 0;

    const showEmptyMessage = !searchTerm.trim();

    return (
      <div className="fb-search-page">
        <div className="fb-search-left">
          <div className="fb-search-chips">
            {["Tous", "Employeurs / Recruteurs", "Services", "Bloguer"].map(
              (label) => (
                <span key={label} className="fb-search-chip">
                  {label}
                </span>
              )
            )}
          </div>

          <div className="fb-search-section-card">
            <div className="fb-search-section-header">
              <div className="fb-search-title">Récentes</div>
              <button className="fb-search-link">Voir tout</button>
            </div>

            {recentSearches.length === 0 ? (
              <div className="fb-search-empty-inline">
                Aucune recherche récente.
              </div>
            ) : (
              recentSearches.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="fb-search-item"
                  onClick={() => handleRecentNavigation(item)}
                >
                  <div className="fb-search-avatar">
                    {item.avatar ? (
                      <img src={item.avatar} alt={item.title} loading="lazy" />
                    ) : (
                      <FBIcon name="search" size={18} />
                    )}
                  </div>
                  <div className="fb-search-item-text">
                    <span className="fb-search-item-title">{item.title}</span>
                    <span className="fb-search-item-sub">{item.subtitle}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="fb-search-section-card">
            <div className="fb-search-section-header">
              <div className="fb-search-title">Résultats</div>
            </div>

            {showEmptyMessage && (
              <div className="fb-search-empty-inline">
                Commencez à taper pour rechercher.
              </div>
            )}

            {!showEmptyMessage && !hasResults && (
              <div className="fb-search-empty-inline">Aucun résultat</div>
            )}

            {!showEmptyMessage && hasResults && (
              <div className="fb-search-list">
                {searchResults.users.map((u) => (
                  <div
                    key={u._id}
                    className="fb-search-item"
                    onClick={() =>
                      handleSearchNavigation(
                        {
                          id: u._id,
                          type: "user",
                          title: u.name,
                          subtitle: "Profil",
                          avatar: u.avatar,
                        },
                        `/profil/${u._id}`
                      )
                    }
                  >
                  <div className="fb-search-avatar">
                    <img
                      src={u.avatar || "https://i.pravatar.cc/150"}
                      alt={u.name}
                      loading="lazy"
                    />
                  </div>
                    <div className="fb-search-item-text">
                      <span className="fb-search-item-title">{u.name}</span>
                      <span className="fb-search-item-sub">Profil</span>
                    </div>
                    <div className="fb-search-item-actions">
                      {renderFriendButton(u)}
                    </div>
                  </div>
                ))}

                {searchResults.pages.map((p) => (
                  <div
                    key={p._id}
                    className="fb-search-item"
                    onClick={() =>
                      handleSearchNavigation(
                        {
                          id: p._id,
                          type: "page",
                          title: p.name,
                          subtitle:
                            (p.categories && p.categories.length
                              ? p.categories
                              : [p.category]
                            )
                              ?.filter(Boolean)
                              .join(" • ") || "Page",
                          avatar: getImageUrl(p.avatar),
                        },
                        `/pages/${p.slug || p._id}`
                      )
                    }
                  >
                    <div className="fb-search-avatar">
                      <img
                        src={
                          getImageUrl(p.avatar) ||
                          "https://i.pravatar.cc/150?u=page"
                        }
                        alt={p.name || "Page"}
                        loading="lazy"
                      />
                    </div>
                    <div className="fb-search-item-text">
                      <span className="fb-search-item-title">
                        {p.name || "Page"}
                      </span>
                      <span className="fb-search-item-sub">
                        {(p.categories && p.categories.length
                          ? p.categories
                          : [p.category]
                        )
                          ?.filter(Boolean)
                          .join(" • ") || "Page"}
                      </span>
                    </div>
                  </div>
                ))}

                {searchResults.jobs.map((j) => (
                  <div
                    key={j._id}
                    className="fb-search-item"
                    onClick={() =>
                      handleSearchNavigation(
                        {
                          id: j._id,
                          type: "job",
                          title: j.title,
                          subtitle: j.company || "Emploi",
                          avatar: j.companyLogo,
                        },
                        `/emplois/${j._id}`
                      )
                    }
                  >
                    <div className="fb-search-avatar">
                      <img
                        src={j.companyLogo || "https://i.pravatar.cc/150"}
                        alt={j.title}
                        loading="lazy"
                      />
                    </div>
                    <div className="fb-search-item-text">
                      <span className="fb-search-item-title">{j.title}</span>
                      <span className="fb-search-item-sub">
                        {j.company || "Emploi"}
                      </span>
                    </div>
                  </div>
                ))}

                {searchResults.posts.map((p) => (
                  <div
                    key={p._id}
                    className="fb-search-item"
                    onClick={() =>
                      handleSearchNavigation(
                        {
                          id: p._id,
                          type: "post",
                          title: p.author?.name || "Publication",
                          subtitle:
                            p.content?.slice(0, 70) || "(Sans contenu)",
                          avatar: p.author?.avatar,
                        },
                        `/fb/post/${p._id}`
                      )
                    }
                  >
                    <div className="fb-search-avatar">
                      <img
                        src={p.author?.avatar || "https://i.pravatar.cc/150"}
                        alt={p.author?.name || "Publication"}
                        loading="lazy"
                      />
                    </div>
                    <div className="fb-search-item-text">
                      <span className="fb-search-item-title">
                        {p.author?.name || "Publication"}
                      </span>
                      <span className="fb-search-item-sub">
                        {p.content?.slice(0, 70) || "(Sans contenu)"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fb-search-right">
          <div className="fb-search-title">Personnes que vous pourriez connaître</div>
          <div className="fb-search-grid">
            {(searchResults.users.length > 0 ? searchResults.users : [])
              .slice(0, 4)
              .map((u) => (
                <div key={`suggest-${u._id}`} className="fb-search-card">
                  <div className="fb-search-card-header">
                    <img
                      src={u.avatar || "https://i.pravatar.cc/150"}
                      alt={u.name}
                      loading="lazy"
                    />
                    <div>
                      <div className="fb-search-card-title">{u.name}</div>
                      <div className="fb-search-card-sub">2 ami(e)s en commun</div>
                    </div>
                  </div>
                  <div className="fb-search-card-actions">
                    {renderFriendButton(u)}
                    <button
                      className="fb-search-secondary"
                      onClick={() =>
                        handleSearchNavigation(
                          {
                            id: u._id,
                            type: "user",
                            title: u.name,
                            subtitle: "Profil",
                            avatar: u.avatar,
                          },
                          `/profil/${u._id}`
                        )
                      }
                    >
                      Voir
                    </button>
                  </div>
                </div>
              ))}

            {searchResults.users.length === 0 && (
              <div className="fb-search-empty-inline">
                Tapez pour découvrir de nouvelles personnes.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const leftMenuContent = (
    <div className="fb-left-section">
      <ul className="fb-left-menu">
        <li
          className="fb-left-item"
          onClick={() => handleLeftMenuNavigate(`/profil/${currentUser?._id}`)}
        >
          <div className="fb-left-item-icon fb-left-item-avatar" style={avatarStyle}>
            {!currentUser?.avatar && <span>🙂</span>}
          </div>
          <span>{currentUser?.name || "Mon Profil"}</span>
        </li>

        <li className="fb-left-item" onClick={() => handleLeftMenuNavigate("/fb")}>
          <span className="fb-left-item-icon">
            <FBIcon name="home" size={28} />
          </span>
          <span>Accueil</span>
        </li>

        <li
          className="fb-left-item"
          onClick={() => handleLeftMenuNavigate("/fb/pages-feed")}
        >
          <span className="fb-left-item-icon">
            <FBIcon name="pages-feed" size={28} />
          </span>
          <span>Feed des pages</span>
        </li>

        <li className="fb-left-item" onClick={() => handleLeftMenuNavigate("/fb/ads")}>
          <span className="fb-left-item-icon">
            <FBIcon name="ads" size={32} />
          </span>
          <span>Publicités</span>
        </li>

        <li
          className="fb-left-item"
          onClick={() => handleLeftMenuNavigate("/fb/dashboard")}
        >
          <span className="fb-left-item-icon">
            <FBIcon name="dashboard" size={28} />
          </span>
          <span>Tableau de bord</span>
        </li>

        <li className="fb-left-item" onClick={() => handleLeftMenuNavigate("/emplois")}>
          <span className="fb-left-item-icon">
            <FBIcon name="jobs" size={28} />
          </span>
          <span>Emplois</span>
        </li>

        <li className="fb-left-item" onClick={() => handleLeftMenuNavigate("/pages/me")}>
          <span className="fb-left-item-icon">
            <FBIcon name="pages" size={28} />
          </span>
          <span>Pages</span>
        </li>

        <li
          className="fb-left-item"
          onClick={() =>
            handleLeftMenuNavigate("/reels?videoId=6952d0241d5f1313686981a6")
          }
        >
          <span className="fb-left-item-icon">
            <FBIcon name="reels" size={28} />
          </span>
          <span>Reels</span>
        </li>

        <li
          className="fb-left-item"
          onClick={() => handleLeftMenuNavigate("/notifications")}
        >
          <span className="fb-left-item-icon">
            <FBIcon name="notif" size={28} />
          </span>
          <span>Notifications</span>
        </li>

        <li
          className="fb-left-item"
          onClick={() => handleLeftMenuNavigate("/fb/relations")}
        >
          <span className="fb-left-item-icon">
            <FBIcon name="relation" size={28} />
          </span>
          <span>Relations</span>
        </li>

        <li
          className="fb-left-item fb-left-item-settings"
          onClick={() => setShowSettings((prev) => !prev)}
        >
          <span className="fb-left-item-icon">
            <FBIcon name="settings" size={28} />
          </span>
          <span>Paramètres</span>
        </li>
      </ul>

      {showSettings && (
        <ul className="fb-left-submenu">
          <li
            className="fb-left-subitem"
            onClick={() => {
              handleLeftMenuNavigate("/fb/settings");
              setShowSettings(false);
            }}
          >
            <span className="fb-left-item-icon">
              <FBIcon name="settings" size={26} />
            </span>
            <span>Général</span>
          </li>

          <li
            className="fb-left-subitem fb-left-subitem-logout"
            onClick={handleLogout}
          >
            <span className="fb-left-item-icon">
              <FBIcon name="logout" size={26} />
            </span>
            <span>Déconnexion</span>
          </li>
        </ul>
      )}
    </div>
  );

  /* ============================================================
     🚀 RENDER UI
  ============================================================ */
  const header = hideHeader ? null : isCompleteProfile ? (
    <header className="fb-header fb-header--minimal">
      <div className="fb-header-inner fb-header-inner--minimal">
        <div className="fb-header-brand" onClick={() => nav("/fb")}>
          <div className="fb-logo"><span>EF</span></div>
          <span className="fb-logo-label">EmploisFacile</span>
        </div>
        <div className="fb-header-minimal-text">Complétez votre profil</div>
      </div>
    </header>
  ) : (
    <header
      className="fb-header"
    >
      <div className="fb-header-inner">
          
          {/* LOGO */}
          <div className="fb-header-left">
            {isJobsFeed && isMobile && (
              <button
                type="button"
                className="fb-header-burger"
                aria-label="Ouvrir le menu"
                onClick={() => setShowJobsMenu((prev) => !prev)}
              >
                <FBIcon name="menu" size={20} />
              </button>
            )}
            <div className="fb-header-brand" onClick={() => nav("/fb")}>
              <div className="fb-logo"><span>EF</span></div>
              <span className="fb-logo-label">EmploisFacile</span>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="fb-header-search-wrapper" ref={searchBoxRef}>
            <div className="fb-header-search">
              <FBIcon name="search" size={18} />
              <input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
            </div>

            {searchOpen && !isJobsFeed && (
              <div key="fb-search-dropdown" className="fb-search-dropdown">
                {renderSearchContent()}
              </div>
            )}
          </div>

          {searchOpen === true && !showMobileSearch && !isJobsFeed && (
            <div
              key="fb-search-overlay"
              className="fb-search-overlay"
              onClick={() => setSearchOpen(false)}
            />
          )}

          {/* RIGHT ACTIONS */}
          <div className="fb-header-right">

            <button className="fb-header-icon-btn" onClick={() => nav("/fb")}>
              <FBIcon name="home" size={22} />
            </button>

            <button
              className="fb-header-icon-btn"
              onClick={() =>
                nav("/fb/relations", {
                  state: { highlightRequest: true, source: "relations-icon" },
                })
              }
            >
              <div style={{ position: "relative" }}>
                <FBIcon name="friends" size={22} />
                {pendingRequestsCount > 0 && (
                  <span className="notif-badge" aria-label="Nouvelles demandes">
                    {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
                  </span>
                )}
              </div>
            </button>

            <button className="fb-header-icon-btn" onClick={handleMessagesIconClick}>
              <div style={{ position: "relative" }}>
                <FBIcon name="messages" size={22} />
                {totalUnreadMessages > 0 && (
                  <span className="notif-badge" aria-label="Nouveaux messages">
                    {totalUnreadMessages > 9 ? "9+" : totalUnreadMessages}
                  </span>
                )}
              </div>
            </button>

            {/* NOTIFS ICON */}
            <div className="notif-wrapper">
              <button
                className="fb-header-icon-btn notif-btn"
                onClick={() => {
                  loadNotifications();
                  setIsDropdownOpen((v) => !v);
                }}
              >
                <FBIcon name="notif" size={22} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {/* NOTIFS DROPDOWN */}
              {isDropdownOpen === true && !isJobsFeed && (
                <div key="notif-dropdown" className="notif-dropdown">
                  <div className="notif-header">
                    <h2>Notifications</h2>
                    <button
                      className="notif-all-btn"
                      onClick={() => {
                        nav("/notifications");
                        setIsDropdownOpen(false);
                      }}
                    >
                      Tout voir
                    </button>
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">Aucune notification.</div>
                    ) : (
                      notifications.map((notif) => (
                        <NotificationItem
                          key={notif._id}
                          notif={notif}
                          onHandled={(id, extra) => {
                            
                            // 🔥 Empêche le retour de la notif via socket
                            if (extra?.handled) {
                              notifIdsRef.current.add(id);
                            }

                            setNotifications((prev) =>
                              prev.filter((n) => n._id !== id)
                            );

                            setUnreadCount((c) => Math.max(0, c - 1));
                          }}
                          onClick={() => setIsDropdownOpen(false)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE SWITCHER */}
            <div className="profile-switcher" ref={profileSwitcherRef}>
              <button
                className="fb-header-icon-btn"
                onClick={() => setProfileSwitcherOpen((v) => !v)}
              >
                <div className="fb-header-avatar" style={avatarStyle} />
              </button>

              {profileSwitcherOpen && !isJobsFeed && (
                <div
                  key="profile-switcher-dropdown"
                  className="profile-switcher-dropdown"
                >
                  <div className="profile-switcher-title">
                    Utiliser EmploisFacile en tant que
                  </div>

                  <button
                    className="profile-switcher-entry"
                    onClick={() => {
                      nav(`/profil/${currentUser?._id}`);
                      setProfileSwitcherOpen(false);
                    }}
                  >
                    <div className="profile-switcher-avatar" style={avatarStyle} />
                    <div className="profile-switcher-meta">
                      <div className="profile-switcher-name">
                        {currentUser?.name || "Mon profil"}
                      </div>
                      <div className="profile-switcher-label">Profil personnel</div>
                    </div>
                  </button>

                  <div className="profile-switcher-title">Pages</div>

                  {loadingPages && (
                    <div className="profile-switcher-empty">Chargement...</div>
                  )}

                  {!loadingPages && pages.length === 0 && (
                    <div className="profile-switcher-empty">
                      Vous n'avez pas encore de page.
                    </div>
                  )}

                  {!loadingPages &&
                    pages.map((page) => (
                      <button
                        key={page._id}
                        className="profile-switcher-entry"
                        onClick={() => {
                          nav(`/pages/${page.slug}`);
                          setProfileSwitcherOpen(false);
                        }}
                      >
                        <div
                          className="profile-switcher-avatar"
                          style={{
                            backgroundImage: `url(${getImageUrl(page.avatar)})`,
                          }}
                        />
                        <div className="profile-switcher-meta">
                          <div className="profile-switcher-name">{page.name}</div>
                          <div className="profile-switcher-label">
                            {page.followersCount || 0} abonnés
                          </div>
                        </div>
                      </button>
                    ))}

                  <button
                    className="profile-switcher-entry profile-switcher-entry--all"
                    onClick={() => {
                      nav("/pages/me");
                      setProfileSwitcherOpen(false);
                    }}
                  >
                    <FBIcon name="profile" size={18} />
                    <div className="profile-switcher-meta">
                      <div className="profile-switcher-name">Voir toutes les pages</div>
                      <div className="profile-switcher-label">
                        Gérer vos pages et en créer une nouvelle
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
      </div>
    </header>
  );

  const bottomNav = (
    <nav className="fb-bottom-nav">
      <div className="fb-bottom-nav-inner">

        <div className="fb-bottom-nav-item" onClick={() => safeNavigate("/fb")}>
          <FBIcon name="home" size={22} />
          <div>Accueil</div>
        </div>

        <div
          className="fb-bottom-nav-item"
          onClick={() => safeNavigate("/emplois")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="3"
              y="6"
              width="18"
              height="14"
              rx="3"
              stroke="#FFFFFF"
              strokeWidth="1.6"
            />
            <path
              d="M9 6V5.2C9 4 10 3 11.2 3h1.6C14 3 15 4 15 5.2V6"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M4.6 10.5h14.8"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle
              cx="8.2"
              cy="13"
              r="1.6"
              stroke="#FFFFFF"
              strokeWidth="1.4"
            />
            <line
              x1="11.2"
              y1="12.8"
              x2="18"
              y2="12.8"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="11.2"
              y1="15.4"
              x2="16.8"
              y2="15.4"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <div>Emplois</div>
        </div>

        <div
          className="fb-bottom-nav-item"
          onClick={() => {
            if (isJobsFeed) return;
            setShowMobileSearch(true);
            setSearchOpen(true);
          }}
        >
          <FBIcon name="search" size={22} />
          <div>Recherche</div>
        </div>

        <div
          className="fb-bottom-nav-item"
          onClick={() => safeNavigate("/messages")}
        >
          <div style={{ position: "relative" }}>
            <FBIcon name="messages" size={22} />
            {totalUnreadMessages > 0 && (
              <span className="notif-badge" aria-label="Nouveaux messages">
                {totalUnreadMessages > 9 ? "9+" : totalUnreadMessages}
              </span>
            )}
          </div>
          <div>Messages</div>
        </div>

        <div
          className="fb-bottom-nav-item"
          onClick={() => {
            if (isJobsFeed) return;
            setShowMobileMenu(true);
          }}
        >
          <FBIcon name="profile" size={22} />
          <div>Menu</div>
        </div>
      </div>
    </nav>
  );

  if (isJobsFeed && isMobile) {
    return (
      <div className="jobs-mobile-shell">
        {header}

        <main className="jobs-mobile-content">
          {children || (
            <Outlet
              context={{
                jobsMenuOpen: showJobsMenu,
                setJobsMenuOpen: setShowJobsMenu,
              }}
            />
          )}
        </main>

        {bottomNav}

        {toast && <div className="fb-toast">{toast}</div>}
      </div>
    );
  }

  if (isCompactLayout) {
    return (
      <div className="fb-compact-shell">
        {header}

        <main className="fb-compact-body">
          {children || <Outlet />}
        </main>

        {toast && <div className="fb-toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="fb-app fb-app--with-bottom-nav">
      {header}

      {/* APP BODY */}
      <main className="fb-app-body">
        <div className="fb-layout">
          <aside className="fb-left-column">
            {leftMenuContent}
          </aside>

          <section
            className={`fb-center-column ${
              isPagesFeed ? "fb-center-column--pages" : ""
            }`}
          >
            {children || <Outlet />}
          </section>

          <aside
            className={`fb-right-column ${
              isPagesFeed ? "fb-right-column--visible" : ""
            }`}
          >
            {isPagesFeed && <PagesFeedSidebar />}
          </aside>
        </div>
      </main>

      {/* BOTTOM NAV */}
      {bottomNav}

      {/* FULLSCREEN MENU */}
      {showMobileMenu === true && !isJobsFeed && (
        <div key="fb-mobile-menu" className="fullscreen-menu">
          <div className="fs-menu-header">
            <h2>Menu</h2>
            <button onClick={() => setShowMobileMenu(false)}>✖</button>
          </div>

          <div className="fs-menu-profile">
            <div className="fs-avatar" style={avatarStyle}></div>
            <div className="fs-name">{currentUser?.name}</div>
          </div>

          <div className="fs-menu-grid">
            <div
              className="fs-item"
              onClick={() => {
                nav("/emplois");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="jobs" size={22} />
              <span>Emplois</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/pages/me");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="profile" size={22} />
              <span>Pages</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/fb");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="home" size={22} />
              <span>Acceuil</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/fb/relations");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="friends" size={22} />
              <span>Relation</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/fb/dashboard");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="dashboard" size={22} />
              <span>Tableau de bord</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/settings");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="settings" size={22} />
              <span>Paramètres</span>
            </div>

            <div className="fs-item logout" onClick={handleLogout}>
              <FBIcon name="logout" size={22} />
              <span>Déconnexion</span>
            </div>
          </div>
        </div>
      )}

      {showMobileSearch === true && !isJobsFeed && (
        <div
          key="fb-mobile-search"
          className="fb-mobile-search-modal"
          onClick={() => {
            setShowMobileSearch(false);
            setSearchOpen(false);
          }}
        >
          <div
            className="fb-mobile-search-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-mobile-search-header">
              <FBIcon name="search" size={20} />
              <input
                value={searchTerm}
                placeholder="Rechercher..."
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
              />
              <button
                className="fb-mobile-search-close"
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchOpen(false);
                }}
              >
                ✖
              </button>
            </div>

            <div className="fb-mobile-search-results">{renderSearchContent()}</div>
          </div>
        </div>
      )}

      {toast && <div className="fb-toast">{toast}</div>}
    </div>
  );
}

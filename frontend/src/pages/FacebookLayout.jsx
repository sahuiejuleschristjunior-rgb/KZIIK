import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Outlet, useLocation, Navigate } from "react-router-dom";
import NotificationItem from "../components/NotificationItem";
import "../styles/facebook-layout.css";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import PagesFeedSidebar from "../components/PagesFeedSidebar";
import {
  fetchRelationStatus,
  sendFriendRequest,
  cancelFriendRequest,
} from "../api/socialApi";
import { getMyPages } from "../api/pagesApi";
import { useNotifications } from "../context/NotificationContext";
import { API_URL } from "../api/config";

export default function FacebookLayout({ headerOnly = false, children }) {
  const location = useLocation();
  const nav = useNavigate();
  const { token: authToken, user: authUser, logout } = useAuth();
  const { notifications: notifList = [] } = useNotifications() || {};

  const isCompleteProfile = location.pathname === "/complete-profile";
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const isFullLayout = location.pathname.startsWith("/fb");
  const isHeaderOnly = headerOnly || isCompleteProfile;
  const isCompactLayout = isHeaderOnly || !isFullLayout;
  const isPagesFeed = location.pathname.startsWith("/fb/pages-feed");
  const hideHeader = false;

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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [profileSwitcherOpen, setProfileSwitcherOpen] = useState(false);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const socket = useSocket();
  const notifIdsRef = useRef(new Set());
  const publicMessageIdsRef = useRef(new Set());
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const stored = localStorage.getItem("kziik_recent_searches");
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
    pages: [],
  });

  const [relationStatuses, setRelationStatuses] = useState({});
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

        acc.public += 1;
        return acc;
      },
      { public: 0 }
    );
  }, [currentUser?._id, notifList]);

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

  const safeNavigate = useCallback(
    (path, options = {}) => {
      setShowMobileMenu(false);
      setShowMobileSearch(false);
      setSearchOpen(false);
      setIsDropdownOpen(false);
      setProfileSwitcherOpen(false);

      requestAnimationFrame(() => {
        nav(path, options);
      });
    },
    [nav]
  );

  const handleLeftMenuNavigate = useCallback(
    (path) => {
      nav(path);
    },
    [nav]
  );

  const isPublicMessagesRoute = location.pathname.startsWith("/messages");

  useEffect(() => {
    if (isPublicMessagesRoute) {
      publicMessageIdsRef.current.clear();
    }
  }, [isPublicMessagesRoute]);

  useEffect(() => {
    notifList.forEach((notif) => {
      const actionType = notif.actionType || notif.type;
      if (actionType !== "message") return;
      const payload = notif?.message || notif?.data || notif;
      const messageId =
        payload?._id || notif?.messageId || notif?.relatedId || notif?._id;
      if (!messageId) return;
      publicMessageIdsRef.current.add(messageId);
    });
  }, [notifList]);

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
    if (!authToken || !socket) return undefined;

    const handleConnect = () => console.log("📡 Socket connecté :", socket.id);
    const handleDisconnect = () => console.log("📡 Socket déconnecté");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      try {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
      } catch {}
    };
  }, [authToken, socket]);

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
    const s = socket;
    if (!s) return undefined;

    const handler = (n) => pushRealtimeNotification(n);

    s.on("notification:new", handler);
    s.on("notification", handler);

    return () => {
      try {
        s.off("notification:new", handler);
        s.off("notification", handler);
      } catch {}
    };
  }, [pushRealtimeNotification, socket]);

  /* ============================================================
     🔥 REALTIME MESSAGES
  ============================================================ */
  const pushRealtimeMessage = useCallback(
    (payload) => {
      if (!payload) return;

      const msg = payload.message || payload.data || payload.msg || payload;
      const id = msg?._id || payload.messageId || payload.id;
      const senderId =
        typeof msg?.sender === "object" ? msg?.sender?._id : msg?.sender;
      const fromId = typeof msg?.from === "object" ? msg?.from?._id : msg?.from;
      const originId = senderId || fromId;
      if (originId && originId === currentUser?._id) return;

      const dedupeSet = publicMessageIdsRef;
      if (id) {
        if (dedupeSet.current.has(id)) return;
        dedupeSet.current.add(id);
      }

      if (location.pathname.startsWith("/messages")) {
        return;
      }
      showToast("Nouveau message reçu");
    },
    [currentUser?._id, location.pathname]
  );

  useEffect(() => {
    const s = socket;
    if (!s) return undefined;

    const handler = (p) => pushRealtimeMessage(p);

    s.on("message:new", handler);
    s.on("new_message", handler);

    return () => {
      try {
        s.off("message:new", handler);
        s.off("new_message", handler);
      } catch {}
    };
  }, [pushRealtimeMessage, socket]);

  /* ============================================================
     🔥 REALTIME FRIEND REQUESTS (SOCKET)
  ============================================================ */
  useEffect(() => {
    const s = socket;
    if (!s) return undefined;

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
  }, [showToast, socket]);

  /* ============================================================
     🔍 SEARCH
  ============================================================ */
  useEffect(() => {
    try {
      localStorage.setItem("kziik_recent_searches", JSON.stringify(recentSearches));
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
      setSearchResults({ users: [], posts: [], pages: [] });
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
      setSearchResults({ users: [], posts: [], pages: [] });
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
      searchResults.pages.length > 0;

    const showEmptyMessage = !searchTerm.trim();

    return (
      <div className="fb-search-page">
        <div className="fb-search-left">
          <div className="fb-search-chips">
            {["Tous", "Personnes", "Pages", "Publications"].map(
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

        <li className="fb-left-item" onClick={() => handleLeftMenuNavigate("/fb")}>
          <span className="fb-left-item-icon">
            <FBIcon name="dashboard" size={28} />
          </span>
          <span>Tableau de bord</span>
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
          <div className="fb-logo"><span>KZ</span></div>
          <span className="fb-logo-label">KZIIK</span>
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
            <div className="fb-header-brand" onClick={() => nav("/fb")}>
              <div className="fb-logo"><span>KZ</span></div>
              <span className="fb-logo-label">KZIIK</span>
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

            {searchOpen && (
              <div key="fb-search-dropdown" className="fb-search-dropdown">
                {renderSearchContent()}
              </div>
            )}
          </div>

          {searchOpen === true && !showMobileSearch && (
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
              {isDropdownOpen === true && (
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

              {profileSwitcherOpen && (
                <div
                  key="profile-switcher-dropdown"
                  className="profile-switcher-dropdown"
                >
                  <div className="profile-switcher-title">
                    Utiliser KZIIK en tant que
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
          onClick={() => safeNavigate("/fb/relations")}
        >
          <FBIcon name="relation" size={22} />
          <div>Relations</div>
        </div>

        <div
          className="fb-bottom-nav-item"
          onClick={() => {
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
            setShowMobileMenu(true);
          }}
        >
          <FBIcon name="profile" size={22} />
          <div>Menu</div>
        </div>
      </div>
    </nav>
  );

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
      {showMobileMenu === true && (
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
              <span>Accueil</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/fb/relations");
                setShowMobileMenu(false);
              }}
            >
              <FBIcon name="friends" size={22} />
              <span>Relations</span>
            </div>

            <div
              className="fs-item"
              onClick={() => {
                nav("/fb");
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

      {showMobileSearch === true && (
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

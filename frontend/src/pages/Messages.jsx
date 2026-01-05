import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import "../styles/messages.css";
import VideoCallOverlay from "../components/VideoCallOverlay";
import { API_URL } from "../api/config";
import Avatar from "../components/Avatar";
import {
  acceptMessageRequest,
  blockMessageRequest,
  declineMessageRequest,
  fetchInbox,
  fetchMessageRequests,
  sendAttachmentMessage,
  sendMessagePayload,
} from "../api/messagesApi";
import { fetchFriends } from "../api/socialApi";
import { useActiveConversation } from "../context/ActiveConversationContext";
import { useNotifications } from "../context/NotificationContext";
import { getAvatarUrl } from "../utils/avatarUtils";

const getApiMeta = () => {
  if (!API_URL) {
    return { origin: window.location.origin, path: "" };
  }

  try {
    const parsed = new URL(API_URL, window.location.origin);
    return {
      origin: `${parsed.protocol}//${parsed.host}`,
      path: parsed.pathname.replace(/\/$/, ""),
    };
  } catch (err) {
    const normalizedPath = API_URL.startsWith("/")
      ? API_URL.replace(/\/$/, "")
      : `/${API_URL.replace(/\/$/, "")}`;
    return { origin: window.location.origin, path: normalizedPath };
  }
};

const { origin: API_ORIGIN, path: API_BASE_PATH } = getApiMeta();
const SOCKET_URL = API_ORIGIN || window.location.origin;
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 4c.6 0 1 .4 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6V5c0-.6.4-1 1-1Z"
    />
  </svg>
);

const MicIcon = ({ pulse = false }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    className={pulse ? "pulse" : ""}
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Zm-1 17.93V20h2v.93a7.04 7.04 0 0 0 5.48-4.28 1 1 0 0 0-1.83-.78A5.03 5.03 0 0 1 7.35 15a1 1 0 0 0-1.83.79A7.04 7.04 0 0 0 11 20.93Z"
    />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M3.16 4.53a1 1 0 0 1 1.05-.16l16 7a1 1 0 0 1 0 1.82l-16 7A1 1 0 0 1 3 19.3v-5.1l8.54-2.21L3 9.77V4.7a1 1 0 0 1 .16-.17Z"
    />
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6.83 7.25a1 1 0 0 1 1.41-.08A4.99 4.99 0 0 0 12 16c1.22 0 2.38-.45 3.28-1.26a1 1 0 1 1 1.34 1.48A7 7 0 0 1 12 18a6.99 6.99 0 0 1-4.62-1.78 1 1 0 0 1-.2-1Z"
    />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M14.7 5.3a1 1 0 0 1 0 1.4L10.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M6.2 4.6A2.2 2.2 0 0 1 8.4 2.5h1.2c.9 0 1.7.6 2 1.5l.7 2.3c.2.7 0 1.4-.5 1.9l-1 1c1.2 2.2 2.9 3.9 5.1 5.1l1-1c.5-.5 1.2-.7 1.9-.5l2.3.7c.9.3 1.5 1.1 1.5 2v1.2c0 1.2-1 2.2-2.2 2.2H18C11.4 19.9 6.1 14.6 6.2 8V6.7c0-.8.3-1.6.9-2.1Z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M4 5.5A2.5 2.5 0 0 1 6.5 3h6A2.5 2.5 0 0 1 15 5.5v1.9l3.3-2.4a1 1 0 0 1 1.6.8v12.4a1 1 0 0 1-1.6.8L15 16.6v1.9A2.5 2.5 0 0 1 12.5 21h-6A2.5 2.5 0 0 1 4 18.5v-13Z"
    />
  </svg>
);

const PhoneDownIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M4.1 14.18c3.8-3.38 12-3.38 15.8 0a1 1 0 0 1 .1 1.4l-2 2.4a1 1 0 0 1-1.12.28l-2.77-1.1a1 1 0 0 1-.61-.92l-.01-.8c-.9-.14-1.9-.14-2.8 0v.8a1 1 0 0 1-.6.92l-2.78 1.1a1 1 0 0 1-1.12-.28l-2-2.4a1 1 0 0 1 .1-1.4Z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor" d="M7 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor" d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path
      fill="currentColor"
      d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.59l5.3-5.3a1 1 0 1 1 1.4 1.42L13.41 12l5.3 5.3a1 1 0 0 1-1.42 1.4L12 13.41l-5.3 5.3a1 1 0 1 1-1.4-1.42L10.59 12 5.3 6.7a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M9.6 3.5a1 1 0 0 0-.54 1.3l1.37 3.5-3.74 4.2a1 1 0 0 0 .75 1.65h4.56L12 20a1 1 0 0 0 2 0l-.05-5.85h4.56a1 1 0 0 0 .75-1.65l-3.75-4.2 1.38-3.5a1 1 0 0 0-1.86-.72l-1.42 3.6h-2.6L11.47 4.1A1 1 0 0 0 9.6 3.5Z"
    />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M18.7 2.3a1 1 0 0 0-1.4 0L8 11.6V15h3.4l9.3-9.3a1 1 0 0 0 0-1.4l-2-2ZM20 21a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h14a1 1 0 0 1 1 1Z"
    />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M9 3a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1V6a3 3 0 0 0-3-3H9Zm6 4v1a1 1 0 0 0 1 1h1v7a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1Z"
    />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M18 8a3 3 0 0 0-2.52 1.34l-5.16-2.4a3 3 0 1 0-.64 1.28l5.07 2.36a3 3 0 0 0 0 3.44l-5.07 2.36A3 3 0 1 0 9 17.07l5.16-2.4A3 3 0 1 0 18 8Z"
    />
  </svg>
);

const ReplyIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M10.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4L14.58 13H7a1 1 0 1 1 0-2h7.59L10.3 6.7a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h1v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm2 3h2v1a1 1 0 1 0 2 0V6h1v12H8V6h1v1a1 1 0 1 0 2 0V6Z"
    />
  </svg>
);


export default function Messages() {
  /* =====================================================
     STATE
  ===================================================== */
  const { deleteByType } = useNotifications() || {};
  const [friends, setFriends] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");
  const [listTab, setListTab] = useState("conversations");
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [lockedConversationId, setLockedConversationId] = useState(null);

  const [activeChat, setActiveChat] = useState(null);
  const activeConversation = activeChat;
  const [isMobileView, setIsMobileView] = useState(false);
  const setActiveConversation = setActiveChat;
  const activeConversationIdValue = activeConversation?._id || null;
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [reactionPicker, setReactionPicker] = useState({
    messageId: null,
    anchor: null,
  });
  const [infoBanner, setInfoBanner] = useState("");

  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [messageActions, setMessageActions] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mediaViewer, setMediaViewer] = useState({ open: false, url: null, type: null });

  const token = localStorage.getItem("token");
  const me = JSON.parse(localStorage.getItem("user"));
  const { setActiveConversationId, setIsUserTyping } = useActiveConversation() || {};

  useEffect(() => {
    deleteByType?.("public");
  }, [deleteByType]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordCanceled, setRecordCanceled] = useState(false);
  const [recordLocked, setRecordLocked] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordOffset, setRecordOffset] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);

  const [audioStatus, setAudioStatus] = useState({});
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [highlightedConversationId, setHighlightedConversationId] = useState(null);
  const [callOverlay, setCallOverlay] = useState({
    visible: false,
    mode: "caller",
    callType: "video",
    offer: null,
    otherUser: null,
  });

  const recordStartRef = useRef(null);
  const recordTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioGainRef = useRef(null);
  const audioFilterRef = useRef(null);
  const recordVizFrame = useRef(null);
  const recordLevelBarRef = useRef(null);
  const recordCanceledRef = useRef(false);
  const activeStreamRef = useRef(null);

  const audioRefs = useRef({});
  const currentAudioRef = useRef(null);
  const currentAudioIdRef = useRef(null);
  const playRequestRef = useRef({});

  const loadedConversationIdRef = useRef(null);
  const lastReadConversationIdRef = useRef(null);
  const userInteractedRef = useRef(false);

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const attachMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const pendingAttachmentsRef = useRef([]);
  const attachSwipeStart = useRef(null);
  const longPressTimer = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const swipeDataRef = useRef({});
  const inputRef = useRef(null);
  const messageRefs = useRef({});
  const [typingState, setTypingState] = useState({});

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state || {};
  const openConversationIdFromSearch = searchParams.get("open");
  const openConversationUserIdFromSearch = searchParams.get("userId");
  const openConversationId =
    locationState.openConversationId ||
    openConversationIdFromSearch ||
    openConversationUserIdFromSearch ||
    null;
  const highlightConversationId = locationState.highlightConversationId || null;
  const navigationSource =
    locationState.source ||
    (openConversationIdFromSearch
      ? "notification"
      : openConversationUserIdFromSearch
      ? "profile"
      : null);

  const { conversationId } = useParams();
  const isDirectConversation = Boolean(conversationId);

  const lockedConversationRef = useRef(null);
  useEffect(() => {
    lockedConversationRef.current = lockedConversationId;
  }, [lockedConversationId]);

  const navigationHandledRef = useRef(null);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  /* =====================================================
     HELPERS
  ===================================================== */
  const meAvatar = getAvatarUrl(me?.avatar);
  const getFriendId = useCallback((friend) => {
    return String(friend?._id || friend?.id || friend?.user?._id || "");
  }, []);

  const isProfessionalContact = (targetRole) => {
    if (!targetRole || !me?.role) return false;
    return (
      (me.role === "candidate" && targetRole === "recruiter") ||
      (me.role === "recruiter" && targetRole === "candidate")
    );
  };

  const mergeFriendEntries = useCallback((friend, conversation) => {
    if (!friend && !conversation) return null;

    const base = friend || {};
    const convo = conversation || {};
    const avatar = getAvatarUrl(base.avatar || convo.avatar);

    return {
      _id: base._id || convo._id,
      name: base.name || convo.name || "Utilisateur",
      avatar: avatar,
      role: base.role || convo.role || null,
      isProfessional:
        typeof base.isProfessional === "boolean"
          ? base.isProfessional
          : convo.isProfessional,
      lastMessage: convo.lastMessage || base.lastMessage || null,
      unreadCount:
        typeof convo.unreadCount === "number"
          ? convo.unreadCount
          : base.unreadCount || 0,
      conversationId: convo.conversationId || base.conversationId || null,
    };
  }, []);

  const mergeFriendsWithConversations = useCallback(
    (friendsList, conversationsList) => {
      const merged = new Map();

      conversationsList.forEach((conversation) => {
        const id = getFriendId(conversation);
        if (!id) return;
        merged.set(id, conversation);
      });

      friendsList.forEach((friend) => {
        const id = getFriendId(friend);
        if (!id) return;
        const existing = merged.get(id);
        const combined = mergeFriendEntries(friend, existing);
        if (combined) {
          merged.set(id, combined);
        } else if (!existing) {
          merged.set(id, friend);
        }
      });

      return Array.from(merged.values());
    },
    [getFriendId, mergeFriendEntries]
  );

  const normalizeFriend = (f) => {
    if (!f) return null;

    if (Array.isArray(f?.participants)) {
      const participants = f.participants || [];
      const other = participants.find(
        (p) => String(p?._id || p) !== String(me?._id)
      );

      const target = other || participants[0] || null;
      const targetId =
        (typeof target === "object" ? target?._id : target) || null;

      const targetRole = typeof target === "object" ? target?.role : null;
      const avatar = getAvatarUrl(
        (typeof target === "object" ? target?.avatar : null) || f?.avatar
      );

      return {
        _id: targetId,
        name:
          (typeof target === "object" ? target?.name : null) ||
          f?.name ||
          "Utilisateur",
        avatar,
        role: targetRole,
        isProfessional: isProfessionalContact(targetRole),
        unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
        lastMessage: f?.lastMessage || null,
        conversationId: f?._id || f?.conversationId || null,
      };
    }

    const userObj =
      f && typeof f.user === "object" && f.user
        ? f.user
        : typeof f === "object" && f?._id && f?.name
        ? f
        : null;

    const userId =
      userObj?._id ||
      (typeof f?.user === "string" ? f.user : null) ||
      f?._id ||
      null;

    const avatar = getAvatarUrl(
      userObj?.avatar ||
        f?.avatar ||
        (typeof f?.user === "string" ? null : undefined)
    );

    return {
      _id: userId,
      name: userObj?.name || f?.name || "Utilisateur",
      avatar,
      role: userObj?.role || f?.role || null,
      isProfessional: isProfessionalContact(userObj?.role || f?.role || null),
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
      lastMessage: f?.lastMessage || null,
      conversationId:
        f?.conversationId || (f?.user ? f?._id || null : f?.conversationId) || null,
    };
  };

  const isMessageFromMe = (msg) => {
    const senderId =
      typeof msg?.sender === "object" ? msg?.sender?._id : msg?.sender;
    return senderId === me?._id;
  };

  const isLocalConversationId = (id) =>
    typeof id === "string" && id.startsWith("local_request_");

  const getConversationTargetId = (chat = activeChat) => {
    if (!chat) return null;
    if (chat.pendingUserId) return chat.pendingUserId;
    return chat._id;
  };

  const scrollToBottom = (force = false) => {
    const container = chatBodyRef.current;
    if (container) {
      const distance =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (force || distance < 120) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId) => {
    if (!messageId || !chatBodyRef.current) return;
    const node = messageRefs.current[messageId];
    if (!node) return;

    const container = chatBodyRef.current;
    const offset = Math.max(0, node.offsetTop - container.clientHeight / 4);
    container.scrollTo({ top: offset, behavior: "smooth" });
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1600);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobileView(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    if (!body) return undefined;

    const previousOverflow = body.style.overflow;
    const previousPosition = body.style.position;
    const previousWidth = body.style.width;

    if (activeChat && isMobileView) {
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.position = previousPosition;
      body.style.width = previousWidth;
    };
  }, [activeChat, isMobileView]);

const resolveUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("http")) return url;

  // Always use the API origin for media assets to avoid hard-coding the
  // production domain. This keeps voice notes and attachments readable in
  // staging/preview environments where uploads are hosted on the API host.
  const base = API_ORIGIN || window.location.origin;
  if (url.startsWith("/uploads/")) return `${base}${url}`;
  return `${base}/${url.replace(/^\/+/, "")}`;
};

  const copyToClipboard = async (text) => {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.error("Erreur copie presse-papiers", err);
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error("Échec de la copie via fallback", err);
      return false;
    }
  };

  const formatTime = (time) => {
    if (!time && time !== 0) return "0:00";
    const total = Math.floor(time);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatMessageTime = (date) => {
    if (!date) return "";
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const normalizeMediaFields = (msg) => {
    if (!msg || typeof msg !== "object") return msg;

    const normalized = { ...msg };

    if (!normalized.fileUrl && msg?.media?.url) {
      normalized.fileUrl = msg.media.url;
    }

    if (!normalized.mimeType && (msg?.media?.mimetype || msg?.media?.mimeType)) {
      normalized.mimeType = msg.media.mimetype || msg.media.mimeType;
    }

    if (!normalized.audioUrl && msg?.audio?.url) {
      normalized.audioUrl = msg.audio.url;
    }

    return normalized;
  };

  const getAudioDurationSeconds = (msg) => {
    if (!msg || msg.type !== "audio") return null;
    const status = audioStatus[msg._id] || {};
    const duration =
      status.duration || msg.audioDuration || msg.duration || msg.length || msg.audioLength;
    if (!duration || Number.isNaN(Number(duration))) return null;
    return Number(duration);
  };

  const getAudioPreviewText = (msg) => {
    if (!msg || msg.type !== "audio") return msg?.content || "Message";
    const duration = getAudioDurationSeconds(msg);
    const base = "Message vocal";
    return duration ? `${base} (${formatTime(duration)})` : base;
  };

  const getLastMessagePreview = (friend) => {
    const msg = friend?.lastMessage;
    if (!msg || typeof msg !== "object") return "Commencez la conversation 👋";

    const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
    const prefix = senderId === me?._id ? "Vous: " : "";

    let content = msg.content || "";
    const attachmentLabel = msg.fileUrl ? getAttachmentLabel(msg.type) : null;
    if (!content && msg.type === "audio") content = "Message vocal";
    if (!content && attachmentLabel) content = attachmentLabel;
    if (!content) content = "Message";

    return `${prefix}${content}`;
  };

  function getAttachmentLabel(type) {
    if (type === "image") return "Image";
    if (type === "video") return "Vidéo";
    return "Fichier";
  }

  const conversationHasUnread = useCallback((conversation) => {
    if (!conversation) return false;

    const count =
      typeof conversation.unreadCount === "number" ? conversation.unreadCount : 0;
    const lastMessageUnread =
      conversation?.lastMessage && conversation.lastMessage.isRead === false;

    return count > 0 || Boolean(lastMessageUnread);
  }, [token]);

  const getReadLastMessage = useCallback((conversation) => {
    if (!conversation?.lastMessage) return conversation?.lastMessage || null;

    return conversation.lastMessage.isRead === false
      ? { ...conversation.lastMessage, isRead: true }
      : conversation.lastMessage;
  }, []);

  const buildReplyData = (target) => {
    if (!target?._id) return { replyId: null, preview: null };

    return {
      replyId: target._id,
      preview: {
        messageId: target._id,
        content: target.content || (target.type === "audio" ? getAudioPreviewText(target) : "Message"),
        type: target.type || "text",
      },
    };
  };

  const isPinnedByMe = (msg) => {
    const pinnedList = msg?.pinnedBy || [];
    return pinnedList.some((id) => {
      if (!id) return false;
      if (typeof id === "object") return id?._id === me?._id;
      return id === me?._id;
    });
  };

  const canEditMessage = (msg) => {
    if (!msg) return false;
    const createdAt = new Date(msg.createdAt || Date.now()).getTime();
    const twelveHours = 12 * 60 * 60 * 1000;
    return (
      isMessageFromMe(msg) &&
      msg.type === "text" &&
      Date.now() - createdAt <= twelveHours
    );
  };

  const isMessageInActiveChat = (msg) => {
    if (!activeChat || !msg) return false;

    const extractId = (value) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object") return value._id || value.id || null;
      return null;
    };

    const senderId = extractId(msg.sender ?? msg.from);
    const receiverId = extractId(msg.receiver ?? msg.to);
    const conversationId = extractId(msg.conversation);
    const targetId = getConversationTargetId();
    const activeConversationId =
      extractId(activeChat.conversation) || activeChat.conversationId || null;

    if (conversationId && activeConversationId && conversationId === activeConversationId) {
      return true;
    }

    if (conversationId && activeChat?._id && conversationId === activeChat._id) {
      return true;
    }

    if (
      senderId &&
      receiverId &&
      ((senderId === targetId && receiverId === me?._id) ||
        (senderId === me?._id && receiverId === targetId))
    ) {
      return true;
    }

    return (
      senderId === targetId ||
      receiverId === targetId ||
      senderId === activeChat._id ||
      receiverId === activeChat._id ||
      (senderId === me?._id && receiverId === me?._id)
    );
  };

  const cleanupAudioRefs = (id) => {
    if (!id) return;
    if (audioRefs.current[id]) {
      delete audioRefs.current[id];
    }
    if (currentAudioIdRef.current === id) {
      if (currentAudioRef.current?.pause) {
        currentAudioRef.current.pause();
      }
      currentAudioRef.current = null;
      currentAudioIdRef.current = null;
    }
  };

  const upsertMessage = (incoming) => {
    if (!incoming) return;
    const normalizedIncoming = normalizeMediaFields(incoming);
    const withTimestamp = {
      createdAt: normalizedIncoming.createdAt || new Date().toISOString(),
      ...normalizedIncoming,
    };
    setMessages((prev) => {
      const next = [...prev];

      if (withTimestamp.clientTempId) {
        const idx = next.findIndex((m) => m.clientTempId === withTimestamp.clientTempId);
        if (idx >= 0) {
          cleanupAudioRefs(next[idx]._id);
          cleanupAudioRefs(next[idx].clientTempId);
          next.splice(idx, 1);
        }
      }

      const sameIdIdx = next.findIndex((m) => m._id === withTimestamp._id);
      if (sameIdIdx >= 0) {
        next[sameIdIdx] = { ...next[sameIdIdx], ...withTimestamp };
      } else {
        next.push(withTimestamp);
      }

      const safeTime = (m) => new Date(m?.createdAt || Date.now()).getTime();
      next.sort((a, b) => safeTime(a) - safeTime(b));
      return next;
    });
  };

  const mergeConversationFromBackend = (incoming, tempId = null, pendingUserId = null) => {
    if (!incoming?._id) return;
    const normalized = normalizeFriend(incoming);

    setFriends((prev) => {
      const filtered = prev.filter(
        (f) =>
          f._id !== normalized._id &&
          f._id !== tempId &&
          f.pendingUserId !== (pendingUserId || normalized._id)
      );
      return [normalized, ...filtered];
    });

    setActiveChat((prev) => {
      if (!prev) return prev;
      const targetId = getConversationTargetId(prev);
      if (
        (tempId && prev._id === tempId) ||
        targetId === normalized._id ||
        (pendingUserId && targetId === pendingUserId)
      ) {
        return { ...normalized, unreadCount: 0 };
      }
      return prev;
    });
  };

  /* =====================================================
     LOAD FRIENDS / CONVERSATIONS
  ===================================================== */
  const loadFriendsAndConversations = useCallback(async () => {
    if (!token || isDirectConversation) return;

    setLoadingConversations(true);
    setErrorFriends("");

    try {
      const [friendsData, inboxData] = await Promise.all([
        fetchFriends(),
        fetchInbox(),
      ]);

      const rawFriends = Array.isArray(friendsData) ? friendsData : [];
      const normalizedFriends = rawFriends
        .map(normalizeFriend)
        .filter((u) => u && u._id)
        .reduce((acc, user) => {
          if (!acc.some((u) => u._id === user._id)) {
            acc.push(user);
          }
          return acc;
        }, []);

      const rawInbox = Array.isArray(inboxData)
        ? inboxData
        : Array.isArray(inboxData?.data)
        ? inboxData.data
        : [];
      const normalizedInbox = rawInbox
        .map(normalizeFriend)
        .filter((u) => u && u._id)
        .reduce((acc, user) => {
          if (!acc.some((u) => u._id === user._id)) {
            acc.push(user);
          }
          return acc;
        }, []);

      const merged = mergeFriendsWithConversations(
        normalizedFriends,
        normalizedInbox
      );

      setFriends(merged);
    } catch (err) {
      console.error("Erreur chargement amis :", err);
      setErrorFriends(loadErrorMessage);
      setFriends([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [isDirectConversation, mergeFriendsWithConversations, token]);

  useEffect(() => {
    if (!token) {
      setFriends([]);
      setErrorFriends(loadErrorMessage);
      setLoadingConversations(false);
      return;
    }

    if (isDirectConversation) {
      setLoadingConversations(false);
      return;
    }

    loadFriendsAndConversations();
  }, [isDirectConversation, loadFriendsAndConversations, token]);

  const loadRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setRequestsError(loadErrorMessage);
      return;
    }
    try {
      setLoadingRequests(true);
      setRequestsError("");
      const list = await fetchMessageRequests();
      setRequests(list || []);
    } catch (err) {
      console.error("Erreur chargement demandes", err);
      setRequests([]);
      setRequestsError(loadErrorMessage);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequestsCount = requests.length;

  const scrollConversationIntoView = useCallback((conversationKey) => {
    if (!conversationKey) return;

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-conv-id="${conversationKey}"]`);
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, []);

  const applyHighlightNavigationState = useCallback(
    (conversationKey) => {
      if (!conversationKey) return false;

      let updated = false;

      setListTab("conversations");
      setSearch("");
      setActiveChat(null);
      setMessages([]);
      setReplyTo(null);
      setEditingMessage(null);
      setLoadingConversation(false);

      setFriends((prev) => {
        const idx = prev.findIndex((f) => getFriendId(f) === conversationKey);
        if (idx === -1) return prev;

        updated = true;
        const target = prev[idx];
        const unreadCount =
          typeof target.unreadCount === "number" && target.unreadCount > 0
            ? target.unreadCount
            : 1;

        const reordered = [
          {
            ...target,
            unreadCount,
            __uiNew: true,
            hasNewBadge: true,
            __uiHighlight: true,
          },
          ...prev.filter((_, i) => i !== idx),
        ];

        return reordered;
      });

      if (!updated) return false;

      setHighlightedConversationId(conversationKey);
      return true;
    },
    [getFriendId]
  );

  /* =====================================================
     FILTER
  ===================================================== */
  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    const publicFriends = friends.filter((f) => !f.isProfessional);
    if (!q) return publicFriends;
    return publicFriends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, search]);

  const displayedFriends = useMemo(() => {
    const mapped = filteredFriends.map((f, index) => ({
      ...f,
      isHighlighted: Boolean(f.isHighlighted || f.__uiHighlight),
      hasNewBadge: f.__uiNew || f.hasNewBadge,
      hasUnread: conversationHasUnread(f),
      __sortIndex: index,
    }));

    mapped.sort((a, b) => {
      if (a.hasUnread === b.hasUnread) return a.__sortIndex - b.__sortIndex;
      return a.hasUnread ? -1 : 1;
    });

    return mapped.map(({ __sortIndex, ...rest }) => rest);
  }, [conversationHasUnread, filteredFriends]);

  useEffect(() => {
    if (!highlightedConversationId) return undefined;

    const scrollTimer = setTimeout(
      () => scrollConversationIntoView(highlightedConversationId),
      120
    );

    const resetTimer = setTimeout(() => {
      setFriends((prev) =>
        prev.map((f) =>
          getFriendId(f) === highlightedConversationId
            ? { ...f, __uiHighlight: false }
            : f
        )
      );
      setHighlightedConversationId(null);
    }, 2600);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(scrollTimer);
    };
  }, [getFriendId, highlightedConversationId, scrollConversationIntoView]);

  const pinnedMessages = useMemo(() => {
    const list = messages.filter((m) => isPinnedByMe(m));
    return list.sort(
      (a, b) =>
        new Date(b.lastPinnedAt || b.createdAt) -
        new Date(a.lastPinnedAt || a.createdAt)
    );
  }, [messages]);

  /* =====================================================
     SOCKET IO
  ===================================================== */
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      path: "/socket.io/",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    if (!socket.connected) {
      socket.connect();
    }

    socketRef.current = socket;

    const handleMessage = (payload) => {
      const rawMessage = payload?.message || payload;
      if (!rawMessage) return;
      const message = normalizeMediaFields(rawMessage);

      const extractId = (value) => {
        if (!value) return null;
        if (typeof value === "object") return value?._id || value?.id || null;
        return value;
      };

      const senderId = extractId(message.sender ?? message.from);
      const receiverId = extractId(message.receiver ?? message.to);
      const conversationId = extractId(message.conversation);
      const isActiveConversation = isMessageInActiveChat(message);
      const otherUserId = senderId === me?._id ? receiverId : senderId;
      const otherUser = senderId === me?._id ? message.receiver : message.sender;
      const isIncoming = Boolean(senderId && senderId !== me?._id);

      setFriends((prev) => {
        const conversationKey = otherUserId || conversationId;
        if (!conversationKey) return prev;
        const keyAsString = String(conversationKey);
        const idx = prev.findIndex((f) => getFriendId(f) === keyAsString);
        const base = idx >= 0 ? prev[idx] : {};
        const unreadCount = isActiveConversation
          ? 0
          : isIncoming
          ? (Number(base.unreadCount) || 0) + 1
          : Number(base.unreadCount) || 0;

        const updatedFriend = {
          ...base,
          _id: base._id || otherUserId || conversationId || base.conversationId,
          name:
            base.name ||
            (typeof otherUser === "object" ? otherUser?.name : null) ||
            "Contact",
          avatar: getAvatarUrl(
            base.avatar || (typeof otherUser === "object" ? otherUser?.avatar : null)
          ),
          role:
            base.role ||
            (typeof otherUser === "object" ? otherUser?.role : null) ||
            null,
          isProfessional:
            typeof base.isProfessional === "boolean"
              ? base.isProfessional
              : typeof otherUser === "object"
              ? otherUser?.isProfessional
              : base.isProfessional,
          conversationId: base.conversationId || conversationId || null,
          lastMessage: message,
          unreadCount,
          hasNewBadge:
            !isActiveConversation && isIncoming
              ? true
              : base.hasNewBadge ?? false,
          __uiNew:
            !isActiveConversation && isIncoming ? true : base.__uiNew,
        };

        const filtered =
          idx >= 0 ? prev.filter((_, position) => position !== idx) : prev;

        return [updatedFriend, ...filtered];
      });

      if (!isActiveConversation) return;
      upsertMessage(message);
      if (message?._id && senderId !== me?._id) {
        fetch(`${API_URL}/messages/${message._id}/read`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {});
      }
    };

    const handleReactionUpdate = (payload) => {
      if (payload?.message && isMessageInActiveChat(payload.message)) {
        upsertMessage(payload.message);
      }
    };

    const handleCallOffer = ({ from, offer, callType }) => {
      if (!from || !offer) return;
      const caller =
        friends.find((f) => f._id === from) ||
        (activeChat?._id === from ? activeChat : null) ||
        { _id: from, name: "Contact" };

      setCallOverlay({
        visible: true,
        mode: "callee",
        callType: callType || "video",
        offer,
        otherUser: caller,
      });
    };

    const handleMessageUpdated = (payload) => {
      const message = payload?.message || payload;
      if (isMessageInActiveChat(message)) {
        upsertMessage(message);
      }
    };

    const handleMessagePinned = (payload) => {
      const message = payload?.message || payload;
      if (isMessageInActiveChat(message)) {
        upsertMessage(message);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.filter((m) => m._id !== messageId && m.clientTempId !== messageId)
      );
    };

    const handleMessageRequestReceived = () => {
      loadRequests();
    };

    const handleMessageRead = ({ messageId, withUserId }) => {
      if (!messageId && !withUserId) return;
      setMessages((prev) =>
        prev.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender?._id : m.sender;
          const receiverId = typeof m.receiver === "object" ? m.receiver?._id : m.receiver;
          if (
            (messageId && m._id === messageId) ||
            (withUserId && senderId === me?._id && receiverId === withUserId)
          ) {
            return { ...m, isRead: true, readAt: new Date() };
          }
          return m;
        })
      );
    };

    const handleFriendAccepted = () => {
      loadFriendsAndConversations();
    };

    const handleConversationCreated = (payload) => {
      const conversation = payload?.conversation || payload?.data || payload;
      if (!conversation?._id) return;

      const targetId = getConversationTargetId();
      const shouldMergeLocked = lockedConversationRef.current &&
        (targetId === conversation._id ||
          targetId ===
            (typeof conversation?.user === "object"
              ? conversation?.user?._id
              : conversation?.user));

      const pendingUserId =
        typeof conversation?.user === "object"
          ? conversation.user?._id
          : conversation?.user;

      mergeConversationFromBackend(
        conversation,
        shouldMergeLocked ? lockedConversationRef.current : null,
        pendingUserId
      );
      setLockedConversationId((prev) =>
        shouldMergeLocked && prev === lockedConversationRef.current ? null : prev
      );
    };

    const handleTyping = ({ from, isTyping }) => {
      const targetId = getConversationTargetId();
      if (!from || !activeChat || from !== targetId) return;
      setTypingState((prev) => ({
        ...prev,
        [from]: { isTyping: isTyping !== false, at: Date.now() },
      }));
    };

    const handleCallHangup = ({ from }) => {
      setCallOverlay((prev) => {
        if (!prev.visible || !prev.otherUser || prev.otherUser._id !== from) {
          return prev;
        }

        return {
          visible: false,
          mode: "caller",
          callType: "video",
          offer: null,
          otherUser: null,
        };
      });
    };

    socket.on("new_message", handleMessage);
    socket.on("reaction_update", handleReactionUpdate);
    socket.on("audio_message", handleMessage);
    socket.on("call_offer", handleCallOffer);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_pinned", handleMessagePinned);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_request_received", handleMessageRequestReceived);
    socket.on("message_read", handleMessageRead);
    socket.on("friend:accepted", handleFriendAccepted);
    socket.on("conversation_created", handleConversationCreated);
    socket.on("typing", handleTyping);
    socket.on("call_hangup", handleCallHangup);

    return () => {
      socket.off("new_message", handleMessage);
      socket.off("reaction_update", handleReactionUpdate);
      socket.off("audio_message", handleMessage);
      socket.off("call_offer", handleCallOffer);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_pinned", handleMessagePinned);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_request_received", handleMessageRequestReceived);
      socket.off("message_read", handleMessageRead);
      socket.off("friend:accepted", handleFriendAccepted);
      socket.off("conversation_created", handleConversationCreated);
      socket.off("typing", handleTyping);
      socket.off("call_hangup", handleCallHangup);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeChat, friends, loadFriendsAndConversations, loadRequests, token]);

  /* =====================================================
     LOAD CONVERSATION
  ===================================================== */
  const fetchConversationById = async (id) => {
    if (!token) {
      throw new Error(loadErrorMessage);
    }
    const res = await fetch(`${API_URL}/messages/conversation/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await ensureJsonResponse(res);
    if (!res.ok) {
      throw new Error(loadErrorMessage);
    }

    const conversationData =
      data?.conversation ||
      data?.data?.conversation ||
      data?.user ||
      data?.targetUser ||
      null;

    const messagesList = Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
      ? data.messages
      : Array.isArray(data?.data?.messages)
      ? data.data.messages
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return { conversation: conversationData, messages: messagesList };
  };

  const markConversationAsRead = useCallback(
    (id) => {
      if (!id || !token || isLocalConversationId(id)) return;

      fetch(`${API_URL}/messages/read-all/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {});
    },
    [token]
  );

  const loadConversation = async (user) => {
    if (!user?._id || !token) {
      setErrorFriends(loadErrorMessage);
      return;
    }

    const clickedId = getFriendId(user);
    const sanitizedUser = {
      ...user,
      avatar: getAvatarUrl(user?.avatar),
      unreadCount: 0,
      lastMessage: getReadLastMessage(user),
    };

    if (activeChat?._id === sanitizedUser._id) {
      setFriends((prev) =>
        prev.map((f) =>
          getFriendId(f) === clickedId
            ? {
                ...f,
                unreadCount: 0,
                lastMessage: getReadLastMessage(f),
                __uiNew: false,
                hasNewBadge: false,
              }
            : f
        )
      );
      setActiveChat((prev) =>
        prev?._id === sanitizedUser._id
          ? { ...prev, unreadCount: 0, lastMessage: getReadLastMessage(prev) }
          : sanitizedUser
      );
      return;
    }

    setActiveChat(sanitizedUser);
    setFriends((prev) =>
      prev.map((f) =>
        getFriendId(f) === clickedId
          ? {
              ...f,
              unreadCount: 0,
              lastMessage: getReadLastMessage(f),
              __uiNew: false,
              hasNewBadge: false,
              __uiHighlight: false,
            }
          : f
      )
    );
    setMessages([]);
    setReplyTo(null);
    setEditingMessage(null);
    setInput("");

    const targetUserId = getConversationTargetId(sanitizedUser);

    if (
      isLocalConversationId(sanitizedUser._id) ||
      lockedConversationId === sanitizedUser._id
    ) {
      setLoadingConversation(false);
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }

    try {
      setLoadingConversation(true);
      const res = await fetch(`${API_URL}/messages/conversation/${targetUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await ensureJsonResponse(res);
      if (!res.ok) {
        throw new Error(loadErrorMessage);
      }
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const normalizedList = list.map(normalizeMediaFields);
      setMessages(normalizedList);
    } catch (err) {
      console.error("Erreur conversation", err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(() => scrollToBottom(true), 50);
    }
  };

  const handleConversationClick = (user) => {
    userInteractedRef.current = true;
    loadConversation(user);
  };

  const loadConversationRef = useRef(loadConversation);
  useEffect(() => {
    loadConversationRef.current = loadConversation;
  }, [loadConversation]);

  useEffect(() => {
    if (!token || !conversationId) return;

    if (loadedConversationIdRef.current === conversationId) return;
    loadedConversationIdRef.current = conversationId;

    let cancelled = false;

    setLoadingConversation(true);

    fetchConversationById(conversationId)
      .then(({ conversation, messages: convMessages }) => {
        if (cancelled) return;

        const normalized = normalizeFriend(
          conversation || { _id: conversationId, name: conversation?.name || "Conversation" }
        );

        if (normalized?._id) {
          setActiveConversation((prev) =>
            prev?._id === normalized._id ? prev : normalized
          );
          setFriends((prev) => {
            if (prev.some((f) => f._id === normalized._id)) {
              return prev.map((f) =>
                f._id === normalized._id ? { ...f, unreadCount: 0 } : f
              );
            }
            return [...prev, { ...normalized, unreadCount: 0 }];
          });
        }

        if (Array.isArray(convMessages)) {
          const sorted = [...convMessages].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          const normalizedMessages = sorted.map(normalizeMediaFields);
          setMessages(normalizedMessages);
        }

        setReplyTo(null);
        setEditingMessage(null);
        setInput("");
      })
      .catch((err) => {
        console.error("Erreur conversation directe", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversation(false);
          setTimeout(() => scrollToBottom(true), 50);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, token, setActiveConversation]);

  const initialNavigationSignatureRef = useRef(
    `${navigationSource || "none"}|${openConversationId || ""}|${
      highlightConversationId || ""
    }`
  );

  useEffect(() => {
    if (userInteractedRef.current) return;

    const navigationSignature = initialNavigationSignatureRef.current;

    if (
      !navigationSource &&
      !openConversationId &&
      !highlightConversationId
    ) {
      return;
    }

    if (navigationHandledRef.current === navigationSignature) return;

    if (
      navigationSource === "messages_icon" &&
      !openConversationId &&
      !highlightConversationId
    ) {
      navigationHandledRef.current = navigationSignature;
      setListTab("conversations");
      setSearch("");
      setActiveChat(null);
      setMessages([]);
      setReplyTo(null);
      setEditingMessage(null);
      setInput("");
      return;
    }

    if (
      (navigationSource === "notification" ||
        navigationSource === "profile") &&
      openConversationId
    ) {
      if (loadingConversations) return;

      navigationHandledRef.current = navigationSignature;
      setListTab("conversations");
      setSearch("");

      const existing = friends.find((f) => getFriendId(f) === openConversationId);
      if (existing) {
        loadConversationRef.current?.(existing);
        return;
      }

      (async () => {
        try {
          setLoadingConversation(true);
          const { conversation, messages: convMessages } = await fetchConversationById(
            openConversationId
          );

          const normalized = normalizeFriend(
            conversation || {
              _id: openConversationId,
              name: conversation?.name || "Conversation",
            }
          );

          if (normalized?._id) {
            setActiveConversation((prev) =>
              prev?._id === normalized._id ? prev : normalized
            );
            setFriends((prev) => {
              if (prev.some((f) => getFriendId(f) === normalized._id)) return prev;
              return [{ ...normalized, unreadCount: 0 }, ...prev];
            });
          }

          if (Array.isArray(convMessages)) {
            const sorted = [...convMessages].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            const normalizedMessages = sorted.map(normalizeMediaFields);
            setMessages(normalizedMessages);
          } else {
            setMessages([]);
          }
        } catch (err) {
          console.error("Erreur conversation depuis notification", err);
        } finally {
          setLoadingConversation(false);
          setTimeout(() => scrollToBottom(true), 50);
        }
      })();

      return;
    }

    if (navigationSource === "messages_icon" && highlightConversationId) {
      if (loadingConversations) return;
      const applied = applyHighlightNavigationState(highlightConversationId);
      if (applied) {
        navigationHandledRef.current = navigationSignature;
      }
    }
  }, [
    applyHighlightNavigationState,
    friends,
    getFriendId,
    highlightConversationId,
    loadingConversations,
    navigationSource,
    openConversationId,
  ]);

  useEffect(() => {
    if (!token || !activeConversationIdValue) return;

    if (lastReadConversationIdRef.current === activeConversationIdValue) return;
    lastReadConversationIdRef.current = activeConversationIdValue;

    markConversationAsRead(activeConversationIdValue);
  }, [activeConversationIdValue, markConversationAsRead, token]);

  useEffect(() => {
    if (!setActiveConversationId) return;
    setActiveConversationId(activeConversationIdValue);
  }, [activeConversationIdValue, setActiveConversationId]);

  useEffect(
    () => () => {
      setActiveConversationId?.(null);
    },
    [setActiveConversationId]
  );

  useEffect(() => {
    setIsUserTyping?.(false);
    return () => setIsUserTyping?.(false);
  }, [activeConversationIdValue, setIsUserTyping]);

  const handleRequestRemoval = (requestId) => {
    setRequests((prev) => prev.filter((r) => r._id !== requestId));
  };

  const attachAndOpenFriend = (user) => {
    const normalized = normalizeFriend(user);
    setFriends((prev) => {
      if (prev.some((f) => f._id === normalized._id)) return prev;
      return [...prev, normalized];
    });
    loadConversation(normalized);
  };

  const handleAcceptRequest = async (request) => {
    if (!request?._id) return;

    const tempConversationId = `local_request_${request._id}`;
    const pendingUserId = request?.fromUser?._id;
    const tempConversation = {
      ...normalizeFriend({ ...request.fromUser, _id: tempConversationId }),
      pendingUserId,
    };

    setLockedConversationId(tempConversationId);
    handleRequestRemoval(request._id);
    setListTab("conversations");
    setFriends((prev) => {
      const filtered = prev.filter(
        (f) => f._id !== tempConversationId && f.pendingUserId !== pendingUserId
      );
      return [tempConversation, ...filtered];
    });
    setActiveChat(tempConversation);
    setMessages([]);
    setReplyTo(null);
    setEditingMessage(null);
    setInput("");

    try {
      const res = await acceptMessageRequest(request._id);
      const conversationData =
        res?.data?.conversation ||
        res?.data?.data ||
        res?.data ||
        res?.conversation;
      if (conversationData?._id) {
        mergeConversationFromBackend(conversationData, tempConversationId, pendingUserId);
      }
    } catch (err) {
      console.error("Erreur acceptation demande", err);
      setRequestsError(loadErrorMessage);
    } finally {
      setLockedConversationId(null);
    }
  };

  const handleDeclineRequest = async (request) => {
    if (!request?._id) return;
    try {
      await declineMessageRequest(request._id);
      handleRequestRemoval(request._id);
    } catch (err) {
      console.error("Erreur refus demande", err);
      setRequestsError(loadErrorMessage);
    }
  };

  const handleBlockRequest = async (request) => {
    if (!request?._id) return;
    try {
      await blockMessageRequest(request._id);
      handleRequestRemoval(request._id);
    } catch (err) {
      console.error("Erreur blocage demande", err);
      setRequestsError(loadErrorMessage);
    }
  };

  /* =====================================================
     SEND / EDIT MESSAGE
  ===================================================== */
  const sendMessage = async (contentOverride = null) => {
    const content = (contentOverride ?? input).trim();
    const receiverId = getConversationTargetId();
    if (!content || !activeChat || !receiverId) return;
    setInput("");
    setInfoBanner("");
    const { replyId, preview: replyPreview } = buildReplyData(replyTo);

    const clientTempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: clientTempId,
      sender: me?._id,
      receiver: receiverId,
      content,
      type: "text",
      clientTempId,
      replyTo: replyId,
      replyPreview,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true), 10);
    setReplyTo(null);

    try {
      const { ok, data } = await sendMessagePayload({
        receiver: receiverId,
        content,
        clientTempId,
        replyTo: replyId,
      });

      if (data?.type === "request") {
        setMessages((prev) =>
          prev.filter(
            (m) =>
              m.clientTempId !== clientTempId &&
              m._id !== clientTempId &&
              m.clientTempId !== tempMessage._id
          )
        );
        setInfoBanner("Message envoyé comme demande");
        setListTab("requests");
        await loadRequests();
        return;
      }

      if (ok && data?.data) {
        upsertMessage(data.data);
      } else if (data?.message) {
        setInfoBanner(data.message);
      }
    } catch (err) {
      console.error("Erreur envoi message", err);
      setInfoBanner(loadErrorMessage);
      setMessages((prev) =>
        prev.filter(
          (m) =>
            m.clientTempId !== clientTempId &&
            m._id !== clientTempId &&
            m.clientTempId !== tempMessage._id
        )
      );
    }
  };

  const resolveAttachmentType = (file, explicitType = null) => {
    if (explicitType) return explicitType;
    if (file?.type?.startsWith("image/")) return "image";
    if (file?.type?.startsWith("video/")) return "video";
    return "file";
  };

  const revokePreviewUrls = (items = []) => {
    items.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const clearPendingAttachments = () => {
    setPendingAttachments((prev) => {
      revokePreviewUrls(prev);
      return [];
    });
  };

  const uploadAttachment = async (file, explicitType = null) => {
    const receiverId = getConversationTargetId();
    if (!activeChat || !receiverId || !file || !token) {
      setInfoBanner(loadErrorMessage);
      return;
    }

    const { replyId, preview: replyPreview } = buildReplyData(replyTo);

    const clientTempId = `temp-${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);
    const messageType = resolveAttachmentType(file, explicitType);

    const tempMessage = {
      _id: clientTempId,
      sender: me?._id,
      receiver: receiverId,
      type: messageType,
      fileUrl: blobUrl,
      fileName: file.name,
      mimeType: file.type || null,
      content: file.name || getAttachmentLabel(messageType),
      clientTempId,
      replyTo: replyId,
      replyPreview,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true), 10);

    try {
      const { ok, data } = await sendAttachmentMessage({
        file,
        receiver: receiverId,
        type: explicitType || undefined,
        content: file.name,
        clientTempId,
        replyTo: replyId,
      });

      if (ok && data?.data) {
        upsertMessage(data.data);
      } else if (data?.message) {
        setInfoBanner(data.message);
      }
    } catch (err) {
      console.error("Erreur envoi fichier", err);
      setInfoBanner(loadErrorMessage);
      setMessages((prev) =>
        prev.filter(
          (m) =>
            m.clientTempId !== clientTempId &&
            m._id !== clientTempId &&
            m.clientTempId !== tempMessage._id
        )
      );
    } finally {
      setReplyTo(null);
    }
  };

  const sendPendingAttachments = async () => {
    if (!pendingAttachments.length) return;
    const attachmentsToSend = pendingAttachments;
    clearPendingAttachments();

    for (const attachment of attachmentsToSend) {
      await uploadAttachment(attachment.file, attachment.type);
    }
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !input.trim()) return;
    const content = input.trim();
    if (!token) {
      setInfoBanner(loadErrorMessage);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/messages/${editingMessage._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await ensureJsonResponse(res);
      if (res.ok && data?.data) {
        upsertMessage(data.data);
        setEditingMessage(null);
        setReplyTo(null);
        setInput("");
      } else {
        setInfoBanner(loadErrorMessage);
      }
    } catch (err) {
      console.error("Erreur modification message", err);
    }
  };

  const submitMessage = async () => {
    if (editingMessage) {
      await saveEditedMessage();
    } else {
      await sendPendingAttachments();
      await sendMessage();
    }
  };

  /* =====================================================
     MESSAGE ACTIONS
  ===================================================== */
  const startReply = (msg) => {
    setReplyTo(msg);
    setMessageActions(null);
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const startEdit = (msg) => {
    if (!canEditMessage(msg)) return;
    setEditingMessage(msg);
    setReplyTo(null);
    setMessageActions(null);
    setInput(msg.content || "");
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const askDelete = (msg) => {
    setDeleteTarget(msg);
    setMessageActions(null);
  };

  const deleteMessage = async (msg, scope = "me") => {
    if (!msg?._id || !token) {
      setInfoBanner(loadErrorMessage);
      return;
    }
    setMessages((prev) =>
      prev.filter(
        (m) =>
          m._id !== msg._id &&
          m.clientTempId !== msg._id &&
          m.clientTempId !== msg.clientTempId
      )
    );
    setDeleteTarget(null);

    try {
      const deleteScope = scope || "me";
      await fetch(`${API_URL}/messages/${msg._id}?scope=${deleteScope}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error("Erreur suppression message", err);
    }
  };

  const togglePin = async (msg) => {
    if (!msg?._id || !token) {
      setInfoBanner(loadErrorMessage);
      return;
    }
    const nextState = !isPinnedByMe(msg);
    setMessageActions(null);
    try {
      const res = await fetch(`${API_URL}/messages/${msg._id}/pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: nextState }),
      });
      const data = await ensureJsonResponse(res);
      if (res.ok && data?.data) {
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur épinglage message", err);
    }
  };

  const getMessageShareText = (msg) => {
    if (!msg) return "";
    if (msg.type === "audio") {
      const url = resolveUrl(msg.audioUrl);
      const preview = getAudioPreviewText(msg);
      return url ? `${preview}\n${url}` : preview;
    }
    if (msg.fileUrl) {
      const url = resolveUrl(msg.fileUrl);
      const label = msg.content || msg.fileName || getAttachmentLabel(msg.type);
      return url ? `${label}\n${url}` : label;
    }
    return msg.content || "";
  };

  const copyMessage = async (msg) => {
    const text = getMessageShareText(msg);
    if (!text) return;
    const copied = await copyToClipboard(text);
    setMessageActions(null);
    if (copied) {
      alert("Message copié dans le presse-papiers");
    }
  };

  const shareMessage = async (msg) => {
    if (!msg) return;
    const text = getMessageShareText(msg);
    const url = msg.type === "audio" ? resolveUrl(msg.audioUrl) : undefined;
    const title = msg.type === "audio" ? "Message vocal" : "Message";

    if (navigator?.share) {
      try {
        await navigator.share({ text, url, title });
        setMessageActions(null);
        return;
      } catch (err) {
        if (err?.name === "AbortError") {
          return;
        }
        console.error("Erreur partage message", err);
      }
    }

    const copied = await copyToClipboard(text);
    setMessageActions(null);
    if (copied) {
      alert("Lien de partage copié dans le presse-papiers");
    }
  };

  /* =====================================================
     AUDIO
  ===================================================== */
  const stopRecordVisualization = () => {
    if (recordVizFrame.current) {
      cancelAnimationFrame(recordVizFrame.current);
      recordVizFrame.current = null;
    }
  };

  const cleanupAudioContext = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    audioGainRef.current = null;
    audioFilterRef.current = null;
  };

  const startRecording = async (event) => {
    if (!activeChat || isRecording) return;
    clearInterval(recordTimerRef.current);
    stopRecordVisualization();

    const clientX = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const clientY = event?.touches?.[0]?.clientY || event?.clientY || 0;

    recordStartRef.current = { at: Date.now(), x: clientX, y: clientY };
    setRecordTime(0);
    setRecordOffset(0);
    setRecordCanceled(false);
    setRecordLocked(false);
    setRecordLevel(0);
    recordCanceledRef.current = false;
    recordingChunksRef.current = [];

    recordTimerRef.current = setInterval(() => {
      setRecordTime(Date.now() - (recordStartRef.current?.at || Date.now()));
    }, 200);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });
      activeStreamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 3.2;

      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 140;
      highPassFilter.Q.value = 0.7;

      const noiseCutFilter = audioContext.createBiquadFilter();
      noiseCutFilter.type = "lowpass";
      noiseCutFilter.frequency.value = 7200;
      noiseCutFilter.Q.value = 0.9;

      const echoReducer = audioContext.createDynamicsCompressor();
      echoReducer.threshold.setValueAtTime(-48, audioContext.currentTime);
      echoReducer.knee.setValueAtTime(20, audioContext.currentTime);
      echoReducer.ratio.setValueAtTime(8, audioContext.currentTime);
      echoReducer.attack.setValueAtTime(0.002, audioContext.currentTime);
      echoReducer.release.setValueAtTime(0.25, audioContext.currentTime);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const destination = audioContext.createMediaStreamDestination();

      source.connect(gainNode);
      gainNode.connect(highPassFilter);
      highPassFilter.connect(noiseCutFilter);
      noiseCutFilter.connect(echoReducer);
      echoReducer.connect(analyser);
      analyser.connect(destination);

      const recorder = new MediaRecorder(destination.stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const duration = Date.now() - (recordStartRef.current?.at || Date.now());
        const canceled = recordCanceledRef.current || duration < 300;
        stopRecordVisualization();
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        if (canceled || !recordingChunksRef.current.length) {
          recordingChunksRef.current = [];
          cleanupAudioContext();
          setRecordLevel(0);
          return;
        }
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        recordingChunksRef.current = [];
        cleanupAudioContext();
        setRecordLevel(0);
        if (blob.size > 0) {
          uploadAudio(blob, replyTo);
        }
      };

      const animateLevel = () => {
        const analyserNode = audioAnalyserRef.current;
        if (!analyserNode) return;
        const buffer = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(buffer);
        const max = buffer.reduce((m, v) => Math.max(m, v), 0) / 255;
        const level = Math.min(1, max * 1.4);
        setRecordLevel(level);
        if (recordLevelBarRef.current) {
          recordLevelBarRef.current.style.setProperty("--record-level", level.toString());
        }
        recordVizFrame.current = requestAnimationFrame(animateLevel);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      audioGainRef.current = gainNode;
      audioFilterRef.current = highPassFilter;
      setIsRecording(true);
      animateLevel();
    } catch (err) {
      console.error("Erreur accès micro", err);
      clearInterval(recordTimerRef.current);
      stopRecordVisualization();
      cleanupAudioContext();
      setIsRecording(false);
      setRecordLevel(0);
      recordStartRef.current = null;
    }
  };

  const updateRecordingDrag = (event) => {
    if (!isRecording || !recordStartRef.current) return;
    const clientX = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const clientY = event?.touches?.[0]?.clientY || event?.clientY || 0;
    const deltaX = clientX - (recordStartRef.current.x || clientX);
    const deltaY = clientY - (recordStartRef.current.y || clientY);

    if (deltaY < -70) {
      setRecordLocked(true);
    }

    if (recordLocked) {
      setRecordCanceled(false);
      recordCanceledRef.current = false;
      return;
    }

    const boundedOffset = Math.max(-140, Math.min(140, deltaX));

    setRecordOffset(boundedOffset);
    const canceled = deltaX < -80;
    setRecordCanceled(canceled);
    recordCanceledRef.current = canceled;
  };

  const stopRecording = (forceCancel = false) => {
    if (!isRecording) return;
    if (forceCancel) {
      recordCanceledRef.current = true;
      setRecordCanceled(true);
      setRecordTime(0);
      recordingChunksRef.current = [];
    }
    clearInterval(recordTimerRef.current);
    setRecordLocked(false);
    setRecordLevel(0);
    stopRecordVisualization();
    if (recordLevelBarRef.current) {
      recordLevelBarRef.current.style.setProperty("--record-level", "0");
    }
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    if (!recorder) {
      cleanupAudioContext();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob, replyTarget = null) => {
    const receiverId = getConversationTargetId();
    if (!activeChat || !receiverId || !blob || blob.size === 0 || !token) {
      setInfoBanner(loadErrorMessage);
      return;
    }
    const fileName = `voice-${Date.now()}.webm`;

    const { replyId, preview: replyPreview } = buildReplyData(replyTarget);

    const tempUrl = URL.createObjectURL(blob);
    const clientTempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: clientTempId,
      sender: me?._id,
      receiver: receiverId,
      type: "audio",
      audioUrl: tempUrl,
      content: "",
      clientTempId,
      replyTo: replyId,
      replyPreview,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    const formData = new FormData();
    formData.append("audio", blob, fileName);
    formData.append("receiver", receiverId);
    formData.append("clientTempId", clientTempId);
    if (replyId) {
      formData.append("replyTo", replyId);
    }

    try {
      const res = await fetch(`${API_URL}/messages/audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await ensureJsonResponse(res);
      if (res.ok && data?.data) {
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur upload audio", err);
    } finally {
      setTimeout(() => scrollToBottom(true), 30);
      setReplyTo(null);
    }
  };

  /* =====================================================
     AUDIO PLAYER
  ===================================================== */
  const clearPendingPlayRequest = (messageId) => {
    if (!messageId) return;
    delete playRequestRef.current[messageId];
  };

  const isPlayRequestPending = (messageId) =>
    Boolean(messageId && playRequestRef.current[messageId]);

  const markPlayRequestPending = (messageId) => {
    if (!messageId) return;
    playRequestRef.current[messageId] = true;
  };

  const togglePlay = (messageId) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;

    if (audio.paused) {
      if (isPlayRequestPending(messageId)) return;

      const isSwitchingAudio =
        currentAudioRef.current &&
        currentAudioRef.current !== audio &&
        currentAudioIdRef.current;

      if (isSwitchingAudio) {
        clearPendingPlayRequest(currentAudioIdRef.current);
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        setAudioStatus((prev) => ({
          ...prev,
          [currentAudioIdRef.current]: {
            ...(prev[currentAudioIdRef.current] || {}),
            currentTime: 0,
            playing: false,
          },
        }));
      }

      // Reset playback on the target element to avoid AbortError when quickly
      // switching sources or replaying an element whose previous play is still
      // resolving.
      audio.pause();
      if (isSwitchingAudio || audio.ended) {
        audio.currentTime = 0;
      }
      currentAudioRef.current = audio;
      currentAudioIdRef.current = messageId;
      audio.volume = 1;
      audio.playbackRate = 1;
      audio.muted = false;
      audio.setAttribute("playsinline", "true");
      audio.setAttribute("webkit-playsinline", "true");
      markPlayRequestPending(messageId);
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise
          .catch((err) => {
            if (err?.name === "AbortError") {
              console.warn(
                "Lecture audio interrompue avant démarrage (nouvelle requête de lecture)",
                err
              );
              setAudioStatus((prev) => ({
                ...prev,
                [messageId]: {
                  ...(prev[messageId] || {}),
                  playing: false,
                },
              }));
              return;
            }
            console.error("Erreur lecture audio", err);
            setInfoBanner("Impossible de lire la note vocale");
            setAudioStatus((prev) => ({
              ...prev,
              [messageId]: {
                ...(prev[messageId] || {}),
                playing: false,
              },
            }));
          })
          .finally(() => clearPendingPlayRequest(messageId));
      } else {
        clearPendingPlayRequest(messageId);
      }
    } else {
      clearPendingPlayRequest(messageId);
      audio.pause();
      currentAudioRef.current = audio;
      currentAudioIdRef.current = messageId;
    }
  };

  const bindAudioRef = (msg, node) => {
    if (!node) return;
    audioRefs.current[msg._id] = node;

    node.preload = "metadata";
    
    node.volume = 1;

    const persistDuration = () => {
      const durationSec = Number(node.duration);
      if (!durationSec || Number.isNaN(durationSec)) return;

      setMessages((prev) => {
        let updated = false;
        const next = prev.map((m) => {
          if (m._id === msg._id && m.audioDuration !== durationSec) {
            updated = true;
            return { ...m, audioDuration: durationSec };
          }
          return m;
        });
        return updated ? next : prev;
      });
    };

    const updateStatus = () => {
      setAudioStatus((prev) => ({
        ...prev,
        [msg._id]: {
          ...(prev[msg._id] || {}),
          duration: node.duration || 0,
          currentTime: node.currentTime || 0,
          playing: !node.paused,
        },
      }));
      persistDuration();
    };

    node.onloadedmetadata = updateStatus;
    node.ontimeupdate = updateStatus;
    node.onplay = updateStatus;
    node.onpause = updateStatus;
    node.onended = () => {
      node.currentTime = 0;
      if (currentAudioRef.current === node) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        currentAudioIdRef.current = null;
      }
      clearPendingPlayRequest(msg._id);
      updateStatus();
    };
    node.onerror = (event) => {
      console.error("Erreur média audio", event?.error || event);
      setInfoBanner("Audio indisponible ou corrompu");
      updateStatus();
    };

    if (Number.isFinite(node.duration) && node.duration > 0) {
      updateStatus();
    } else {
      node.load();
    }
  };

  /* =====================================================
     REACTIONS
  ===================================================== */
  const sendReaction = async (messageId, emoji) => {
    if (!token) {
      setInfoBanner(loadErrorMessage);
      setReactionPicker({ messageId: null, anchor: null });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await ensureJsonResponse(res);
      if (res.ok && data?.data) {
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur réaction", err);
    } finally {
      setReactionPicker({ messageId: null, anchor: null });
    }
  };

  const handleBubblePointerStart = (msg, event) => {
    const point = event.touches?.[0] || event;
    if (!point) return;
    swipeDataRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      messageId: msg._id,
      actionTriggered: false,
    };
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setMessageActions(msg);
    }, 550);
  };

  const handleBubblePointerMove = (msg, event) => {
    const point = event.touches?.[0] || event;
    const data = swipeDataRef.current;
    if (!point || !data?.messageId || data.messageId !== msg._id || data.actionTriggered) {
      return;
    }

    const dx = point.clientX - data.startX;
    const dy = point.clientY - data.startY;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      clearTimeout(longPressTimer.current);
      swipeDataRef.current = { ...data, actionTriggered: true };
      if (dx > 0) {
        startReply(msg);
      } else {
        askDelete(msg);
      }
    }
  };

  const handleBubblePointerEnd = () => {
    clearTimeout(longPressTimer.current);
    swipeDataRef.current = {};
  };

  useEffect(() => {
    const closePicker = (e) => {
      if (reactionPicker.messageId && !e.target.closest?.(".reaction-picker")) {
        setReactionPicker({ messageId: null, anchor: null });
      }
      if (messageActions && !e.target.closest?.(".message-actions-sheet")) {
        setMessageActions(null);
      }
      if (deleteTarget && !e.target.closest?.(".message-delete-sheet")) {
        setDeleteTarget(null);
      }
    };
    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [reactionPicker.messageId, messageActions, deleteTarget]);

  /* =====================================================
     ATTACH MENU
  ===================================================== */
  const addPendingAttachments = (files, explicitType = null) => {
    const fileArray = Array.from(files || []);
    if (!fileArray.length) return;

    const nextItems = fileArray.map((file, index) => {
      const type = resolveAttachmentType(file, explicitType);
      return {
        id: `pending-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        file,
        type,
        previewUrl: URL.createObjectURL(file),
        name: file.name || "Pièce jointe",
        mimeType: file.type || null,
      };
    });

    setPendingAttachments((prev) => [...prev, ...nextItems]);
  };

  const removePendingAttachment = (id) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleAttachTouchStart = (event) => {
    attachSwipeStart.current = event.touches?.[0]?.clientY || null;
  };

  const handleAttachTouchEnd = (event) => {
    const end = event.changedTouches?.[0]?.clientY;
    if (attachSwipeStart.current !== null && end !== undefined && end - attachSwipeStart.current > 30) {
      setShowAttachMenu(false);
    }
    attachSwipeStart.current = null;
  };

  const triggerAttachmentPicker = (ref) => {
    setShowAttachMenu(false);
    if (ref?.current) {
      ref.current.value = "";
      ref.current.click();
    }
  };

  const handleAttachmentInput = (event, explicitType = null) => {
    addPendingAttachments(event.target.files, explicitType);
    event.target.value = "";
  };

  const shareLocation = () => {
    setShowAttachMenu(false);
    if (!navigator?.geolocation) {
      setInfoBanner("La localisation n'est pas supportée sur cet appareil.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords || {};
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          setInfoBanner("Impossible de récupérer la localisation.");
          return;
        }
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        sendMessage(`Ma localisation : ${mapsUrl}`);
      },
      (err) => {
        console.error("Erreur géolocalisation", err);
        setInfoBanner("Impossible de récupérer la localisation.");
      }
    );
  };

  useEffect(() => {
    const closeAttach = (e) => {
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target) &&
        !e.target.closest?.(".attach-sheet")
      ) {
        setShowAttachMenu(false);
      }
    };
    window.addEventListener("click", closeAttach);
    return () => window.removeEventListener("click", closeAttach);
  }, [showAttachMenu]);

  /* =====================================================
     TYPING FLAG
  ===================================================== */
  const sendTypingFlag = (flag) => {
    setIsUserTyping?.(Boolean(flag && activeChat));
    const targetId = getConversationTargetId();
    if (!activeChat || !targetId || !token) return;
    socketRef.current?.emit("typing", { to: targetId, isTyping: flag });
    fetch(`${API_URL}/messages/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId: targetId, isTyping: flag }),
    }).catch(() => {});
  };

  const handleInputChange = (value) => {
    setInput(value);
    sendTypingFlag(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingFlag(false), 1200);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };

  const resetCallOverlay = () => {
    setCallOverlay({
      visible: false,
      mode: "caller",
      callType: "video",
      offer: null,
      otherUser: null,
    });
  };

  const startCall = (type) => {
    if (!activeChat) return;

    setCallOverlay({
      visible: true,
      mode: "caller",
      callType: type || "video",
      offer: null,
      otherUser: activeChat,
    });

  };

  const endCall = () => {
    if (socketRef.current && callOverlay.otherUser?._id) {
      socketRef.current.emit("call_hangup", { to: callOverlay.otherUser._id });
    }
    resetCallOverlay();
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  useEffect(() => {
    resetCallOverlay();
  }, [activeChat?._id]);

  useEffect(() => {
    clearPendingAttachments();
  }, [activeChat?._id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingState((prev) => {
        const now = Date.now();
        const next = { ...prev };
        Object.entries(prev).forEach(([userId, state]) => {
          if (!state?.at || now - state.at > 2500) {
            delete next[userId];
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* =====================================================
     RENDER HELPERS
  ===================================================== */
  const renderReactions = (msg) => {
    if (!Array.isArray(msg.reactions) || msg.reactions.length === 0) return null;
    const grouped = msg.reactions.reduce((acc, r) => {
      if (!r?.emoji) return acc;
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="message-reactions">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="reaction-pill">
            {emoji}
            {count > 1 && <span className="reaction-count">{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderAudioBubble = (msg) => {
    const status = audioStatus[msg._id] || {};
    const progress = status.duration
      ? Math.min((status.currentTime / status.duration) * 100, 100)
      : 0;
    const url = resolveUrl(msg.audioUrl);

    return (
      <div className="audio-bubble">
        <button
          className={`audio-play ${status.playing ? "playing" : ""}`}
          onClick={() => togglePlay(msg._id)}
        >
          {status.playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div className="audio-progress">
          <div className="audio-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="audio-duration">
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </div>

        <audio
          ref={(node) => bindAudioRef(msg, node)}
          src={url}
          preload="metadata"
          playsInline
          webkit-playsinline="true"
        />
      </div>
    );
  };

  const getReplyPreview = (msg) => {
    if (msg.replyPreview) return msg.replyPreview;
    if (msg.replyTo && typeof msg.replyTo === "object") {
      return {
        messageId: msg.replyTo._id,
        content:
          msg.replyTo.content ||
          (msg.replyTo.type === "audio" ? getAudioPreviewText(msg.replyTo) : "Message"),
        type: msg.replyTo.type || "text",
      };
    }
    return null;
  };

  const findMessageById = (id) =>
    messages.find((m) => m._id === id || m.clientTempId === id) || null;

  const getPreviewContentText = (preview) => {
    if (!preview) return "";
    if (preview.type === "audio") {
      const source = findMessageById(preview.messageId);
      return getAudioPreviewText(source || preview);
    }
    return preview.content || "Message";
  };

  const openMediaViewer = useCallback((url, type = "image") => {
    if (!url) return;
    setMediaViewer({ open: true, url, type });
  }, []);

  const closeMediaViewer = useCallback(() => {
    setMediaViewer({ open: false, url: null, type: null });
  }, []);

  const renderAttachment = (msg) => {
    if (!msg?.fileUrl) return null;
    const url = resolveUrl(msg.fileUrl);
    const isImage =
      msg.type === "image" || (msg.mimeType && msg.mimeType.startsWith("image/"));
    const isVideo =
      msg.type === "video" || (msg.mimeType && msg.mimeType.startsWith("video/"));
    const attachmentLabel = msg.content || msg.fileName;

    if (isImage) {
      return (
        <div className="message-attachment image">
          <img
            src={url}
            alt={attachmentLabel || "Image"}
            onClick={() => openMediaViewer(url, "image")}
          />
          {attachmentLabel && <div className="attachment-name">{attachmentLabel}</div>}
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="message-attachment video">
          <video controls src={url} />
          <div className="attachment-name">{attachmentLabel || "Vidéo"}</div>
        </div>
      );
    }

    return (
      <a
        className="message-attachment file"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="attachment-name">{attachmentLabel || "Fichier"}</div>
        {msg.mimeType && <div className="attachment-meta">{msg.mimeType}</div>}
      </a>
    );
  };

  const renderMessageContent = (msg) => {
    const preview = getReplyPreview(msg);
    const content = msg.type === "audio" ? renderAudioBubble(msg) : msg.content;
    const attachment = renderAttachment(msg);

    const renderBodyContent = () => {
      if (typeof content === "string") {
        return content ? <div className="message-text">{content}</div> : null;
      }
      return content;
    };

    return (
      <div className="message-content">
        {preview && (
          <div
            className="reply-preview-block"
            role="button"
            tabIndex={0}
            onClick={() => scrollToMessage(preview.messageId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToMessage(preview.messageId);
              }
            }}
          >
            <div className="reply-preview-label">Réponse à</div>
            <div className="reply-preview-text">
              {getPreviewContentText(preview)}
            </div>
          </div>
        )}
        <div className="message-body">
          {attachment}
          {renderBodyContent()}
        </div>
        <div className="message-meta">
          <span className="message-time">{formatMessageTime(msg.createdAt)}</span>
          {msg.editedAt && <span className="message-edited">Modifié</span>}
        </div>
      </div>
    );
  };

  const topPinnedMessage = pinnedMessages[0] || null;

  /* =====================================================
     UI
  ===================================================== */
  if (conversationId && loadingConversation) {
    return (
      <div className="messages-loading">
        Chargement de la conversation…
      </div>
    );
  }

  return (
    <>
      {mediaViewer.open && (
        <div
          className="media-viewer-overlay"
          onClick={closeMediaViewer}
          role="presentation"
        >
          <div
            className="media-viewer-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="media-viewer-close"
              onClick={(e) => {
                e.stopPropagation();
                closeMediaViewer();
              }}
              aria-label="Fermer le média"
            >
              ✕
            </button>
            {mediaViewer.type === "image" && (
              <img src={mediaViewer.url} alt="Media" />
            )}
          </div>
        </div>
      )}

      <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* ================= LEFT — AMIS ================= */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
        </div>

        <div className="messages-tabs">
          <button
            className={listTab === "conversations" ? "active" : ""}
            onClick={() => setListTab("conversations")}
          >
            Conversations
          </button>
          <button
            className={listTab === "requests" ? "active" : ""}
            onClick={() => setListTab("requests")}
          >
            Demandes
            {pendingRequestsCount > 0 && (
              <span className="badge">{pendingRequestsCount}</span>
            )}
          </button>
        </div>

        {listTab === "conversations" && (
          <div className="messages-search">
            <input
              type="text"
              placeholder="Rechercher un ami"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {infoBanner && <div className="messages-banner">{infoBanner}</div>}

        <div className="messages-list">
          {listTab === "conversations" ? (
            <>
              {loadingConversations ? (
                <div className="messages-loading">
                  Chargement des conversations…
                </div>
              ) : errorFriends ? (
                <div className="messages-empty">{errorFriends}</div>
              ) : displayedFriends.length === 0 && !isDirectConversation ? (
                <div className="messages-empty">
                  Aucune conversation pour l’instant
                </div>
              ) : (
                displayedFriends.map((friend) => {
                  const convId = getFriendId(friend);
                  const isActive =
                    activeChat?._id && getFriendId(activeChat) === convId;
                  const hasUnread = friend.hasUnread ?? conversationHasUnread(friend);
                  const isHighlighted = Boolean(friend.isHighlighted || friend.__uiHighlight);

                  return (
                    <div
                      key={convId || friend._id}
                      className={`conversation-item ${isActive ? "active" : ""} ${
                        isHighlighted ? "is-highlighted" : ""
                      }`}
                      data-conversation-id={friend._id}
                      data-conv-id={convId}
                      onClick={() => handleConversationClick(friend)}
                    >
                      <Avatar
                        avatar={friend.avatar}
                        name={friend.name}
                        className="conversation-avatar"
                      />

                      <div className="conversation-info">
                        <div className="conversation-name">
                          {friend.name}
                          {hasUnread && <span className="inbox-badge-new">Nouveau</span>}
                        </div>
                        <div className="conversation-last-message">
                          {getLastMessagePreview(friend)}
                        </div>
                      </div>

                      {friend.unreadCount > 0 && (
                        <div className="conv-unread-badge">{friend.unreadCount}</div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              {loadingRequests && (
                <div className="messages-empty">Chargement…</div>
              )}
              {!loadingRequests && requestsError && (
                <div className="messages-empty">{requestsError}</div>
              )}
              {!loadingRequests && !requestsError && requests.length === 0 && (
                <div className="messages-empty">Aucune demande reçue</div>
              )}
              {requests.map((req) => (
                <div key={req._id} className="request-item">
                  <div className="request-main">
                    <Avatar
                      avatar={req?.fromUser?.avatar}
                      name={req?.fromUser?.name || "Utilisateur"}
                      className="conversation-avatar"
                    />
                    <div className="request-info">
                      <div className="conversation-name">
                        {req?.fromUser?.name || "Utilisateur"}
                      </div>
                      <div className="request-message">
                        {req.message || "Nouvelle demande de message"}
                      </div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button onClick={() => handleAcceptRequest(req)}>
                      Accepter
                    </button>
                    <button
                      className="ghost"
                      onClick={() => handleDeclineRequest(req)}
                    >
                      Refuser
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleBlockRequest(req)}
                    >
                      Bloquer
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ================= RIGHT — CHAT ================= */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Commence la conversation 👋</h3>
          </div>
        ) : (
          <div className="chat-panel">
            {/* HEADER */}
            <div className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => {
                  setActiveChat(null);
                  setMessages([]);
                  resetCallOverlay();
                  setCallStatus({ type: null, startedAt: null, contact: null });
                }}
              >
                <BackIcon />
              </button>

              <Avatar
                avatar={activeChat.avatar}
                name={activeChat.name}
                className="chat-avatar"
              />

              <div className="chat-user-info">
                <div className="chat-username">{activeChat.name}</div>
                <div className="chat-status">
                  {typingState[getConversationTargetId()]?.isTyping
                    ? "En train d'écrire..."
                    : "En ligne"}
                </div>
              </div>

              <div className="chat-actions">
                <button
                  type="button"
                  className="chat-action-btn"
                  title="Appel audio"
                  onClick={() => startCall("audio")}
                >
                  <PhoneIcon />
                </button>

                <button
                  type="button"
                  className="chat-action-btn"
              title="Appel vidéo"
              onClick={() => startCall("video")}
            >
              <VideoIcon />
            </button>

            {callOverlay.visible && (
              <button
                type="button"
                className="chat-action-btn chat-action-btn--hangup"
                title="Raccrocher"
                onClick={endCall}
              >
                <PhoneDownIcon />
              </button>
            )}
          </div>
        </div>

            {/* BODY */}
            <div className="chat-scroll" ref={chatBodyRef}>
              <div className="chat-body">
                {topPinnedMessage && (
                  <div className="pinned-banner">
                    <div className="pinned-label">Message épinglé</div>
                    <div className="pinned-main">
                      <div
                        className="pinned-preview"
                        role="button"
                        tabIndex={0}
                        onClick={() => scrollToMessage(topPinnedMessage._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            scrollToMessage(topPinnedMessage._id);
                          }
                        }}
                      >
                        <div className="pinned-author">
                          {isMessageFromMe(topPinnedMessage)
                            ? "Vous"
                            : activeChat?.name || "Contact"}
                        </div>
                        <div className="pinned-text">
                          {topPinnedMessage.type === "audio"
                            ? getAudioPreviewText(topPinnedMessage)
                            : topPinnedMessage.content || "Message"}
                        </div>
                      </div>

                      <div className="pinned-actions">
                        <button
                          type="button"
                          className="pinned-btn"
                          onClick={() => scrollToMessage(topPinnedMessage._id)}
                        >
                          Voir
                        </button>
                        <button
                          type="button"
                          className="pinned-btn"
                          onClick={() => togglePin(topPinnedMessage)}
                        >
                          Désépingler
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {loadingConversation && <div className="chat-empty">Chargement…</div>}

                {!loadingConversation && messages.length === 0 && (
                  <div className="chat-empty">
                    Aucun message pour le moment
                    <br />
                    Commence la conversation 👋
                  </div>
                )}

                {!loadingConversation &&
                  messages.map((msg) => {
                    const senderId =
                      typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
                    const isMe = senderId === me?._id;
                    const senderObj =
                      typeof msg.sender === "object" ? msg.sender : null;
                    const senderName =
                      senderObj?.name ||
                      (isMe ? me?.name || "Vous" : activeChat?.name || "Contact");
                    const senderAvatar = isMe
                      ? meAvatar
                      : senderObj?.avatar || activeChat?.avatar;

                    return (
                      <div key={msg._id} className={`message-row ${isMe ? "me" : "other"}`}>
                        <Avatar
                          avatar={senderAvatar}
                          name={senderName}
                          className="message-avatar"
                        />
                        <div
                          ref={(node) => {
                            if (!node) {
                              delete messageRefs.current[msg._id];
                              return;
                            }
                            messageRefs.current[msg._id] = node;
                          }}
                          className={`message-bubble message-${msg.type || "text"} ${
                            highlightedMessageId === msg._id ? "message-highlight" : ""
                          }`}
                          onMouseDown={(e) => handleBubblePointerStart(msg, e)}
                          onMouseMove={(e) => handleBubblePointerMove(msg, e)}
                          onMouseUp={handleBubblePointerEnd}
                          onMouseLeave={handleBubblePointerEnd}
                          onTouchStart={(e) => handleBubblePointerStart(msg, e)}
                          onTouchMove={(e) => handleBubblePointerMove(msg, e)}
                          onTouchEnd={handleBubblePointerEnd}
                        >
                          {renderMessageContent(msg)}
                          {renderReactions(msg)}
                        </div>
                      </div>
                    );
                  })}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* INPUT */}
            {editingMessage && (
              <div className="edit-banner">
                <div className="edit-banner-text">
                  <div className="edit-banner-title">Modification du message</div>
                  <div className="edit-banner-preview">
                    {editingMessage.type === "audio"
                      ? getAudioPreviewText(editingMessage)
                      : editingMessage.content || "Message"}
                  </div>
                </div>
                <button
                  className="edit-banner-close"
                  onClick={cancelEdit}
                  aria-label="Annuler la modification"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {replyTo && (
              <div className="reply-banner">
                <div className="reply-banner-text">
                  <div className="reply-banner-title">
                    Répondre à {replyTo?.sender?.name || "ce message"}
                  </div>
                  <div className="reply-banner-preview">{getAudioPreviewText(replyTo)}</div>
                </div>
                <button
                  className="reply-banner-close"
                  onClick={() => setReplyTo(null)}
                  aria-label="Annuler la réponse"
                >
                  <CloseIcon />
                </button>
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="pending-attachments" role="list">
                {pendingAttachments.map((attachment) => (
                  <div
                    className="pending-attachment-card"
                    key={attachment.id}
                    role="listitem"
                  >
                    <button
                      className="pending-attachment-remove"
                      type="button"
                      onClick={() => removePendingAttachment(attachment.id)}
                      aria-label="Retirer la pièce jointe"
                    >
                      <CloseIcon />
                    </button>
                    <div className="pending-attachment-preview">
                      {attachment.type === "image" ? (
                        <img
                          src={attachment.previewUrl}
                          alt={attachment.name || "Image"}
                          loading="lazy"
                        />
                      ) : attachment.type === "video" ? (
                        <video
                          src={attachment.previewUrl}
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <div className="pending-attachment-file">
                          <span className="pending-attachment-file-icon" aria-hidden>
                            📎
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pending-attachment-name" title={attachment.name}>
                      {attachment.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              className="chat-input-bar"
              onMouseMove={updateRecordingDrag}
              onTouchMove={updateRecordingDrag}
              onMouseUp={
                isRecording && !recordLocked ? () => stopRecording(false) : undefined
              }
              onTouchEnd={
                isRecording && !recordLocked ? () => stopRecording(false) : undefined
              }
            >
              <div className="attach-wrapper" ref={attachMenuRef}>
                <button
                  className="chat-attach-btn"
                  onClick={() => {
                    setShowAttachMenu((p) => !p);
                  }}
                  aria-label="Pièces jointes"
                >
                  <PlusIcon />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleAttachmentInput(e)}
                  multiple
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleAttachmentInput(e, "image")}
                  multiple
                />
                <input
                  type="file"
                  accept="video/*"
                  ref={videoInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleAttachmentInput(e, "video")}
                  multiple
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  ref={documentInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => handleAttachmentInput(e, "file")}
                  multiple
                />
              </div>

              {isRecording ? (
                <div className={`recording-banner ${recordCanceled ? "canceled" : ""}`}>
                  <div className="recording-icon">
                    <MicIcon pulse={!recordCanceled} />
                  </div>
                  <div className="recording-info">
                    <div className="recording-timer">
                      {formatTime(Math.floor(recordTime / 1000))}
                    </div>
                    <div className="recording-hint">
                      {recordCanceled
                        ? "Annulé"
                        : recordLocked
                        ? "Verrouillé — appuie pour envoyer"
                        : "Glisser vers la gauche pour annuler / vers la droite pour envoyer / vers le haut pour verrouiller"}
                    </div>
                    <div className="recording-level">
                      <div
                        className="recording-level-bar"
                        ref={recordLevelBarRef}
                        style={{ "--record-level": recordLevel }}
                      />
                    </div>
                  </div>
                  <div className="recording-actions">
                    <div
                      className="recording-slider"
                      style={{
                        transform: `translateX(${Math.max(
                          -140,
                          Math.min(140, recordOffset)
                        )}px)`,
                      }}
                    />
                    {recordLocked && (
                      <button
                        className="recording-send"
                        type="button"
                        onClick={() => stopRecording(false)}
                        aria-label="Envoyer la note vocale"
                      >
                        <SendIcon />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <input
                    className="chat-input"
                    placeholder={editingMessage ? "Modifier le message" : "Message..."}
                    ref={inputRef}
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitMessage()}
                  />

                  <button
                    className="emoji-btn"
                    type="button"
                    onClick={() => {
                      if (!messages.length) return;
                      const lastMessage = messages[messages.length - 1];
                      setReactionPicker({ messageId: lastMessage._id, anchor: "input" });
                    }}
                    aria-label="Réagir"
                  >
                    <EmojiIcon />
                  </button>

                  {input.trim().length > 0 || pendingAttachments.length > 0 ? (
                    <button className="chat-send-btn" onClick={submitMessage}>
                      <SendIcon />
                    </button>
                  ) : (
                    <button
                      className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
                      onMouseDown={startRecording}
                      onTouchStart={startRecording}
                      aria-label="Maintenir pour enregistrer"
                      type="button"
                    >
                      <MicIcon />
                    </button>
                  )}
                </>
              )}
            </div>

              {showAttachMenu && (
                <div
                  className="attach-sheet"
                  role="dialog"
                  onTouchStart={handleAttachTouchStart}
                  onTouchEnd={handleAttachTouchEnd}
                >
                  <div className="attach-sheet-handle" />
                  <div className="attach-options">
                    <button
                      className="attach-item"
                      type="button"
                      onClick={() => triggerAttachmentPicker(fileInputRef)}
                    >
                      Fichier
                    </button>
                    <button
                      className="attach-item"
                      type="button"
                      onClick={() => triggerAttachmentPicker(imageInputRef)}
                    >
                      Image
                    </button>
                    <button
                      className="attach-item"
                      type="button"
                      onClick={() => triggerAttachmentPicker(videoInputRef)}
                    >
                      Vidéo
                    </button>
                    <button
                      className="attach-item"
                      type="button"
                      onClick={() => triggerAttachmentPicker(documentInputRef)}
                    >
                      Document
                    </button>
                    <button
                      className="attach-item"
                      type="button"
                      onClick={shareLocation}
                    >
                      Localisation
                    </button>
                  </div>
                </div>
              )}

            {reactionPicker.messageId && (
              <div className="reaction-picker">
                <div className="reaction-bar">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => sendReaction(reactionPicker.messageId, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messageActions && (
              <div className="message-actions-sheet" role="dialog">
                <div className="message-actions-header">Action sur le message</div>
                <div className="message-actions-preview">
                  {messageActions.content ||
                    (messageActions.type === "audio" ? "Message vocal" : "Message")}
                </div>
                {!isMessageFromMe(messageActions) && (
                  <div className="message-actions-reactions">
                    <div className="message-actions-subtitle">Réagir</div>
                    <div className="reaction-bar">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className="reaction-btn"
                          onClick={() => {
                            sendReaction(messageActions._id, emoji);
                            setMessageActions(null);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="message-actions-buttons">
                  <button
                    className="message-action-icon"
                    onClick={() => togglePin(messageActions)}
                    aria-label={
                      isPinnedByMe(messageActions) ? "Désépingler" : "Épingler"
                    }
                    title={
                      isPinnedByMe(messageActions) ? "Désépingler" : "Épingler"
                    }
                  >
                    <PinIcon />
                  </button>
                  {canEditMessage(messageActions) && (
                    <button
                      className="message-action-icon"
                      onClick={() => startEdit(messageActions)}
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      <EditIcon />
                    </button>
                  )}
                  <button
                    className="message-action-icon"
                    onClick={() => copyMessage(messageActions)}
                    aria-label="Copier"
                    title="Copier"
                  >
                    <CopyIcon />
                  </button>
                  <button
                    className="message-action-icon"
                    onClick={() => shareMessage(messageActions)}
                    aria-label="Partager"
                    title="Partager"
                  >
                    <ShareIcon />
                  </button>
                  <button
                    className="message-action-icon"
                    onClick={() => startReply(messageActions)}
                    aria-label="Répondre"
                    title="Répondre"
                  >
                    <ReplyIcon />
                  </button>
                  <button
                    className="message-action-icon danger"
                    onClick={() => askDelete(messageActions)}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            )}

            {deleteTarget && (
              <div className="message-delete-sheet" role="alertdialog">
                <div className="message-actions-header">Supprimer ce message ?</div>
                <div className="message-actions-preview">
                  {deleteTarget.content ||
                    (deleteTarget.type === "audio" ? "Message vocal" : "Message")}
                </div>
                <div className="message-actions-buttons">
                  <button onClick={() => setDeleteTarget(null)}>Annuler</button>
                  <button
                    className="danger"
                    onClick={() => deleteMessage(deleteTarget, "me")}
                  >
                    Supprimer ici
                  </button>
                  {isMessageFromMe(deleteTarget) && (
                    <button
                      className="danger"
                      onClick={() => deleteMessage(deleteTarget, "all")}
                    >
                      Supprimer pour tous
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <VideoCallOverlay
        visible={callOverlay.visible}
        mode={callOverlay.mode}
        callType={callOverlay.callType}
        socket={socketRef.current}
        me={me}
        otherUser={callOverlay.otherUser}
        incomingOffer={callOverlay.offer}
        onClose={() => {
          resetCallOverlay();
          setCallStatus({ type: null, startedAt: null, contact: null });
        }}
      />
    </div>
    </>
  );
}

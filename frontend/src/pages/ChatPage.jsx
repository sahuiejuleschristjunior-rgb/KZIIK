import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { useNotifications } from "../context/NotificationContext";
import { API_URL } from "../api/config";

const API_ROOT = API_URL;
const API_BASE = API_ROOT.replace("/api", "");
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

export default function ChatPage() {
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const { deleteByType } = useNotifications() || {};

  const [viewer, setViewer] = useState(null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const addMessage = (message) => {
    if (!message) return;
    const id = message._id || message.id;
    if (id && messageIdsRef.current.has(String(id))) return;
    if (id) messageIdsRef.current.add(String(id));
    setMessages((prev) => [...prev, message]);
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${API_BASE}${fileUrl}`;
  };

  useEffect(() => {
    deleteByType?.("public");
  }, [deleteByType]);

  useEffect(() => {
    if (!token) {
      setError(loadErrorMessage);
      return;
    }

    loadViewer();
    loadPartner();
    loadMessages();
  }, [id, token]);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.emit("join_room", { userId: id });

    socket.on("new_message", ({ message }) => {
      if (!message) return;
      const otherId = message?.sender?._id || message?.sender;
      const targetId = message?.receiver?._id || message?.receiver;
      if (otherId === id || targetId === id) {
        addMessage(message);
      }
    });

    socket.on("connect_error", () => {
      setError(loadErrorMessage);
    });

    return () => {
      socket.off("new_message");
      socket.off("connect_error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, token]);

  const loadViewer = async () => {
    try {
      const res = await fetch(`${API_ROOT}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await ensureJsonResponse(res);
      if (res.ok) setViewer(data.user);
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const loadPartner = async () => {
    try {
      const res = await fetch(`${API_ROOT}/auth/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await ensureJsonResponse(res);
      if (res.ok) setPartner(data);
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_ROOT}/messages/conversation/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const list = await ensureJsonResponse(res);
      if (res.ok && Array.isArray(list)) {
        messageIdsRef.current = new Set(
          list.map((m) => (m?._id || m?.id ? String(m._id || m.id) : null)).filter(Boolean)
        );
        setMessages(list);
      }
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const sendAttachment = async () => {
    if (!file || !token) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiver", id);
    if (text.trim()) {
      formData.append("content", text.trim());
    }

    try {
      const res = await fetch(`${API_ROOT}/messages/attachment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await ensureJsonResponse(res);
      const saved = payload?.data || payload;
      if (res.ok && saved) {
        addMessage(saved);
        setText("");
        setFile(null);
      } else {
        setError(payload?.message || loadErrorMessage);
      }
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const sendMessage = async () => {
    if (file) {
      await sendAttachment();
      return;
    }

    if (!text.trim()) return;
    if (!token) {
      setError(loadErrorMessage);
      return;
    }

    const body = {
      receiver: id,
      content: text,
    };

    try {
      const res = await fetch(`${API_ROOT}/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await ensureJsonResponse(res);
      const msg = payload?.data || payload;
      if (res.ok && msg) {
        addMessage(msg);
        setText("");
      } else {
        setError(payload?.message || loadErrorMessage);
      }
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  return (
    <div className="chat-wrapper">
      {error && <div className="messages-empty">{error}</div>}
      <div className="chat-header">
        <h2>{partner?.name}</h2>
      </div>

      <div className="chat-messages">
        {messages.map((m) => {
          const senderId = m?.sender?._id || m?.sender;
          const key = m?._id || m?.id || `${senderId}-${Math.random()}`;
          const fileUrl = getFileUrl(m?.fileUrl);

          return (
            <div
              key={key}
              className={
                senderId === viewer?._id ? "msg msg-me" : "msg msg-them"
              }
            >
              {m?.type === "image" && fileUrl && (
                <img src={fileUrl} alt={m?.fileName || "Image"} className="msg-media" />
              )}

              {m?.type === "video" && fileUrl && (
                <video controls className="msg-media">
                  <source src={fileUrl} type={m?.mimeType || "video/mp4"} />
                </video>
              )}

              {m?.fileUrl && m?.type === "file" && (
                <a
                  className="msg-file"
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  📎 {m?.fileName || m?.content || "Document"}
                </a>
              )}

              {m?.content && <p className="msg-text">{m.content}</p>}
            </div>
          );
        })}
      </div>

      <div className="chat-input">
        <input
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file && (
          <div className="chat-file-preview">
            <span>Pièce jointe : {file.name}</span>
            <button onClick={() => setFile(null)}>✕</button>
          </div>
        )}
        <input
          type="text"
          placeholder="Écrire un message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
}

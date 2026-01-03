import { useState, useRef, useEffect } from "react";
import "../styles/messages.css";

export default function Messages() {
  const [showMenu, setShowMenu] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  /* ============================================================
     AUTO SCROLL
  ============================================================ */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ============================================================
     ENVOI MESSAGE
  ============================================================ */
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const msg = {
      id: Date.now(),
      text,
      me: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="messages-page">

      {/* NAVBAR MOBILE */}
      <div className="mobile-navbar">
        <button
          className="nav-btn-round"
          type="button"
          onClick={() => setShowMenu((p) => !p)}
        >
          ☰
        </button>

        <div className="nav-title-pill">Messages</div>

        <button className="nav-btn-pill">Profil</button>
      </div>

      {/* MENU LATERAL */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <p style={{ color: "white", margin: 0 }}>Menu (à connecter)</p>
          </div>
        </div>
      )}

      {/* LISTE DES MESSAGES */}
      <div className="messages-wrapper">
        <div className="messages-list">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`msg-bubble ${msg.me ? "msg-me" : "msg-them"}`}
            >
              {msg.text}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT BAR */}
      <div className="mobile-bottom-bar">
        <button className="bottom-plus-btn">+</button>

        <div className="bottom-input-wrapper">
          <input
            type="text"
            placeholder="Message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button className="bottom-send-btn" onClick={sendMessage}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

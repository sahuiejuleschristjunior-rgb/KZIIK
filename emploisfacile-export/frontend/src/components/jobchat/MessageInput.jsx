import React, { useEffect, useState } from "react";

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!onTyping) return undefined;
    onTyping(Boolean(value));

    const timer = setTimeout(() => {
      onTyping(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [value, onTyping]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="job-chat-input">
      <input
        type="text"
        placeholder="Écrire un message…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
        disabled={disabled}
      />
      <button
        type="button"
        className="primary-btn"
        onClick={handleSend}
        disabled={disabled}
      >
        Envoyer
      </button>
    </div>
  );
}

import React, { useEffect } from "react";
import "../styles/Toast.css";

export default function Toast({ message, type = "info", visible, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!visible) return undefined;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  if (!visible || !message) return null;

  return (
    <div className={`global-toast ${type}`} role="status" aria-live="polite">
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Fermer la notification">
        ×
      </button>
    </div>
  );
}

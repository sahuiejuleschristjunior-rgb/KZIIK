import React from "react";
import "../styles/GlobalFeedbackModal.css";

export default function GlobalFeedbackModal({ open, message, onClose }) {
  if (!open) return null;

  return (
    <div className="global-feedback-overlay" role="alertdialog" aria-modal="true">
      <div className="global-feedback-card">
        <p className="global-feedback-message">{message}</p>
        <button className="global-feedback-button" onClick={onClose} autoFocus>
          OK
        </button>
      </div>
    </div>
  );
}

// src/components/MobileMenu.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./MobileMenu.css"; // ATTENTION à la majuscule
import LeftMenu from "./LeftMenu";

export default function MobileMenu({ open, onClose, user, role }) {
  return (
    <>
      {/* OVERLAY */}
      <div
        className={`mobile-menu-overlay ${open ? "show" : ""}`}
        onClick={onClose}
      />

      {/* PANEL */}
      <div
        className={`mobile-menu-panel ${open ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======== BOUTON FERMER STYLE CHATGPT ======== */}
        <button className="mobile-menu-close" onClick={onClose}>
          ✕
        </button>

        {/* ======== PROFIL EN LIGNE ======== */}
        <div className="mobile-menu-profile-row">
          <Link
            to={user?._id ? `/profil/${user._id}` : "/profil"}
            className="avatar-link"
            aria-label="Ouvrir mon profil"
            onClick={onClose}
          >
            <img
              src={user?.avatar || "https://i.pravatar.cc/200"}
              alt="avatar"
              className="mobile-profile-avatar"
              loading="lazy"
            />
          </Link>

          <div className="mobile-profile-info">
            <p className="mobile-profile-name">
              {user?.name || "Utilisateur"}
            </p>

            <p className="mobile-profile-role">
              {role === "recruteur" ? "Recruteur" : "Candidat"}
            </p>
          </div>
        </div>

        {/* ======== LISTE DES MENUS ======== */}
        <div className="mobile-menu-items">
          <LeftMenu role={role} menuOpen={open} setMenuOpen={onClose} />
        </div>
      </div>
    </>
  );
}

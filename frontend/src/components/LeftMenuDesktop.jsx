// src/components/LeftMenuDesktop.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/leftMenuDesktop.css";

export default function LeftMenuDesktop() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const items = [
    { icon: "home", label: "Accueil" },
    { icon: "people", label: "Relations" },
    { icon: "notifications", label: "Notifications" },
    { icon: "chat", label: "Messages" },
    { icon: "ondemand_video", label: "Reels" },
    { icon: "description", label: "Pages" },
    { icon: "campaign", label: "Publicités" },
    { icon: "settings", label: "Paramètres" },
    { icon: "person", label: "Profil" },
  ];

  const name =
    currentUser?.name ||
    currentUser?.fullName ||
    currentUser?.email ||
    "Invité KZIIK";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profilePath = currentUser?._id ? `/profil/${currentUser._id}` : "/profil";

  return (
    <aside className="left-desktop-menu">
      {/* Profil */}
      <div className="left-desktop-profile">
        <Link
          to={profilePath}
          className="left-desktop-avatar avatar-link"
          aria-label="Ouvrir mon profil"
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={name} loading="lazy" />
          ) : (
            <span>{initials}</span>
          )}
        </Link>

        <div className="left-desktop-profile-info">
          <p className="left-desktop-name">{name}</p>
          <p className="left-desktop-role">Membre</p>
        </div>
      </div>

      <div className="left-desktop-divider" />

      {/* Navigation */}
      <nav className="left-desktop-menu-list">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="left-desktop-item"
          >
            <span className="material-icons left-desktop-icon">
              {item.icon}
            </span>
            <span className="left-desktop-text">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

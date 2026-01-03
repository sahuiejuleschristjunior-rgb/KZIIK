import { Link, useLocation } from "react-router-dom";
import "../styles/bottomMenu.css";
import { useNotifications } from "../context/NotificationContext";

export default function BottomMenu() {
  const location = useLocation();
  const { unread } = useNotifications();

  return (
    <nav className="bottom-menu">
      {/* HOME */}
      <Link
        to="/fb"
        className={`menu-item ${location.pathname.startsWith("/fb") ? "active" : ""}`}
      >
        <span className="icon">🏠</span>
        <span className="menu-text">Accueil</span>
      </Link>

      {/* CREATE STORY / POST */}
      <Link to="/create" className="menu-item">
        <span className="icon">➕</span>
        <span className="menu-text">Créer</span>
      </Link>

      {/* NOTIFICATIONS */}
      <Link
        to="/notifications"
        className={`menu-item ${location.pathname === "/notifications" ? "active" : ""}`}
      >
        <span className="icon notif-icon-wrapper">
          🔔
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </span>
        <span className="menu-text">Notifications</span>
      </Link>

      {/* PROFILE */}
      <Link
        to="/profil"
        className={`menu-item ${location.pathname === "/profil" ? "active" : ""}`}
      >
        <span className="icon">👤</span>
        <span className="menu-text">Profil</span>
      </Link>
    </nav>
  );
}
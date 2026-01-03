import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bottom-nav">
      
      <Link to="/feed" className={path === "/feed" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </Link>

      <Link to="/jobs" className={path === "/jobs" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Emplois</span>
      </Link>

      <button className="nav-item center-btn">
        <span className="nav-icon">➕</span>
      </button>

      <Link to="/messages" className={path === "/messages" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">💬</span>
        <span className="nav-label">Messages</span>
      </Link>

      <Link to="/profile" className={path === "/profile" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profil</span>
      </Link>

    </nav>
  );
}

import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bottom-nav">
      
      <Link to="/fb" className={path === "/fb" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Accueil</span>
      </Link>

      <Link
        to="/fb/relations"
        className={path === "/fb/relations" ? "nav-item active" : "nav-item"}
      >
        <span className="nav-icon">🧑‍🤝‍🧑</span>
        <span className="nav-label">Relations</span>
      </Link>

      <button className="nav-item center-btn">
        <span className="nav-icon">➕</span>
      </button>

      <Link to="/messages" className={path === "/messages" ? "nav-item active" : "nav-item"}>
        <span className="nav-icon">💬</span>
        <span className="nav-label">Messages</span>
      </Link>

      <Link
        to="/profil"
        className={path === "/profil" ? "nav-item active" : "nav-item"}
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profil</span>
      </Link>

    </nav>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const defaultMenuItems = [
  { key: "home", label: "🏠 Accueil", path: "/fb/dashboard" },
  { key: "jobs", label: "💼 Emplois", path: "/emplois" },
  { key: "dashboard", label: "Tableau de bord", path: "/jobconnect/dashboard" },
  { key: "candidatures", label: "Mes candidatures", path: "/jobconnect/candidatures" },
  { key: "entretiens", label: "Entretiens", path: "/jobconnect/entretiens" },
  { key: "messages", label: "Messages", path: "/jobconnect/messages" },
  { key: "favoris", label: "Favoris", path: "/jobconnect/favoris" },
  { key: "agenda", label: "Ordre du jour", path: "/jobconnect/agenda" },
  { key: "profil", label: "Profil", path: "/jobconnect/profil" },
];

export default function JobConnectLayout({
  user,
  onLogout,
  children,
  menuItems = defaultMenuItems,
  eyebrow = "Espace candidat",
  titlePrefix = "Bonjour",
  avatarFallback = "C",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="candidate-dashboard">
      <aside className={`cd-side ${sidebarOpen ? "cd-side-open" : ""}`}>
        <div className="side-header">
          <div className="side-brand">EmploisFacile</div>
          <button
            className="side-close mobile-only"
            aria-label="Fermer le menu"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>
        <nav className="side-nav">
          {menuItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`side-link ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="side-bottom">
          <button className="side-logout" onClick={onLogout}>
            ⏻ Se déconnecter
          </button>
          <div className="side-footer">© 2025 EmploisFacile</div>
        </div>
      </aside>

      {sidebarOpen && <div className="cd-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <main className="cd-main">
        <header className="cd-topbar">
          <div className="topbar-left">
            <p className="eyebrow">{eyebrow}</p>
            <h2>
              {titlePrefix} {user?.name || user?.companyName || "!"}
            </h2>
          </div>
          <div className="topbar-actions">
            <button
              className="notif-btn mobile-only"
              aria-label="Ouvrir le menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <button className="notif-btn" onClick={() => nav("/notifications")} aria-label="Notifications">
              🔔
            </button>
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() ||
                user?.companyName?.charAt(0)?.toUpperCase() ||
                avatarFallback}
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

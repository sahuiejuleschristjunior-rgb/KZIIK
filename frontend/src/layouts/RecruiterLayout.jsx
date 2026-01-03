import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const recruiterMenu = [
  { key: "dashboard", label: "Tableau de bord", path: "/recruiter/dashboard" },
  { key: "create", label: "Publier une offre", path: "/recruiter/create-job" },
  { key: "offers", label: "Mes offres", path: "/recruiter/offres" },
  { key: "applications", label: "Candidatures", path: "/recruiter/candidatures" },
  { key: "cv-theque", label: "CV thèque", path: "/recruiter/cv-theque" },
  { key: "messages", label: "Messages", path: "/recruiter/messages" },
  { key: "company", label: "Entreprise", path: "/profil" },
  { key: "settings", label: "Paramètres", path: "/settings" },
];

export default function RecruiterLayout({
  user,
  onLogout,
  children,
  menuItems = recruiterMenu,
  eyebrow = "Espace recruteur",
  titlePrefix = "Bonjour",
  avatarFallback = "R",
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
          <div className="side-brand">KZIIK</div>
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
          <div className="side-footer">© 2025 KZIIK</div>
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
            <button
              className="notif-btn"
              onClick={() => nav("/notifications")}
              aria-label="Notifications"
            >
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

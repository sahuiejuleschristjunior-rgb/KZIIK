import { useLocation, useNavigate } from "react-router-dom";
import "../styles/ads.css";

const links = [
  { label: "Tableau de bord", to: "/ads" },
  { label: "Créer une publicité", to: "/ads/create" },
  { label: "Campagnes", to: "/ads" },
  { label: "📦 Archives", to: "/ads/archives" },
  { label: "Paiements", to: "/ads", disabled: true },
  { label: "Statistiques", to: "/ads", disabled: true },
];

export default function AdsSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (link) => {
    if (link.disabled) return;
    navigate(link.to);
  };

  return (
    <aside className="ads-sidebar">
      <div className="ads-sidebar__brand">
        <div className="ads-badge">ADS</div>
        <div>
          <div className="ads-sidebar__title">Centre publicitaire</div>
          <div className="ads-sidebar__subtitle">Gestion des campagnes</div>
        </div>
      </div>

      <nav className="ads-menu">
        {links.map((link) => {
          const isActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
          return (
            <button
              key={link.label}
              type="button"
              className={`ads-menu__item ${isActive ? "active" : ""} ${link.disabled ? "disabled" : ""}`}
              onClick={() => handleClick(link)}
            >
              <span>{link.label}</span>
              {link.disabled && <span className="ads-pill">Bientôt</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

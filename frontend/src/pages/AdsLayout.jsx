import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdsSidebar from "../components/AdsSidebar";
import "../styles/ads.css";

export default function AdsLayout() {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "EF";

  return (
    <div className="ads-layout">
      <AdsSidebar />
      <div className="ads-main">
        <header className="ads-topbar">
          <div>
            <div className="ads-brand">Ads Manager</div>
            <div className="ads-topnote">Centre publicitaire dédié</div>
          </div>
          <div className="ads-user-chip">
            <div className="ads-user-avatar">{initials}</div>
            <div>
              <div className="ads-user-name">{user?.name || "Annonceur"}</div>
              <div className="ads-user-role">Publicités | Contrôle</div>
            </div>
          </div>
        </header>
        <div className="ads-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLoader from "./PageLoader";

export default function ProtectedRoute({
  children,
  roles = null,
  redirectIfAuth = false,
  to = "/fb",
}) {
  const { loading, isAuthenticated, user, profileCompleted } = useAuth();
  const location = useLocation();
  const isCompleteProfileRoute = location.pathname === "/complete-profile";

  /* ============================================================
     1) Pendant chargement global → loader (évite écran noir)
  ============================================================ */
  if (loading) {
    return <PageLoader />;
  }

  /* ============================================================
     2) Route publique : si déjà connecté → redirection
  ============================================================ */
  if (redirectIfAuth && isAuthenticated) {
    return <Navigate to={to} replace />;
  }

  if (redirectIfAuth) {
    return children;
  }

  /* ============================================================
     3) NON connecté → forcer redirection login
  ============================================================ */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  /* ============================================================
     4) Auth OK mais user pas encore chargé → show loader
  ============================================================ */
  if (!user) {
    return <PageLoader />;
  }

  /* ============================================================
     4.5) Profil incomplet → redirection forcée
  ============================================================ */
  if (!profileCompleted && !isCompleteProfileRoute) {
    return <Navigate to="/complete-profile" replace />;
  }

  /* ============================================================
     5) PROTECTION PAR RÔLE
  ============================================================ */
  if (roles && roles.length) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/fb" replace />;
    }
  }

  /* ============================================================
     6) Accès autorisé
  ============================================================ */
  return children;
}

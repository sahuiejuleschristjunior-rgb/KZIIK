import { API_URL } from "../api/config";
// /frontend/src/utils/imageUtils.js

const API_BASE = API_URL.replace(/\/api\/?$/, "");
// 🔗 Utilisé pour exposer les fichiers statiques via l'API (/api/uploads)
const API_STATIC = API_URL.replace(/\/$/, "");

/* ============================================================
    CONSTRUIT UNE URL D’IMAGE PROPRE ET FIABLE
============================================================ */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // URL complète déjà
  if (imagePath.startsWith("http")) return imagePath;

  // Si commence par /uploads → passer par l'API (garanti par Nginx/Proxy)
  if (imagePath.startsWith("/uploads")) {
    return `${API_STATIC}${imagePath}`;
  }

  // Si commence par uploads sans slash
  if (imagePath.startsWith("uploads")) {
    return `${API_STATIC}/${imagePath}`;
  }

  // Cas général
  return `${API_BASE}${imagePath}`;
};

/* ============================================================
    STYLE AVATAR UNIFIÉ (Header, Feed, CreatePost)
============================================================ */
export const getAvatarStyle = (avatarPath) => {
  const url = getImageUrl(avatarPath);

  if (!url) {
    return {
      backgroundColor: "#444",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      color: "#fff",
    };
  }

  return {
    backgroundImage: `url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
};

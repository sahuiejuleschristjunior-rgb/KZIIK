// /frontend/src/utils/imageUtils.js

const API_BASE = "https://emploisfacile.org";

/* ============================================================
    CONSTRUIT UNE URL D’IMAGE PROPRE ET FIABLE
============================================================ */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // URL complète déjà
  if (imagePath.startsWith("http")) return imagePath;

  // Si commence par /uploads
  if (imagePath.startsWith("/uploads")) {
    return `${API_BASE}${imagePath}`;
  }

  // Si commence par uploads sans slash
  if (imagePath.startsWith("uploads")) {
    return `${API_BASE}/${imagePath}`;
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
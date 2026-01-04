import { API_URL } from "../api/config";

const API_STATIC = API_URL.replace(/\/$/, "");

export const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;

  if (mediaPath.startsWith("http")) return mediaPath;

  if (mediaPath.startsWith("/uploads")) {
    return `${API_STATIC}${mediaPath}`;
  }

  if (mediaPath.startsWith("uploads")) {
    return `${API_STATIC}/${mediaPath}`;
  }

  const cleaned = mediaPath.replace(/^\/+/, "");
  return `${API_STATIC}/${cleaned}`;
};

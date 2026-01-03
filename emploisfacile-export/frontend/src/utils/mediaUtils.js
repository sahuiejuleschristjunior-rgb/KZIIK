import { API_URL } from "../api/config";

export const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;

  if (mediaPath.startsWith("http")) return mediaPath;

  if (mediaPath.startsWith("/uploads")) {
    return `${API_URL}${mediaPath}`;
  }

  if (mediaPath.startsWith("uploads")) {
    return `${API_URL}/${mediaPath}`;
  }

  const cleaned = mediaPath.replace(/^\/+/, "");
  return `${API_URL}/${cleaned}`;
};

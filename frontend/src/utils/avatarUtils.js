import { getImageUrl } from "./imageUtils";

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (typeof avatarPath === "string" && avatarPath.startsWith("blob:")) {
    return avatarPath;
  }
  return getImageUrl(avatarPath);
};

export const getAvatarInitials = (name = "") => {
  const clean = name.trim();
  if (!clean) return "??";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "??";
};

export const getAvatarData = (avatarPath, name = "") => {
  const url = getAvatarUrl(avatarPath);
  return {
    url: url || null,
    initials: getAvatarInitials(name),
    hasImage: Boolean(url),
  };
};

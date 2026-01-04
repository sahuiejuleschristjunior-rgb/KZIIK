import { useState } from "react";
import { getAvatarData } from "../utils/avatarUtils";

export default function Avatar({
  avatar,
  name = "Utilisateur",
  className = "",
  fallbackClassName = "",
  ...imgProps
}) {
  const [failed, setFailed] = useState(false);
  const { url, initials } = getAvatarData(!failed ? avatar : null, name);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={className}
        loading="lazy"
        onError={() => setFailed(true)}
        {...imgProps}
      />
    );
  }

  return (
    <div
      className={`${className} avatar-fallback ${fallbackClassName}`.trim()}
      aria-label={name}
      role="img"
    >
      {initials}
    </div>
  );
}

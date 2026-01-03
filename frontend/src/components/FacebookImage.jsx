import React from "react";

export default function FacebookImage({
  src,
  alt = "",
  className = "",
  style = {},
  objectFit = "contain",
  height = "auto",
  onClick,
  ...rest
}) {
  if (!src) return null;

  const finalClassName = ["fb-facebook-image", className].filter(Boolean).join(" ");

  return (
    <img
      src={src}
      alt={alt}
      className={finalClassName}
      style={{
        width: "100%",
        height,
        objectFit,
        display: "block",
        background: "#000",
        ...style,
      }}
      onClick={onClick}
      loading="lazy"
      {...rest}
    />
  );
}

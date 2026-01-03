// src/components/CreatePostBar.jsx
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import FBIcon from "./FBIcon";
import { getImageUrl } from "../utils/imageUtils";

export default function CreatePostBar({ onOpenModalWith }) {
  const fileInputRef = useRef(null);
  const nav = useNavigate();

  const handleOpenTextModal = () => {
    onOpenModalWith({ text: "", files: [] });
  };

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length > 0) {
      onOpenModalWith({ text: "", files: list });
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const avatar = getImageUrl(user.avatar);

  const avatarStyle = avatar ? { backgroundImage: `url(${avatar})` } : {};
  const profilePath = user?._id ? `/profil/${user._id}` : "/profil";

  return (
    <div className="fb-create-bar">
      <button
        type="button"
        className="fb-create-bar-left avatar-link"
        style={avatarStyle}
        onClick={(event) => {
          event.stopPropagation();
          nav(profilePath);
        }}
        aria-label="Ouvrir mon profil"
      />

      <div
        className="fb-create-bar-input"
        onClick={handleOpenTextModal}
      >
        Exprimez-vous…
      </div>

      <button className="fb-create-bar-btn" onClick={handlePickFiles}>
        <FBIcon name="image" size={22} />
      </button>

      <input
        type="file"
        hidden
        multiple
        ref={fileInputRef}
        onChange={handleFilesSelected}
      />
    </div>
  );
}

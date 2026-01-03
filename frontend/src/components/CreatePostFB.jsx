import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import { API_URL } from "../api/config";

const MAX_FILES = 10;

export default function CreatePostFB({
  onPosted,
  onOptimisticPost,
  onPostCreated,
  onPostError,
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const nav = useNavigate();

  const token = localStorage.getItem("token");
  /* =====================================================
        USER AVATAR
  ===================================================== */
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  const avatarStyle = getAvatarStyle(currentUser?.avatar);
  const fullAvatarUrl = getImageUrl(currentUser?.avatar);

  const firstName =
    currentUser?.name?.split(" ")[0] || currentUser?.name || "vous";
  const profilePath = currentUser?._id ? `/profil/${currentUser._id}` : "/profil";

  /* =====================================================
        GESTION DES FICHIERS
  ===================================================== */
  const addCacheBust = (url) => {
    if (!url) return url;
    const cacheKey = Date.now();
    return `${url}${url.includes("?") ? "&" : "?"}v=${cacheKey}`;
  };

  const waitForServerImages = async (media = []) => {
    const imageMedia = media.filter((m) => m?.type === "image" && m?.url);
    if (imageMedia.length === 0) return;

    const checkAvailability = () =>
      Promise.all(
        imageMedia.map(
          (m) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              img.src = getImageUrl(m.url);
            })
        )
      );

    while (true) {
      const results = await checkAvailability();
      if (results.every(Boolean)) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    if (files.length + incoming.length > MAX_FILES) {
      setErrorMsg(
        `Maximum ${MAX_FILES} fichiers. Tu as déjà ${files.length} fichier(s).`
      );
      setTimeout(() => setErrorMsg(""), 2500);
      return;
    }

    const allowedTypes = ["image/", "video/"];
    const filtered = incoming.filter((f) =>
      allowedTypes.some((t) => f.type.startsWith(t))
    );

    if (filtered.length === 0) {
      setErrorMsg("Seules les images et vidéos sont autorisées.");
      setTimeout(() => setErrorMsg(""), 2500);
      return;
    }

    const newFiles = [...files, ...filtered];
    setFiles(newFiles);
    setPreview(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const resetState = () => {
    setText("");
    setFiles([]);
    setPreview([]);
    setErrorMsg("");
  };

  const handleProfileClick = (event) => {
    event?.stopPropagation?.();
    nav(profilePath);
    setIsModalOpen(false);
  };

  /* =====================================================
        PUBLICATION
  ===================================================== */
  const handleCreate = async () => {
    if (!text.trim() && files.length === 0) return;
    if (!token) return (window.location.href = "/login");

    let tempId = null;

    try {
      setLoading(true);

      tempId = `temp-${Date.now()}`;
      const optimisticPost = {
        _id: tempId,
        text,
        media: files.map((f, idx) => ({
          url: preview[idx] || URL.createObjectURL(f),
          type: f.type.startsWith("video/") ? "video" : "image",
          isLocal: true,
        })),
        user: currentUser || {},
        authorType: "user",
        createdAt: new Date().toISOString(),
        likes: [],
        comments: [],
        reactions: [],
      };

      if (onOptimisticPost) onOptimisticPost(optimisticPost);

      const fd = new FormData();
      fd.append("text", text);
      files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur lors de la publication");
        if (onPostError) onPostError(tempId);
        return;
      }

      const mediaWithCacheBust = (data.media || []).map((m) => ({
        ...m,
        url: addCacheBust(m.url),
        isLocal: false,
      }));

      const notifyPostCreated = async () => {
        await waitForServerImages(mediaWithCacheBust);
        if (onPostCreated)
          onPostCreated(tempId, { ...data, media: mediaWithCacheBust });
        if (onPosted) onPosted();
      };

      resetState();
      setIsModalOpen(false);
      notifyPostCreated();
    } catch (err) {
      console.error("CREATE POST ERROR:", err);
      alert("Erreur serveur");
      if (onPostError) onPostError(tempId);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
        MODAL HANDLERS
  ===================================================== */
  const openModal = () => {
    if (!token) return (window.location.href = "/login");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  /* SVG PHOTO */
  const PhotoIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2EDF40"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M8.5 14.5l3.5-3.5 4 4 4-4" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  );

  /* =====================================================
        RENDER
  ===================================================== */
  return (
    <>
      {/* BARRE */}
      <div className="fb-create-post-bar" onClick={openModal}>
        <button
          type="button"
          className="fb-create-post-avatar avatar-link"
          style={avatarStyle}
          onClick={handleProfileClick}
          aria-label="Ouvrir mon profil"
        >
          {!fullAvatarUrl && <span>👤</span>}
        </button>

        <div className="fb-create-post-placeholder">Quoi de neuf ?</div>

        <div className="fb-create-post-photo-btn">{PhotoIcon}</div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fb-modal-overlay" onClick={closeModal}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="fb-modal-header">
              <button className="fb-modal-close" onClick={closeModal}>
                ✕
              </button>
              <span className="fb-modal-title">Créer une publication</span>
              <span style={{ width: 22 }} />
            </div>

            {/* BODY */}
            <div className="fb-modal-body">
              <div className="fb-modal-user-row">
                <button
                  type="button"
                  className="fb-modal-avatar avatar-link"
                  style={avatarStyle}
                  onClick={handleProfileClick}
                  aria-label="Ouvrir mon profil"
                >
                  {!fullAvatarUrl && <span>👤</span>}
                </button>

                <div className="fb-modal-user-infos">
                  <div className="fb-modal-name">
                    {currentUser?.name || "Utilisateur"}
                  </div>
                  <div className="fb-modal-privacy">Amis</div>
                </div>

                <button className="fb-modal-close-mobile" onClick={closeModal}>
                  ✕
                </button>
              </div>

              {errorMsg && <div className="fb-create-error">{errorMsg}</div>}

              <textarea
                className="fb-modal-textarea"
                placeholder={`Quoi de neuf, ${firstName} ?`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {preview.length > 0 && (
                <div className="fb-preview-zone">
                  {preview.map((src, i) => (
                    <div key={i} className="fb-preview-item">
                      <button
                        className="fb-preview-remove"
                        type="button"
                        onClick={() => {
                          const newFiles = files.filter((_, idx) => idx !== i);
                          const newPrev = preview.filter(
                            (_, idx) => idx !== i
                          );
                          setFiles(newFiles);
                          setPreview(newPrev);
                        }}
                      >
                        ✕
                      </button>

                      {files[i] && files[i].type.startsWith("video/") ? (
                        <video src={src} className="fb-preview-img" controls />
                      ) : (
                        <img src={src} className="fb-preview-img" alt="" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <label className="fb-modal-file-btn">
                {PhotoIcon}
                <span>Ajouter des photos / vidéos</span>
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <button
              className="fb-modal-submit"
              disabled={loading || (!text.trim() && files.length === 0)}
              onClick={handleCreate}
            >
              {loading ? "Publication..." : "Publier"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { API_URL } from "../api/config";
// PhotoViewerPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/photo-viewer.css";
import { getImageUrl } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";

export default function PhotoViewerPage() {
  const { postId, index } = useParams(); // route: /photo/:postId/:index
  const nav = useNavigate();
  const startIndex = Math.max(0, parseInt(index || "0", 10));
  const token = localStorage.getItem("token");

  const [post, setPost] = useState(null);
  const [idx, setIdx] = useState(startIndex);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // load post
  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPost(data.post || data);
    } catch (err) {
      console.error("PhotoViewer load error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, postId, token]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    // clamp index when post loads
    if (!post) return;
    const total = (post.media || []).length;
    if (total === 0) return;
    let i = startIndex;
    if (i < 0) i = 0;
    if (i >= total) i = total - 1;
    setIdx(i);
  }, [post, startIndex]);

  const goPrev = () => {
    if (!post?.media) return;
    setIdx((s) => (s - 1 + post.media.length) % post.media.length);
  };
  const goNext = () => {
    if (!post?.media) return;
    setIdx((s) => (s + 1) % post.media.length);
  };

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") nav(-1);
      if (e.key === "f" || (e.key === "F")) setFullscreen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, post]);

  if (loading) {
    return (
      <div className="pv-root">
        <div className="pv-loader">Chargement...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pv-root">
        <div className="pv-empty">Publication introuvable</div>
        <button className="pv-back" onClick={() => nav(-1)}>Retour</button>
      </div>
    );
  }

  const media = post.media || [];
  const total = media.length;
  const current = media[idx];

  const handleLike = async () => {
    try {
      await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // simple optimistic UI: reload post
      await loadPost();
    } catch (err) {
      console.error(err);
    }
  };

  const shareLink = `${window.location.origin}/photo/${post._id}/${idx}`;

  return (
    <div className={`pv-root ${fullscreen ? "pv-fullscreen" : ""}`}>
      <div className="pv-topbar">
        <button className="pv-close" onClick={() => nav(-1)}>✕</button>

        <div className="pv-user">
          <button
            type="button"
            className="pv-avatar avatar-link"
            style={
              post.user?.avatar
                ? { backgroundImage: `url(${getImageUrl(post.user.avatar)})` }
                : {}
            }
            onClick={(event) => {
              event.stopPropagation();
              if (post.user?._id) {
                nav(`/profil/${post.user._id}`);
              }
            }}
            aria-label="Ouvrir le profil"
          />
          <div className="pv-user-info">
            <div className="pv-user-name">{post.user?.name}</div>
            <div className="pv-date">
              {new Date(post.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="pv-actions">
          <button onClick={() => setFullscreen((s) => !s)} className="pv-action">
            {fullscreen ? "Quitter plein écran" : "Plein écran"}
          </button>
        </div>
      </div>

      <div className="pv-body">
        <div className="pv-media-area">
          {total > 1 && (
            <button className="pv-nav pv-prev" onClick={goPrev} aria-label="Précédent">‹</button>
          )}

          <div
            className="pv-media-wrapper"
            onDoubleClick={() => setFullscreen((s) => !s)}
          >
            {current?.type === "image" ? (
              <img src={getImageUrl(current.url)} alt="" className="pv-media" loading="lazy" />
            ) : (
              <video controls className="pv-media">
                <source src={getImageUrl(current.url)} />
              </video>
            )}
          </div>

          {total > 1 && (
            <button className="pv-nav pv-next" onClick={goNext} aria-label="Suivant">›</button>
          )}
        </div>

        <aside className="pv-side">
          <div className="pv-text">{post.text}</div>

          <div className="pv-side-actions">
            <button className="pv-like" onClick={handleLike}>
              <FBIcon name="like" size={16} /> J'aime
            </button>

            <button className="pv-comment" onClick={() => nav(`/post/${post._id}#comments`)}>
              <FBIcon name="comment" size={16} /> Commenter
            </button>

            <button
              className="pv-share"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ text: post.text, url: shareLink }).catch(()=>{});
                } else {
                  navigator.clipboard.writeText(shareLink);
                  alert("Lien copié");
                }
              }}
            >
              <FBIcon name="share" size={16} /> Partager
            </button>
          </div>

          {total > 1 && (
            <div className="pv-thumbs">
              {media.map((m, i) => (
                <button
                  key={i}
                  className={`pv-thumb ${i === idx ? "pv-thumb--active" : ""}`}
                  onClick={() => setIdx(i)}
                >
                  {m.type === "image" ? (
                    <img src={getImageUrl(m.url)} alt="" loading="lazy" />
                  ) : (
                    <div className="pv-thumb-video">▶</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className="pv-footer">
        <div className="pv-counter">{idx + 1} / {total}</div>
      </div>
    </div>
  );
}

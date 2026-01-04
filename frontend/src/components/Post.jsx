import { API_URL } from "../api/config";
// src/components/Post.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/post.css";
import FBIcon from "./FBIcon";
import PostEditModal from "./PostEditModal"; // ⬅️ AJOUT IMPORTANT
import MediaRenderer from "./MediaRenderer";
import { getHiddenPostIds, rememberHiddenPost } from "../utils/hiddenPosts";
import TextClamp from "./TextClamp";

const API_BASE = API_URL;
const API_HOST = API_BASE.replace(/\/api\/?$/, "");
const API_STATIC = API_URL.replace(/\/$/, "");

const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `${API_STATIC}${path}`;
  if (path.startsWith("uploads")) return `${API_STATIC}/${path}`;
  if (path.startsWith("/default")) return `${API_STATIC}/uploads${path}`;
  return `${API_HOST}${path}`;
};

export default function Post({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  onDeletePost,
  onDeleteComment,
  onDeleteReply,
  onMediaClick,
  onCommentClick,
  onCommentsCountClick,
  onLikesCountClick,
  onHidePost,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sponsorError, setSponsorError] = useState("");
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorToast, setSponsorToast] = useState("");
  const postRef = useRef(null);
  const clickSentRef = useRef(false);
  const nav = useNavigate();
  const [isHidden, setIsHidden] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [isSponsored, setIsSponsored] = useState(Boolean(post?.isSponsored));
  useEffect(() => {
    setIsSponsored(Boolean(post?.isSponsored));
  }, [post?.isSponsored]);
  useEffect(() => {
    const hidden = getHiddenPostIds(currentUser?._id);
    if (hidden.includes(String(post?._id || post?.id))) {
      setIsHidden(true);
    }
  }, [currentUser?._id, post?._id, post?.id]);
  const sponsoredPostId = post?.sponsoredPostId || post?._id;

  const textButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  };

  if (!post) return null;
  if (isHidden) return null;

  const id = post._id;
  const isAuthor = String(post.user?._id) === String(currentUser?._id);
  const pageOwnerId =
    post.page?.owner?._id || post.page?.owner || post.pageOwnerId;
  const pageAdminIds = Array.isArray(post.page?.admins)
    ? post.page.admins
        .map((admin) => admin?._id || admin)
        .filter(Boolean)
        .map(String)
    : [];
  const isPageOwner = Boolean(
    (pageOwnerId && String(pageOwnerId) === String(currentUser?._id)) ||
      pageAdminIds.includes(String(currentUser?._id))
  );
  const isPostPublic = Boolean(
    post.privacy === "public" ||
      post.visibility === "public" ||
      post.audience === "public" ||
      post.isPublic === true ||
      (!post.privacy && !post.visibility && post.isPublic !== false)
  );
  const canSponsor = (isAuthor || isPageOwner) && !isSponsored && isPostPublic;
  const isAdmin = (currentUser?.role || "").toLowerCase() === "admin";
  const isOwner = isAuthor || isPageOwner;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;
  const canHide = Boolean(currentUser?._id);
  const canReport = !isOwner;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const authorAvatar = fixUrl(post.user?.avatar);
  const avatarStyle = authorAvatar
    ? {
        backgroundImage: `url(${authorAvatar})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};
  const profilePath = post.user?._id ? `/profil/${post.user._id}` : null;

  const imageItems = (post.media || [])
    .map((m, originIndex) => ({ ...m, originIndex, url: fixUrl(m.url) }))
    .filter((m) => {
      if (!m.url) return false;
      if (m.type) return m.type.startsWith("image");
      return /(png|jpe?g|webp|gif)$/i.test(m.url);
    });

  const imageIndexMap = new Map();
  imageItems.forEach((item, idx) => {
    imageIndexMap.set(item.originIndex, idx);
  });

  const buildLayout = (count) => {
    if (count <= 1) {
      return {
        layoutClass: "single",
        visibleCount: 1,
        areaClasses: ["grid-area-a"],
      };
    }

    if (count === 2) {
      return {
        layoutClass: "two",
        visibleCount: 2,
        areaClasses: ["grid-area-a", "grid-area-b"],
      };
    }

    if (count === 3) {
      return {
        layoutClass: "three",
        visibleCount: 3,
        areaClasses: ["grid-area-a", "grid-area-b", "grid-area-c"],
      };
    }

    if (count === 4) {
      return {
        layoutClass: "four",
        visibleCount: 4,
        areaClasses: [
          "grid-area-a",
          "grid-area-b",
          "grid-area-c",
          "grid-area-d",
        ],
      };
    }

    return {
      layoutClass: "five-plus",
      visibleCount: 4,
      areaClasses: [
        "grid-area-a",
        "grid-area-b",
        "grid-area-c",
        "grid-area-d",
      ],
    };
  };

  const renderImageGrid = () => {
    if (!imageItems.length) return null;

    const totalImages = imageItems.length;
    const { layoutClass, visibleCount, areaClasses } = buildLayout(totalImages);
    const displayedImages = imageItems.slice(0, visibleCount);
    const remaining = totalImages - visibleCount;

    return (
      <div className={`fb-post-media-grid ${layoutClass}`}>
        {displayedImages.map((image, idx) => {
          const imageIndex = imageIndexMap.get(image.originIndex) ?? idx;
          const showOverlay = remaining > 0 && idx === displayedImages.length - 1;
          const areaClass = areaClasses[idx] || "";
          const altText = image.alt || image.name || "Image de la publication";

          return (
            <button
              type="button"
              key={image.originIndex || idx}
              className={`fb-post-image-btn ${areaClass}`}
              onClick={() => onMediaClick?.(imageItems, imageIndex)}
              aria-label="Afficher les photos de la publication"
            >
              <MediaRenderer
                media={image}
                src={image.url}
                type={image.type}
                mimeType={image.mimeType}
                mediaClassName="fb-post-image fb-post-image-cover"
                alt={altText}
              />
              {showOverlay && (
                <span
                  className="fb-post-image-overlay"
                  aria-label={`Afficher ${remaining} média${remaining > 1 ? "s" : ""} supplémentaires`}
                >
                  +{remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const trackAdEvent = async (type) => {
    if (!isSponsored || !sponsoredPostId || !token) return;

    try {
      await fetch(`${API_BASE}/ads/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sponsoredPostId, type }),
      });
    } catch (err) {
      console.error("AD TRACK ERROR", err);
    }
  };

  useEffect(() => {
    if (!isSponsored || !postRef.current || !sponsoredPostId) return undefined;
    const storageKey = `ad_imp_${sponsoredPostId}`;

    try {
      if (typeof window !== "undefined") {
        if (window.sessionStorage?.getItem(storageKey)) return undefined;
      }
    } catch (err) {}

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          try {
            window.sessionStorage?.setItem(storageKey, "1");
          } catch (err) {}

          trackAdEvent("impression");
      observer.disconnect();
    });
      },
      { threshold: 0.5 }
    );

    observer.observe(postRef.current);

    return () => observer.disconnect();
  }, [isSponsored, sponsoredPostId]);

  const handleSponsoredClick = () => {
    if (!isSponsored || !sponsoredPostId) return;
    if (clickSentRef.current) return;

    try {
      const key = `ad_click_${sponsoredPostId}`;
      if (typeof window !== "undefined") {
        const already = window.sessionStorage?.getItem(key);
        if (already) return;
        window.sessionStorage?.setItem(key, "1");
      }
    } catch (err) {}

    clickSentRef.current = true;
    trackAdEvent("click");
  };

  const hasOnlyImages =
    Boolean(post.media?.length) && imageItems.length === (post.media?.length || 0);

  const renderMediaContent = () => {
    if (!post.media?.length) return null;
    if (hasOnlyImages) return renderImageGrid();

    return post.media.map((m, index) => {
      const mediaUrl = fixUrl(m.url);
      if (!mediaUrl) return null;
      const isImage = m.type
        ? m.type.startsWith("image")
        : /(png|jpe?g|webp|gif)$/i.test(m.url || "");

      if (isImage) {
        const imageIndex = imageIndexMap.get(index) ?? 0;
        return (
          <div className="fb-post-media-box" key={index}>
            <button
              type="button"
              className="fb-post-image-btn"
              onClick={() => onMediaClick?.(imageItems, imageIndex)}
              aria-label="Afficher les photos de la publication"
            >
              <MediaRenderer
                media={m}
                src={mediaUrl}
                type={m.type}
                mimeType={m.mimeType}
                mediaClassName="fb-post-image"
                alt="media"
              />
            </button>
          </div>
        );
      }

      if (m.type === "video") {
        return (
          <div className="fb-post-media-box" key={index}>
            <MediaRenderer
              media={m}
              src={mediaUrl}
              type={m.type}
              mimeType={m.mimeType}
              mediaClassName="fb-post-video"
              controls
            />
          </div>
        );
      }

      return null;
    });
  };

  const handleHidePost = () => {
    setMenuOpen(false);
    rememberHiddenPost(id, currentUser?._id);
    setIsHidden(true);
    if (typeof onHidePost === "function") {
      onHidePost(id);
    }
  };

  const handleReportPost = () => {
    setMenuOpen(false);
    alert("Merci pour votre signalement. Notre équipe va vérifier la publication.");
  };

  const focusCommentBox = () => {
    const box = document.querySelector(`#comment-box-${id}`);
    box?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => box?.focus(), 200);
  };

  const handleCommentArea = () => {
    if (onCommentClick) {
      onCommentClick(post);
      return;
    }

    focusCommentBox();
  };

  const handleCommentsCount = () => {
    if (onCommentsCountClick) {
      onCommentsCountClick(post);
      return;
    }

    handleCommentArea();
  };

  const handleLikesCount = () => {
    if (onLikesCountClick) {
      onLikesCountClick(post);
      return;
    }

    nav(`/likes/${id}`);
  };

  const handleOpenSponsorModal = () => {
    setSponsorError("");
    setMenuOpen(false);
    setIsSponsorModalOpen(true);
  };

  const resetSponsorForm = () => {
    setBudgetTotal("");
    setBudgetDaily("");
    setStartDate("");
    setEndDate("");
  };

  const handleSponsorSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setSponsorError("Connexion requise pour sponsoriser.");
      return;
    }

    setSponsorError("");
    setSponsorLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ads/create/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          budgetTotal: Number(budgetTotal),
          budgetDaily: Number(budgetDaily),
          startDate,
          endDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de lancer la campagne.");
      }

      setIsSponsorModalOpen(false);
      resetSponsorForm();
      setIsSponsored(true);
      setSponsorToast("Campagne lancée");
      setTimeout(() => setSponsorToast(""), 3500);
    } catch (err) {
      setSponsorError(err.message || "Erreur inconnue");
    } finally {
      setSponsorLoading(false);
    }
  };

  return (
    <>
      <article
        className="fb-post-card"
        ref={postRef}
        onClickCapture={handleSponsoredClick}
      >
        {/* HEADER */}
        <div className="fb-post-header">
          <button
            type="button"
            className="fb-post-avatar avatar-link"
            style={avatarStyle}
            onClick={(event) => {
              event.stopPropagation();
              if (profilePath) nav(profilePath);
            }}
            aria-label="Ouvrir le profil"
          />

          <div className="fb-post-user-info">
            <div className="fb-post-author">{post.user?.name}</div>
            <div className="fb-post-meta">
              {formatDate(post.createdAt)}
              {isSponsored && <span className="fb-sponsored-badge">Sponsorisé</span>}
            </div>
          </div>

          {/* MENU (…) */}
          <div className="fb-post-menu fb-post-menu-container">
            <button
              className="fb-post-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ⋯
            </button>

            {menuOpen && (
              <div
                className={`fb-post-menu-popup${menuOpen ? " open" : ""}`}
              >
                {canEdit && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setIsEditModalOpen(true); // ⬅️ Ouvrir modal modif
                    }}
                  >
                    Modifier la publication
                  </button>
                )}

                {canDelete && (
                  <button
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeletePost?.(id);
                    }}
                  >
                    Supprimer
                  </button>
                )}

                {canHide && (
                  <button onClick={handleHidePost}>Masquer la publication</button>
                )}

                {canReport && (
                  <button onClick={handleReportPost}>Signaler</button>
                )}

                {canSponsor && (
                  <button className="fb-sponsor-menu" onClick={handleOpenSponsorModal}>
                    <span className="fb-sponsor-icon" aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M4 14.5V5.8c0-.6.4-1.1 1-1.3l10.3-3.3c.8-.2 1.6.4 1.6 1.2V6l2.3.7c.5.2.8.6.8 1.1v4.4c0 .5-.3 1-.8 1.1l-2.3.7v3.5c0 .8-.8 1.4-1.6 1.2L5 15.7c-.6-.2-1-.7-1-1.2Z" />
                        <path d="M4 18.5c0-1 .9-1.8 2-1.5l2.4.7c.9.3 1.6 1.1 1.6 2v2.5c0 1-.9 1.8-2 1.5l-2.4-.7c-.9-.3-1.6-1.1-1.6-2v-2.5Z" />
                      </svg>
                    </span>
                    Sponsoriser
                  </button>
                )}

                <button
                  onClick={() => setMenuOpen(false)}
                  className="close-menu"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TEXTE DU POST */}
        {post.text && (
          <div className="fb-post-text">
            {post.title && <strong>{post.title}</strong>}
            <TextClamp text={post.text} className="text-content" />
          </div>
        )}

        {/* MEDIAS */}
        {post.media?.length > 0 && (
          <div className="fb-post-media">{renderMediaContent()}</div>
        )}

        {/* STATS */}
        <div className="fb-post-stats">
          <button
            type="button"
            style={textButtonStyle}
            onClick={handleLikesCount}
            aria-label="Voir les mentions j'aime"
          >
            {post.likes?.length || 0} j’aime
          </button>
          <button
            type="button"
            style={textButtonStyle}
            onClick={handleCommentsCount}
            aria-label="Afficher les commentaires"
          >
            {post.comments?.length || 0} commentaires
          </button>
        </div>

        {/* ACTIONS */}
        <div className="fb-post-actions">
          <button
            className={`fb-action-btn ${
              post.likes?.includes(String(currentUser?._id)) ? "liked" : ""
            }`}
            onClick={() => onLike(id)}
          >
            <FBIcon name="like" size={20} />
            J’aime
          </button>

          <button
            className="fb-action-btn"
            onClick={handleCommentArea}
          >
            <FBIcon name="comment" size={20} />
            Commenter
          </button>

          <button
            className="fb-action-btn"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/post/${id}`
              );
              alert("Lien copié !");
            }}
          >
            <FBIcon name="share" size={20} />
            Partager
          </button>
        </div>

      </article>

      {/* MODAL ÉDITION */}
      {isEditModalOpen && (
        <PostEditModal
          post={post}
          onClose={() => setIsEditModalOpen(false)}
          onPostUpdated={() => {
            setIsEditModalOpen(false);
          }}
        />
      )}

      {isSponsorModalOpen && (
        <div
          className="fb-sponsor-modal-overlay"
          onClick={() => {
            setIsSponsorModalOpen(false);
            resetSponsorForm();
          }}
        >
          <div
            className="fb-sponsor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-sponsor-modal-header">
              <div className="fb-sponsor-title">Sponsoriser la publication</div>
              <button
                type="button"
                className="fb-sponsor-close"
                onClick={() => {
                  setIsSponsorModalOpen(false);
                  resetSponsorForm();
                }}
              >
                ✕
              </button>
            </div>

            <form className="fb-sponsor-form" onSubmit={handleSponsorSubmit}>
              <label className="fb-sponsor-field">
                <span>Budget total</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Budget journalier</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetDaily}
                  onChange={(e) => setBudgetDaily(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Date début</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Date fin</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>

              {sponsorError && (
                <div className="fb-sponsor-error">{sponsorError}</div>
              )}

              <div className="fb-sponsor-actions">
                <button
                  type="button"
                  className="fb-sponsor-cancel"
                  onClick={() => {
                    setIsSponsorModalOpen(false);
                    resetSponsorForm();
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="fb-sponsor-submit"
                  disabled={sponsorLoading}
                >
                  {sponsorLoading ? "Lancement..." : "Lancer la campagne"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sponsorToast && <div className="fb-sponsor-toast">{sponsorToast}</div>}
    </>
  );
}

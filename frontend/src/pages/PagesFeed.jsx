import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreatePostFB from "../components/CreatePostFB";
import CommentsModal from "../components/CommentsModal";
import MediaRenderer from "../components/MediaRenderer";
import FBIcon from "../components/FBIcon";
import SkeletonPost from "../components/SkeletonPost";
import StoriesFB from "../components/StoriesFB";
import TextClamp from "../components/TextClamp";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import { sharePost } from "../api/posts";
import "../styles/facebook-feed.css";
import "../styles/post.css";
import { API_URL } from "../api/config";

export default function PagesFeed() {
  const nav = useNavigate();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let userId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.id || payload._id || payload.userId || null;
    } catch {
      userId = null;
    }
  }
  const [rawPool, setRawPool] = useState([]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [sponsorModalPost, setSponsorModalPost] = useState(null);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sponsorError, setSponsorError] = useState("");
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorToast, setSponsorToast] = useState("");
  const [sharingPostIds, setSharingPostIds] = useState({});

  const buildPageFeed = useCallback((source = []) => {
    const seenProfiles = new Set();

    const sorted = [...source].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const curated = [];

    sorted.forEach((post) => {
      if (!post) return;
      if (post.page) {
        curated.push(post);
        return;
      }

      const userId = post.user?._id || post.user?.id;
      if (!userId || seenProfiles.has(userId)) return;

      seenProfiles.add(userId);
      curated.push(post);
    });

    return curated;
  }, []);

  const mergeIntoPool = useCallback((incoming = [], reset = false) => {
    setRawPool((prev) => {
      const base = reset ? [] : prev;
      const map = new Map(base.map((p) => [p?._id, p]));

      incoming.forEach((post) => {
        if (post?._id) map.set(post._id, post);
      });

      return Array.from(map.values());
    });
  }, []);

  useEffect(() => {
    setPosts(buildPageFeed(rawPool));
  }, [rawPool, buildPageFeed]);

  const loadPosts = useCallback(
    async (pageToLoad = page, isInitial = false) => {
      if (!token) return;

      try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

      const res = await fetch(
        `${API_URL}/posts/paginated?page=${pageToLoad}&limit=10&includeAds=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

        const data = await res.json();
        if (!res.ok || !Array.isArray(data.posts)) {
          if (isInitial) setRawPool([]);
          return;
        }

        mergeIntoPool(data.posts, isInitial);
        setHasMore(Boolean(data.hasMore));
        setPage(pageToLoad);
      } catch (err) {
        console.error("Erreur chargement feed des pages", err);
      } finally {
        isInitial ? setLoading(false) : setLoadingMore(false);
      }
    },
    [API_URL, mergeIntoPool, page, token]
  );

  useEffect(() => {
    loadPosts(1, true);
  }, [loadPosts]);

  const handleScroll = useCallback(() => {
    if (!hasMore || loadingMore) return;

    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 300
    ) {
      loadPosts(page + 1);
    }
  }, [hasMore, loadingMore, loadPosts, page]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const addOptimisticPost = (post) => {
    if (!post) return;
    mergeIntoPool([post]);
  };

  const replaceOptimisticPost = (tempId, savedPost) => {
    if (!tempId || !savedPost) return;
    mergeIntoPool([{ ...savedPost }]);
  };

  const removeOptimisticPost = (tempId) => {
    if (!tempId) return;
    setRawPool((prev) => prev.filter((p) => p._id !== tempId));
  };

  const handleLike = async (post) => {
    try {
      const res = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      setRawPool((prev) =>
        prev.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: data.liked
                  ? [...(p.likes || []), "you"]
                  : (p.likes || []).filter((id) => id !== "you"),
              }
            : p
        )
      );
    } catch (err) {
      console.error("Erreur like", err);
    }
  };

  const handleShare = async (post) => {
    if (!post?._id || sharingPostIds[post._id]) return;

    setSharingPostIds((prev) => ({ ...prev, [post._id]: true }));

    try {
      const result = await sharePost(post._id);
      if (result?.success) {
        alert("Publication partagée sur votre profil.");
      }
    } catch (err) {
      console.error("Erreur partage", err);
      alert("Le partage a échoué. Veuillez réessayer.");
    } finally {
      setSharingPostIds((prev) => {
        const next = { ...prev };
        delete next[post._id];
        return next;
      });
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRawPool((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch (err) {
      console.error("Erreur suppression post", err);
    }
  };

  const openCommentsModal = (post) => {
    setActivePostForComments(post);
    setIsCommentsModalOpen(true);
  };

  const closeCommentsModal = () => {
    setActivePostForComments(null);
    setIsCommentsModalOpen(false);
  };

  const resolveMediaUrl = (media) => {
    if (!media?.url && !media?.previewUrl) return null;

    const candidate = media.previewUrl || media.url;
    if (media.isLocal || candidate?.startsWith("blob:")) return candidate;

    return getImageUrl(candidate);
  };

  const isPostPublic = (post) =>
    Boolean(
      post?.privacy === "public" ||
        post?.visibility === "public" ||
        post?.audience === "public" ||
        post?.isPublic === true ||
        (!post?.privacy && !post?.visibility && post?.isPublic !== false)
    );

  const canSponsorPost = (post) => {
    if (!post) return false;
    const isAuthor = String(post.user?._id) === String(userId);
    const pageOwnerId = post.page?.owner?._id || post.page?.owner || post.pageOwnerId;
    const pageAdminIds = Array.isArray(post.page?.admins)
      ? post.page.admins
          .map((admin) => admin?._id || admin)
          .filter(Boolean)
          .map(String)
      : [];
    const isPageOwner = Boolean(
      (pageOwnerId && String(pageOwnerId) === String(userId)) ||
        pageAdminIds.includes(String(userId))
    );

    return (isAuthor || isPageOwner) && !post.isSponsored && isPostPublic(post);
  };

  const resetSponsorForm = () => {
    setBudgetTotal("");
    setBudgetDaily("");
    setStartDate("");
    setEndDate("");
  };

  const closeSponsorModal = () => {
    setSponsorModalPost(null);
    resetSponsorForm();
    setSponsorError("");
  };

  const handleSponsorSubmit = async (e) => {
    e.preventDefault();
    if (!sponsorModalPost?._id) return;
    if (!token) {
      setSponsorError("Connexion requise pour sponsoriser.");
      return;
    }

    setSponsorError("");
    setSponsorLoading(true);

    try {
      const res = await fetch(`${API_URL}/ads/create/${sponsorModalPost._id}`, {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Impossible de lancer la campagne.");
      }

      setPosts((prev) =>
        prev.map((p) =>
          p._id === sponsorModalPost._id ? { ...p, isSponsored: true } : p
        )
      );

      closeSponsorModal();
      setSponsorToast("Campagne lancée");
      setTimeout(() => setSponsorToast(""), 3500);
    } catch (err) {
      setSponsorError(err.message || "Erreur inconnue");
    } finally {
      setSponsorLoading(false);
    }
  };

  const textButtonStyle = useMemo(
    () => ({
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      color: "inherit",
      font: "inherit",
      cursor: "pointer",
    }),
    []
  );

  return (
    <div className="fb-feed">
      <CreatePostFB
        onOptimisticPost={addOptimisticPost}
        onPostCreated={replaceOptimisticPost}
        onPostError={removeOptimisticPost}
      />

      <StoriesFB />

      {loading && [...Array(4)].map((_, i) => <SkeletonPost key={i} />)}

      {!loading &&
        posts.map((post) => {
          const isPagePost = post.authorType === "page" || Boolean(post.page);
          const postAvatarStyle = getAvatarStyle(
            isPagePost ? post.page?.avatar : post.user?.avatar
          );
          const authorProfilePath = isPagePost
            ? post.page?.slug
              ? `/pages/${post.page.slug}`
              : null
            : post.user?._id
            ? `/profil/${post.user._id}`
            : null;
          const displayName = isPagePost ? post.page?.name : post.user?.name;
          const likes = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;
          const canSponsor = canSponsorPost(post);
          const isSponsored = Boolean(post.isSponsored);

          return (
            <article key={post._id} className="fb-post">
              <div className="fb-post-header">
                <button
                  type="button"
                  className="fb-post-avatar avatar-link"
                  style={postAvatarStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (authorProfilePath) nav(authorProfilePath);
                  }}
                  aria-label="Ouvrir le profil"
                />
                <div className="fb-post-user">
                  <div className="fb-post-author">{displayName}</div>
                  <div className="fb-post-meta">
                    {new Date(post.createdAt).toLocaleString()}
                    {isSponsored && (
                      <span className="fb-sponsored-badge">Sponsorisé</span>
                    )}
                  </div>
                </div>
                <button
                  className="fb-post-menu-btn"
                  onClick={() => {
                    if (window.confirm("Supprimer la publication ?")) {
                      handleDeletePost(post._id);
                    }
                  }}
                >
                  ⋮
                </button>
              </div>

              {post.text && (
                <div className="fb-post-text">
                  <TextClamp text={post.text} className="text-content" />
                </div>
              )}

              {post.media?.length > 0 && (
                <div
                  className={
                    post.media.length === 1
                      ? "fb-post-media-wrapper fb-post-media-wrapper--single"
                      : "fb-post-media-wrapper fb-post-media-wrapper--multi"
                  }
                >
                  {post.media.map((m, idx) => {
                    const mediaUrl = resolveMediaUrl(m);
                    const isVideo =
                      (m.type && m.type.startsWith("video")) ||
                      /(mp4|webm|mov)$/i.test(m.url || "");

                    if (!mediaUrl) return null;

                    return (
                      <div key={idx} className="fb-post-media">
                        <MediaRenderer
                          media={m}
                          src={mediaUrl}
                          type={m.type}
                          mimeType={m.mimeType}
                          mediaClassName={
                            isVideo ? "fb-post-video" : "fb-post-image"
                          }
                          className="fb-post-media-renderer"
                          alt=""
                          muted={isVideo}
                          autoPlay={m.autoPlay}
                        />

                        {post.media.length > 4 &&
                          idx === 3 && (
                            <div className="fb-post-media-more">
                              +{post.media.length - 4}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="fb-post-stats">
                <div className="fb-post-stats-left">
                  {likes > 0 && (
                    <>
                      <span className="fb-reactions-bubble">
                        <FBIcon name="like" size={14} />
                      </span>
                      <button
                        type="button"
                        className="fb-post-stats-text"
                        style={textButtonStyle}
                      >
                        {likes} j’aime
                      </button>
                    </>
                  )}
                </div>

                <div className="fb-post-stats-right">
                  <button
                    type="button"
                    className="fb-post-stats-text fb-comments-link"
                    style={textButtonStyle}
                    onClick={() => openCommentsModal(post)}
                  >
                    {commentsCount} commentaires
                  </button>
                </div>
              </div>

              <div className="fb-post-actions">
                <button
                  className="fb-post-action-btn"
                  onClick={() => handleLike(post)}
                >
                  <FBIcon name="like" size={18} /> J’aime
                </button>

                <button
                  className="fb-post-action-btn"
                  onClick={() => openCommentsModal(post)}
                >
                  <FBIcon name="comment" size={18} /> Commenter
                </button>

                <button
                  className="fb-post-action-btn"
                  disabled={sharingPostIds[post._id]}
                  onClick={() => handleShare(post)}
                >
                  <FBIcon name="share" size={18} />
                  {sharingPostIds[post._id] ? "Partage…" : "Partager"}
                </button>

                {canSponsor && (
                  <button
                    className="fb-post-action-btn fb-sponsor-menu"
                    onClick={() => {
                      setSponsorModalPost(post);
                      setSponsorError("");
                      resetSponsorForm();
                    }}
                  >
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
              </div>
            </article>
          );
        })}

      {loadingMore && <SkeletonPost />}

      {isCommentsModalOpen && activePostForComments && (
        <CommentsModal
          post={activePostForComments}
          onClose={closeCommentsModal}
        />
      )}

      {sponsorModalPost && (
        <div className="fb-sponsor-modal-overlay" onClick={closeSponsorModal}>
          <div
            className="fb-sponsor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-sponsor-modal-header">
              <div className="fb-sponsor-title">Sponsoriser la publication</div>
              <button
                type="button"
                className="fb-sponsor-close"
                onClick={closeSponsorModal}
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
                  onClick={closeSponsorModal}
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
    </div>
  );
}

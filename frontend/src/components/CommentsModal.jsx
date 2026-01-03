import { API_URL } from "../api/config";
// CommentsModal.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/comments-modal.css";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";

const REACTION_CONFIG = {
  like: { label: "J’aime", emoji: "👍" },
  love: { label: "J’adore", emoji: "❤️" },
  care: { label: "Solidaire", emoji: "🤗" },
  haha: { label: "Haha", emoji: "😂" },
  wow: { label: "Wouah", emoji: "😮" },
  sad: { label: "Triste", emoji: "😢" },
  angry: { label: "Grrr", emoji: "😡" },
};
const REACTION_TYPES = Object.keys(REACTION_CONFIG);

/* ----------------------------
   Simple Carousel component
   props:
     - items: array of {type: 'image'|'video', url}
     - maxHeight optional
----------------------------*/
function MediaCarousel({ items = [], maxHeight = "70vh" }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);
  if (!items || items.length === 0) return null;

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  const item = items[index];

  return (
    <div className="cm-post-media" role="group">
      {items.length > 1 && (
        <button className="cm-media-nav cm-media-prev" onClick={prev} aria-label="Précédent">‹</button>
      )}

      <div className="cm-media-current" style={{ maxHeight }}>
        {item.type === "video" ? (
          <video controls src={getImageUrl(item.url)} style={{ maxHeight, borderRadius: 14 }} />
        ) : (
          <img src={getImageUrl(item.url)} alt="" style={{ maxHeight, borderRadius: 14 }} loading="lazy" />
        )}
      </div>

      {items.length > 1 && (
        <button className="cm-media-nav cm-media-next" onClick={next} aria-label="Suivant">›</button>
      )}

      {items.length > 1 && (
        <div className="cm-media-counter">{index + 1} / {items.length}</div>
      )}
    </div>
  );
}

/* ----------------------------
   Utility: normalize media field
   comment.media may be a single object or an array
----------------------------*/
const normalizeMedia = (m) => {
  if (!m) return [];
  if (Array.isArray(m)) return m;
  // if m has url & type (single media object)
  if (m.url) return [m];
  return [];
};

/* ----------------------------
   Main component
----------------------------*/
export default function CommentsModal({
  post: initialPost,
  onClose,
  API_URL: propApiUrl,
  token: propToken,
  userId: propUserId,
  focusCommentId = null,
  focusReplyId = null,
  fromNotification = false,
  targetType = "post",
}) {
  const nav = useNavigate();
  const token = propToken || (typeof window !== "undefined" && localStorage.getItem("token"));
  const resolvedApiUrl = propApiUrl || API_URL || "";
  const commentBasePath = targetType === "page" ? "posts" : "posts";
  const buildPostUrl = (postId, suffix = "") =>
    `${resolvedApiUrl}/${commentBasePath}/${postId}${suffix}`;
  const resolvedUserId =
    propUserId ||
    (() => {
      try {
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.id || payload._id || payload.userId || null;
      } catch {
        return null;
      }
    })();

  const userId = resolvedUserId;

  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(true);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(12);

  const [commentInput, setCommentInput] = useState("");
  const [commentMedia, setCommentMedia] = useState(null);

  const [replyInput, setReplyInput] = useState({});
  const [replyMedia, setReplyMedia] = useState({});
  const [replyOpen, setReplyOpen] = useState({});
  const [showAllReplies, setShowAllReplies] = useState({});

  const [reactionMenu, setReactionMenu] = useState({ open: false, context: null, commentId: null, replyId: null });
  const [actionMenu, setActionMenu] = useState({ open: false, context: null, commentId: null, replyId: null });

  const [expandedMap, setExpandedMap] = useState({}); // "post" or commentId

  const commentsListRef = useRef(null);
  const commentsRefs = useRef({});
  const longPressTimer = useRef(null);
  const hasFocusedComment = useRef(false);
  const hasFocusedReply = useRef(false);

  useEffect(() => {
    hasFocusedComment.current = false;
    hasFocusedReply.current = false;
  }, [focusCommentId, focusReplyId]);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      if (!initialPost || !initialPost._id) {
        setPost(initialPost || null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(buildPostUrl(initialPost._id), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (abort) return;
        if (res.ok) {
          setPost(data.post || data);
        } else {
          setPost(initialPost);
        }
      } catch (err) {
        console.error("CommentsModal load error:", err);
        setPost(initialPost);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => { abort = true; };
  }, [initialPost && initialPost._id, API_URL, token, commentBasePath]);

  useEffect(() => {
    // ensure visibleCommentsCount not larger than total
    setVisibleCommentsCount((v) => Math.min(v, (post?.comments?.length || 0)));
  }, [post?.comments?.length]);

  useEffect(() => {
    if (!fromNotification || (!focusCommentId && !focusReplyId)) return;
    const total = post?.comments?.length || 0;
    if (total <= 0) return;
    setVisibleCommentsCount((v) => Math.max(v, total));
  }, [fromNotification, focusCommentId, focusReplyId, post?.comments?.length]);

  useEffect(() => {
    if (!fromNotification || !focusCommentId) return;
    if (loading) return;
    if (focusReplyId) return;

    const timer = setTimeout(() => {
      if (hasFocusedComment.current) return;
      const commentEl = document.getElementById(`comment-${focusCommentId}`);
      if (!commentEl) return;
      hasFocusedComment.current = true;
      commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
      commentEl.classList.add("comment-highlight");
      setTimeout(() => commentEl.classList.remove("comment-highlight"), 2500);
    }, 400);

    return () => clearTimeout(timer);
  }, [fromNotification, focusCommentId, loading, post?.comments?.length]);

  useEffect(() => {
    if (!fromNotification || !focusReplyId) return;
    if (loading) return;

    const commentIdForReply =
      focusCommentId ||
      post?.comments?.find((comment) =>
        (comment.replies || []).some((reply) => String(reply._id) === String(focusReplyId))
      )?._id;

    if (commentIdForReply) {
      setShowAllReplies((prev) => ({ ...prev, [commentIdForReply]: true }));
    }

    const timer = setTimeout(() => {
      if (hasFocusedReply.current) return;
      const replyEl = document.getElementById(`reply-${focusReplyId}`);
      if (!replyEl) return;
      hasFocusedReply.current = true;
      replyEl.scrollIntoView({ behavior: "smooth", block: "center" });
      replyEl.classList.add("reply-highlight");
      setTimeout(() => replyEl.classList.remove("reply-highlight"), 2500);
    }, 500);

    return () => clearTimeout(timer);
  }, [fromNotification, focusReplyId, focusCommentId, loading, post?.comments]);

  const safeFetch = useCallback((url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  }, [token]);

  const isOwner = useCallback((objUserId) => String(objUserId) === String(userId), [userId]);

  const openReactionMenu = (context, commentId, replyId = null) => {
    setReactionMenu({ open: true, context, commentId, replyId });
    setActionMenu({ open: false, context: null, commentId: null, replyId: null });
  };

  const toggleReactionMenu = (context, commentId, replyId = null) => {
    setReactionMenu((prev) => {
      const same = prev.open && prev.context === context && prev.commentId === commentId && prev.replyId === replyId;
      return same ? { open: false, context: null, commentId: null, replyId: null } : { open: true, context, commentId, replyId };
    });
    setActionMenu({ open: false, context: null, commentId: null, replyId: null });
  };

  const startLongPress = (callback) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      callback();
    }, 520);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleActionMenu = (context, commentId, replyId = null) => {
    setActionMenu((prev) => {
      const same = prev.open && prev.context === context && prev.commentId === commentId && prev.replyId === replyId;
      return same ? { open: false, context: null, commentId: null, replyId: null } : { open: true, context, commentId, replyId };
    });
    setReactionMenu({ open: false, context: null, commentId: null, replyId: null });
  };

  const getVisibleComments = () => {
    const comments = post?.comments || [];
    if (!comments.length) return [];
    const start = Math.max(0, comments.length - visibleCommentsCount);
    return comments.slice(start);
  };

  const showMoreComments = () => {
    setVisibleCommentsCount((v) => Math.min((post?.comments?.length || 0), v + 12));
    setTimeout(() => {
      commentsListRef.current?.scrollTo({ top: commentsListRef.current.scrollHeight, behavior: "smooth" });
    }, 80);
  };

  const handleCommentMedia = (e) => {
    const f = e.target.files[0];
    if (f) setCommentMedia(f);
  };

  const submitComment = async () => {
    const text = (commentInput || "").trim();
    if (!text && !commentMedia) return;
    try {
      const headers = {};
      let body;
      if (commentMedia) {
        body = new FormData();
        body.append("text", text);
        body.append("media", commentMedia);
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ text });
      }
      const res = await safeFetch(buildPostUrl(post._id, "/comment"), {
        method: "POST",
        headers,
        body,
      });
      const updated = await res.json();
      if (!res.ok) throw new Error("comment failed");
      setPost(updated);
      setCommentInput("");
      setCommentMedia(null);
      setVisibleCommentsCount((c) => Math.max(c, (updated.comments || []).length));
      setTimeout(() => commentsListRef.current?.scrollTo({ top: commentsListRef.current.scrollHeight, behavior: "smooth" }), 120);
    } catch (err) {
      console.error("submitComment", err);
    }
  };

  const handleReplyMedia = (e, comment) => {
    const f = e.target.files[0];
    if (f) setReplyMedia((p) => ({ ...p, [comment._id]: f }));
  };

  const submitReply = async (comment) => {
    const text = (replyInput[comment._id] || "").trim();
    const file = replyMedia[comment._id] || null;
    if (!text && !file) return;
    try {
      const headers = {};
      let body;
      if (file) {
        body = new FormData();
        body.append("text", text);
        body.append("media", file);
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ text });
      }
      const res = await safeFetch(
        buildPostUrl(post._id, `/comment/${comment._id}/reply`),
        {
          method: "POST",
          headers,
          body,
        }
      );
      const updated = await res.json();
      if (!res.ok) throw new Error("reply failed");
      setPost(updated);
      setReplyInput((p) => ({ ...p, [comment._id]: "" }));
      setReplyMedia((p) => ({ ...p, [comment._id]: null }));
      setReplyOpen((p) => ({ ...p, [comment._id]: false }));
    } catch (err) {
      console.error("submitReply", err);
    }
  };

  const deleteComment = async (comment) => {
    try {
      const res = await safeFetch(buildPostUrl(post._id, `/comment/${comment._id}`), { method: "DELETE" });
      const updated = await res.json();
      if (!res.ok) throw new Error("deleteComment failed");
      setPost(updated);
      setActionMenu({ open: false, context: null, commentId: null, replyId: null });
    } catch (err) {
      console.error("deleteComment", err);
    }
  };

  const deleteReply = async (comment, reply) => {
    try {
      const replyId = reply._id || reply.id;
      const res = await safeFetch(
        buildPostUrl(post._id, `/comment/${comment._id}/reply/${replyId}`),
        { method: "DELETE" }
      );
      const updated = await res.json();
      if (!res.ok) throw new Error("deleteReply failed");
      setPost(updated);
      setActionMenu({ open: false, context: null, commentId: null, replyId: null });
    } catch (err) {
      console.error("deleteReply", err);
    }
  };

  const reactToComment = async (comment, type) => {
    try {
      const res = await safeFetch(buildPostUrl(post._id, `/comment/${comment._id}/react`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error("react failed");
      setPost(updated);
      setReactionMenu({ open: false, context: null, commentId: null, replyId: null });
    } catch (err) {
      console.error("reactToComment", err);
    }
  };

  const reactToReply = async (comment, reply, type) => {
    try {
      const res = await safeFetch(
        buildPostUrl(post._id, `/comment/${comment._id}/reply/${reply._id}/react`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );
      const updated = await res.json();
      if (!res.ok) throw new Error("react failed");
      setPost(updated);
      setReactionMenu({ open: false, context: null, commentId: null, replyId: null });
    } catch (err) {
      console.error("reactToReply", err);
    }
  };

  const toggleExpanded = (key) => {
    setExpandedMap((p) => ({ ...p, [key]: !p[key] }));
    setTimeout(() => {
      const el = key === "post" ? document.querySelector(".cm-post-text") : commentsRefs.current[key];
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 320);
  };

  const getReactionSummary = (reactions = []) => {
    if (!reactions || reactions.length === 0) return { total: 0, types: [] };
    const counts = {};
    reactions.forEach((r) => { if (!r?.type) return; counts[r.type] = (counts[r.type] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    return { total: reactions.length, types: sorted.map(([t]) => t).slice(0,3) };
  };

  const handleClose = () => { onClose && onClose(); };

  if (!post) return null;

  const visibleComments = getVisibleComments();
  const isPagePost = post?.authorType === "page";
  const authorAvatar = isPagePost ? post?.page?.avatar : post?.user?.avatar;
  const authorName = isPagePost ? post?.page?.name : post?.user?.name;
  const pageProfilePath = post?.page?.slug ? `/pages/${post.page.slug}` : null;
  const authorProfilePath = post?.user?._id ? `/profil/${post.user._id}` : null;

  const handleProfileNavigate = (path) => {
    if (!path) return;
    nav(path);
  };

  return (
    <div className="cm-backdrop" onMouseDown={handleClose} role="dialog" aria-modal="true">
      <div className="cm-container" onMouseDown={(e) => e.stopPropagation()}>
        <button className="cm-close" aria-label="Fermer" onClick={handleClose}>✕</button>

        {/* LEFT: post preview */}
        <div className="cm-left">
          <div className="cm-post-header">
            <button
              type="button"
              className="cm-avatar avatar-link"
              style={getAvatarStyle(authorAvatar)}
              onClick={(event) => {
                event.stopPropagation();
                handleProfileNavigate(isPagePost ? pageProfilePath : authorProfilePath);
              }}
              aria-label="Ouvrir le profil"
            />
            <div className="cm-post-meta">
              <div className="cm-post-author">{authorName}</div>
              <div className="cm-post-date">{new Date(post.createdAt).toLocaleString()}</div>
            </div>
          </div>

          <div className={`cm-post-text-wrap ${expandedMap.post ? "expanded" : ""}`}>
            {post.text && (
              <>
                <div className="cm-post-text text-content">{post.text}</div>
                {post.text.length > 220 && (
                  <button className="cm-toggle-text" onClick={() => toggleExpanded("post")}>
                    {expandedMap.post ? "Voir moins" : "Voir plus"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Post media carousel */}
          <div style={{ marginBottom: 12 }}>
            <MediaCarousel items={post.media || []} maxHeight="56vh" />
          </div>
        </div>

        {/* RIGHT: comments */}
        <div className="cm-right">
          <div className="cm-right-header">
            <div className="cm-title">Commentaires ({post.comments?.length || 0})</div>
          </div>

          <div className="cm-comments" ref={commentsListRef}>
            { (post.comments?.length > visibleComments.length) && (
              <div className="cm-load-more-row">
                <button className="cm-load-more" onClick={showMoreComments}>
                  Voir {Math.min(visibleCommentsCount + 12, post.comments.length) - visibleCommentsCount} commentaires précédents
                </button>
              </div>
            )}

            { loading && [...Array(4)].map((_, i) => (
              <div key={i} className="cm-skeleton">
                <div className="cm-sk-avatar" />
                <div className="cm-sk-lines"><div className="cm-sk-line long" /><div className="cm-sk-line short" /></div>
              </div>
            )) }

            { !loading && visibleComments.map((c) => {
              const summary = getReactionSummary(c.reactions);
              const mediaItems = normalizeMedia(c.media);
              return (
                <div
                  className="cm-comment-wrap"
                  key={c._id}
                  id={`comment-${c._id}`}
                  ref={(el) => (commentsRefs.current[c._id] = el)}
                >
                  <div className="cm-comment">
                    <button
                      type="button"
                      className="cm-comment-avatar avatar-link"
                      style={getAvatarStyle(c.user?.avatar)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleProfileNavigate(c.user?._id ? `/profil/${c.user._id}` : null);
                      }}
                      aria-label="Ouvrir le profil"
                    />

                    <div className="cm-comment-body">
                      <div
                        className={`cm-comment-bubble ${expandedMap[c._id] ? "expanded" : ""}`}
                        onMouseDown={() => startLongPress(() => openReactionMenu("comment", c._id))}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                        onTouchStart={() => startLongPress(() => openReactionMenu("comment", c._id))}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                      >
                        <div className="cm-comment-author-row">
                          <span className="cm-comment-author">{c.user?.name}</span>
                          <span className="cm-comment-date muted">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="cm-comment-text comment-text">
                          {c.text}
                        </div>

                        {c.text?.length > 200 && (
                          <button className="cm-toggle-text small" onClick={() => toggleExpanded(c._id)}>
                            {expandedMap[c._id] ? "Voir moins" : "Voir plus"}
                          </button>
                        )}

                        {/* comment media (carousel if several) */}
                        { mediaItems.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <MediaCarousel items={mediaItems} maxHeight="240px" />
                          </div>
                        )}

                        {summary.total > 0 && (
                          <div className="cm-reaction-badge" aria-label={`Réactions (${summary.total})`}>
                            <div className="cm-reaction-icons">
                              {summary.types.map((t) => (
                                <span key={t} className="cm-reaction-icon">{REACTION_CONFIG[t]?.emoji || "👍"}</span>
                              ))}
                            </div>
                            <span className="cm-reaction-count">{summary.total}</span>
                          </div>
                        )}
                      </div>

                      <div className="cm-comment-actions-row">
                        <button className="cm-action" onClick={() => toggleReactionMenu("comment", c._id)}>
                          Réagir
                        </button>

                        <button className="cm-action" onClick={() => setReplyOpen((p) => ({ ...p, [c._id]: !p[c._id] }))}>
                          {replyOpen[c._id] ? "Annuler" : "Répondre"}
                        </button>

                        {isOwner(c.user?._id) && (
                          <button className="cm-action" onClick={() => toggleActionMenu("comment", c._id)}>⋮</button>
                        )}
                      </div>

                      {/* reaction picker */}
                      {reactionMenu.open && reactionMenu.context === "comment" && reactionMenu.commentId === c._id && (
                        <div className="cm-reaction-picker">
                          {REACTION_TYPES.map((t) => (
                            <button
                              key={t}
                              className="cm-reaction-pill"
                              onClick={() => reactToComment(c, t)}
                              aria-label={REACTION_CONFIG[t].label}
                              title={REACTION_CONFIG[t].label}
                            >
                              <span className="cm-reaction-emoji">{REACTION_CONFIG[t].emoji}</span>
                              <span className="cm-sr-only">{REACTION_CONFIG[t].label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* action dropdown */}
                      {actionMenu.open && actionMenu.context === "comment" && actionMenu.commentId === c._id && (
                        <div className="cm-dropdown">
                          <button className="danger" onClick={() => deleteComment(c)}>Supprimer</button>
                        </div>
                      )}

                      {/* reply input */}
                      {replyOpen[c._id] && (
                        <div className="cm-reply-input-row">
                          <label className="cm-upload-btn">
                            📎
                            <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => handleReplyMedia(e, c)} />
                          </label>

                          <div className="cm-input-wrapper cm-reply-input-wrapper">
                            <input
                              value={replyInput[c._id] || ""}
                              onChange={(e) => setReplyInput((p) => ({ ...p, [c._id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && submitReply(c)}
                              placeholder="Écrire une réponse..."
                              className="cm-reply-input"
                            />

                            <button
                              type="button"
                              className="cm-send-btn inside"
                              aria-label="Envoyer la réponse"
                              onClick={() => submitReply(c)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20.75 4.5a1.25 1.25 0 0 0-1.34-.21l-15 6.5a1.25 1.25 0 0 0-.08 2.29l5.17 2.34 2.34 5.17a1.24 1.24 0 0 0 1.12.71h.06a1.25 1.25 0 0 0 1.11-.73l6.5-15a1.25 1.25 0 0 0-.88-1.87Zm-6.7 14.21-1.8-3.99 4.05-4.05a.75.75 0 0 0-1.06-1.06l-4.05 4.05-3.99-1.8 11.9-5.15Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* preview reply media */}
                      {replyMedia[c._id] && (
                        <div className="cm-reply-preview">
                          {replyMedia[c._id].type.startsWith("image/") ? (
                            <img className="cm-reply-preview-media" src={URL.createObjectURL(replyMedia[c._id])} alt="" loading="lazy" />
                          ) : (
                            <video className="cm-reply-preview-media" controls src={URL.createObjectURL(replyMedia[c._id])} />
                          )}
                        </div>
                      )}

                      {/* replies list */}
                      {(showAllReplies[c._id] ? c.replies : (c.replies || []).slice(-3)).map((r) => {
                        const sum = getReactionSummary(r.reactions);
                        return (
                          <div key={r._id} className="cm-reply" id={`reply-${r._id}`}>
                            <button
                              type="button"
                              className="cm-reply-avatar avatar-link"
                              style={getAvatarStyle(r.user?.avatar)}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleProfileNavigate(r.user?._id ? `/profil/${r.user._id}` : null);
                              }}
                              aria-label="Ouvrir le profil"
                            />
                            <div
                              className="cm-reply-body"
                              onMouseDown={() => startLongPress(() => openReactionMenu("reply", c._id, r._id))}
                              onMouseUp={cancelLongPress}
                              onMouseLeave={cancelLongPress}
                              onTouchStart={() => startLongPress(() => openReactionMenu("reply", c._id, r._id))}
                              onTouchEnd={cancelLongPress}
                              onTouchMove={cancelLongPress}
                            >
                              <div className="cm-reply-author">{r.user?.name} <span className="muted small"> {new Date(r.createdAt).toLocaleString()}</span></div>
                              <div className="cm-reply-text comment-text">
                                {r.text}
                              </div>

                              {r.media && (
                                <div className="cm-reply-media" style={{ marginTop: 8 }}>
                                  {normalizeMedia(r.media).map((m, i) => m.type === "image" ? <img key={i} src={getImageUrl(m.url)} alt="" loading="lazy" /> : <video key={i} controls src={getImageUrl(m.url)} />)}
                                </div>
                              )}

                              {sum.total > 0 && (
                                <div className="cm-reaction-badge" aria-label={`Réactions (${sum.total})`}>
                                  <div className="cm-reaction-icons">
                                    {sum.types.map((t) => (
                                      <span key={t} className="cm-reaction-icon">{REACTION_CONFIG[t]?.emoji || "👍"}</span>
                                    ))}
                                  </div>
                                  <span className="cm-reaction-count">{sum.total}</span>
                                </div>
                              )}

                              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                <button className="cm-action" onClick={() => toggleReactionMenu("reply", c._id, r._id)}>
                                  Réagir
                                </button>
                                {isOwner(r.user?._id) && <button className="cm-action" onClick={() => toggleActionMenu("reply", c._id, r._id)}>⋮</button>}
                              </div>

                              {reactionMenu.open && reactionMenu.context === "reply" && reactionMenu.commentId === c._id && reactionMenu.replyId === r._id && (
                                <div className="cm-reaction-picker" style={{ marginTop: 6 }}>
                                  {REACTION_TYPES.map((t) => (
                                    <button
                                      key={t}
                                      className="cm-reaction-pill"
                                      onClick={() => reactToReply(c, r, t)}
                                      aria-label={REACTION_CONFIG[t].label}
                                      title={REACTION_CONFIG[t].label}
                                    >
                                      <span className="cm-reaction-emoji">{REACTION_CONFIG[t].emoji}</span>
                                      <span className="cm-sr-only">{REACTION_CONFIG[t].label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {actionMenu.open && actionMenu.context === "reply" && actionMenu.commentId === c._id && actionMenu.replyId === r._id && (
                                <div className="cm-dropdown" style={{ marginTop: 6 }}>
                                  <button className="danger" onClick={() => deleteReply(c, r)}>Supprimer</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {c.replies?.length > 3 && !showAllReplies[c._id] && (
                        <span
                          className="cm-see-more-replies"
                          role="button"
                          tabIndex={0}
                          onClick={() => setShowAllReplies((p) => ({ ...p, [c._id]: true }))}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowAllReplies((p) => ({ ...p, [c._id]: true }))}
                        >
                          Voir plus de réponses
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) }
          </div>

          {/* Bottom input - inside right column (or bottom when mobile) */}
          <div className="cm-input-bar">
            {commentMedia && (
              <div className="cm-comment-preview">
                {commentMedia.type?.startsWith?.("image/") ? (
                  <img className="cm-comment-preview-media" src={URL.createObjectURL(commentMedia)} alt="" loading="lazy" />
                ) : (
                  <video className="cm-comment-preview-media" controls src={URL.createObjectURL(commentMedia)} />
                )}
              </div>
            )}

            <label className="cm-upload-btn">
              📎
              <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleCommentMedia} />
            </label>

            <div className="cm-input-wrapper">
              <input
                className="cm-text-input"
                placeholder="Écrire un commentaire..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />

              <button
                type="button"
                className="cm-send-btn inside"
                aria-label="Envoyer le commentaire"
                onClick={submitComment}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.75 4.5a1.25 1.25 0 0 0-1.34-.21l-15 6.5a1.25 1.25 0 0 0-.08 2.29l5.17 2.34 2.34 5.17a1.24 1.24 0 0 0 1.12.71h.06a1.25 1.25 0 0 0 1.11-.73l6.5-15a1.25 1.25 0 0 0-.88-1.87Zm-6.7 14.21-1.8-3.99 4.05-4.05a.75.75 0 0 0-1.06-1.06l-4.05 4.05-3.99-1.8 11.9-5.15Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

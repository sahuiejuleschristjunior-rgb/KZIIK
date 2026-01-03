// src/pages/FeedPage.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import LeftMenuDesktop from "../components/LeftMenuDesktop";
import RightMenu from "../components/MenuRight";
import MobileMenu from "../components/MobileMenu";
import CreatePostModal from "../components/CreatePostModal";
import CommentSection from "../components/CommentSection";
import { sharePost } from "../api/posts";
import TextClamp from "../components/TextClamp";

import "./feed.css";
import "../styles/menus.css";
import "../styles/stories.css";
import "../styles/comments.css";
import "../styles/notifications.css";

const API_BASE = import.meta.env.VITE_API_URL;

/* ========================================================= */
/* STORIES MOCK */
/* ========================================================= */
const storiesData = Array.from({ length: 50 }).map((_, i) => ({
  id: i + 1,
  name: "Utilisateur " + (i + 1),
  avatar: `https://i.pravatar.cc/100?img=${(i % 70) + 1}`,
  media: `https://images.pexels.com/photos/${1181671 + i}/pexels-photo-${
    1181671 + i
  }.jpeg`,
}));

/* ========================================================= */
/* DEMO POSTS */
/* ========================================================= */
const demoPosts = Array.from({ length: 10 }).map((_, i) => ({
  id: (i + 1).toString(),
  user: {
    _id: "local-user",
    name: ["KZIIK", "Orange CI", "Candidat en vue"][i % 3],
    avatar: null,
  },
  badge: ["Recommandé", "Entreprise vérifiée", "En tendance"][i % 3],
  time: `${i + 3} min`,
  title: ["Développeur Full Stack", "Chargé clientèle", "Community Manager"][i % 3],
  text: ["Texte du post…", "Texte du post…", "Texte du post…"][i % 3],
  tags: [["CDI"], ["CDD"], ["Marketing"]][i % 3],
  media:
    i % 3 === 0
      ? [
          {
            url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
            type: "image",
          },
        ]
      : i % 3 === 1
      ? [
          {
            url: "https://sample-videos.com/img/Sample-jpg-image-500kb.jpg",
            type: "image",
          },
          {
            url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
            type: "video",
          },
        ]
      : [],
  likes: [],
  comments: [],
}));

/* ========================================================= */
/* STORIES BAR */
/* ========================================================= */
function StoriesBar({ stories, onOpen }) {
  return (
    <div className="stories-bar">
      {stories.map((story, index) => (
        <div
          key={story.id}
          className="story-item"
          onClick={() => onOpen(index)}
        >
          <img src={story.avatar} className="story-avatar" alt={story.name} loading="lazy" />
          <p className="story-name">{story.name}</p>
        </div>
      ))}
    </div>
  );
}

/* ========================================================= */
/* MEDIA SLIDER */
/* ========================================================= */
function MediaSlider({ media = [] }) {
  if (!media.length) return null;

  return (
    <div className="media-slider">
      {media.map((m, idx) => (
        <div className="media-frame" key={idx}>
          {m.type === "video" ? (
            <video className="media-content" controls>
              <source src={m.url} />
            </video>
          ) : (
            <img className="media-content" src={m.url} alt={`media-${idx}`} loading="lazy" />
          )}
        </div>
      ))}
    </div>
  );
}
/* ========================================================= */
/* STORY VIEWER */
/* ========================================================= */
function StoryViewer({ stories, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  const current = stories[index];

  useEffect(() => {
    setProgress(0);

    intervalRef.current = setInterval(() => {
      if (!paused) {
        setProgress((p) => {
          if (p >= 100) {
            if (index < stories.length - 1) setIndex(index + 1);
            else onClose();
            return 0;
          }
          return p + 1;
        });
      }
    }, 60);

    return () => clearInterval(intervalRef.current);
  }, [index, paused, onClose, stories.length]);

  return (
    <div className="story-viewer">
      <div className="story-progress">
        {stories.map((_, i) => (
          <div key={i} className="story-progress-segment">
            <div
              className="story-progress-fill"
              style={{
                width:
                  i < index ? "100%" : i === index ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="story-touch-zone left"
        onClick={() => index > 0 && setIndex(index - 1)}
      />
      <div
        className="story-touch-zone right"
        onClick={() => index < stories.length - 1 && setIndex(index + 1)}
      />

      <img src={current.media} className="story-media" alt="story" loading="lazy" />

      <button className="story-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

/* ========================================================= */
/* FEED PAGE */
/* ========================================================= */
export default function FeedPage() {
  const nav = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);
  const postsRef = useRef([]);

  const [posts, setPosts] = useState([]);
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [sharingPostIds, setSharingPostIds] = useState({});
  const lastFocusRef = useRef({ postId: null, commentId: null });

  const textButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  };

  const token = localStorage.getItem("token");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  /* ========================================================= */
  /* FETCH POSTS — TOKEN FIXÉ + BEARER OK */
  /* ========================================================= */
  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }

    if (initialLoadDoneRef.current) return;

    fetchPosts();
  }, [token, nav]);

  const focusCommentBox = (postId) => {
    const box = document.querySelector(`#comment-box-${postId}`);
    box?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => box?.focus(), 150);
  };

  const fetchPosts = async () => {
    const isInitialLoad = !initialLoadDoneRef.current;

    if (isInitialLoad && !loading) setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        if (!initialLoadDoneRef.current) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          nav("/login");
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const nextPosts = Array.isArray(data) ? data : [];
        setPosts(() => {
          postsRef.current = nextPosts;
          return nextPosts;
        });
      } else if (isInitialLoad && postsRef.current.length === 0) {
        setPosts(() => {
          postsRef.current = demoPosts;
          return demoPosts;
        });
      }
    } catch {
      if (isInitialLoad && postsRef.current.length === 0) {
        setPosts(() => {
          postsRef.current = demoPosts;
          return demoPosts;
        });
      }
    } finally {
      if (isInitialLoad) {
        initialLoadDoneRef.current = true;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    if (loading) return;

    const focusPostId = location.state?.focusPostId;
    if (!focusPostId) return;

    const focusCommentId = location.state?.focusCommentId || null;
    const lastFocus = lastFocusRef.current;
    if (
      String(lastFocus.postId) === String(focusPostId) &&
      String(lastFocus.commentId) === String(focusCommentId)
    ) {
      return;
    }

    lastFocusRef.current = { postId: focusPostId, commentId: focusCommentId };

    const scrollToTarget = () => {
      const postElement = document.getElementById(`post-${focusPostId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (focusCommentId) {
        const commentElement =
          document.getElementById(`comment-${focusCommentId}`) ||
          document.getElementById(`reply-${focusCommentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      const commentBox = document.getElementById(`comment-box-${focusPostId}`);
      if (commentBox) {
        commentBox.focus();
      }
    };

    const timer = setTimeout(scrollToTarget, 200);
    return () => clearTimeout(timer);
  }, [loading, location.state]);
  /* ========================================================= */
  /* ACTIONS : CREATE / DELETE / LIKE / COMMENT FIXÉES         */
  /* ========================================================= */

  const handleCreatePost = async (payload) => {
    try {
      const fd = new FormData();
      fd.append("text", payload.text || "");

      const allFiles = [
        ...(payload.images || []),
        ...(payload.videos || []),
        ...(payload.audios || []),
        ...(payload.pdfs || []),
      ];

      allFiles.forEach((file) => fd.append("files", file));

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        alert(data?.message || "Erreur création post");
        return;
      }

      setPosts((p) => [data.post || data, ...p]);
    } catch {
      alert("Erreur réseau publication");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Confirmer suppression ?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setPosts((p) => p.filter((x) => (x._id || x.id) !== postId));
      } else {
        alert("Erreur suppression");
      }
    } catch {
      alert("Erreur réseau suppression");
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      const liked = data?.liked;
      const userId = currentUser?._id;

      setPosts((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) !== postId) return p;

          const hasLike = p.likes?.includes(userId);
          let newLikes = p.likes || [];

          if (liked && !hasLike) newLikes = [...newLikes, userId];
          if (!liked && hasLike)
            newLikes = newLikes.filter((id) => id !== userId);

          return { ...p, likes: newLikes };
        })
      );
    } catch {}
  };

  const handleShare = async (postId) => {
    if (!postId || sharingPostIds[postId]) return;

    setSharingPostIds((prev) => ({ ...prev, [postId]: true }));

    try {
      const result = await sharePost(postId);
      if (result?.success) {
        alert("Publication partagée sur votre profil.");
      }
    } catch (err) {
      console.error("Erreur partage post", err);
      alert("Impossible de partager cette publication.");
    } finally {
      setSharingPostIds((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleCommentSubmit = async (postId, text, parent = null) => {
    if (!text.trim()) return;

    try {
      const url = parent
        ? `${API_BASE}/api/posts/${postId}/comment/${parent}/reply`
        : `${API_BASE}/api/posts/${postId}/comment`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/posts/${postId}/comment/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };

  const handleDeleteReply = async (commentId, replyId, postId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/posts/${postId}/comment/${commentId}/reply/${replyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };
  /* ========================================================= */
  /* FILTER POSTS */
  /* ========================================================= */
  const filteredPosts = posts.filter((post) => {
    const q = search.toLowerCase();
    return (
      post.text?.toLowerCase().includes(q) ||
      post.user?.name?.toLowerCase().includes(q) ||
      post.title?.toLowerCase().includes(q)
    );
  });

  /* ========================================================= */
  /* RENDER POSTS STYLE FACEBOOK                              */
  /* ========================================================= */
  const renderFeedPosts = () => (
    <div className="feed-posts">
      {filteredPosts.map((post) => {
        const id = post._id || post.id;
        const createdAt = post.createdAt
          ? new Date(post.createdAt).toLocaleString()
          : post.time;

        const likesCount = post.likes?.length || 0;
        const commentsCount = (post.comments || []).length;

        return (
          <article key={id} id={`post-${id}`} className="feed-post-card">
            {/* --- HEADER --- */}
            <div className="feed-post-header">
              <button
                type="button"
                className="feed-post-avatar avatar-link"
                style={
                  post.user?.avatar
                    ? {
                        backgroundImage: `url(${post.user.avatar})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
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

              <div style={{ flex: 1 }}>
                <div className="feed-post-author">
                  {post.user?.name || "Utilisateur"}
                </div>
                <div className="feed-post-meta">
                  <span>{createdAt}</span>
                </div>
              </div>

              {/* Bouton menu */}
              <div className="menu-container">
                <button className="post-menu-btn">⋯</button>
                <div className="fb-menu-popup">
                  <button onClick={() => handleDeletePost(id)}>Supprimer</button>
                </div>
              </div>
            </div>

            {/* TEXTE */}
            {post.text && (
              <div className="feed-post-text">
                {post.title && <strong>{post.title}</strong>}
                <TextClamp text={post.text} className="feed-text" />
              </div>
            )}

            {/* MÉDIAS */}
            <MediaSlider media={post.media} />

            {/* STATS */}
            <div className="feed-post-stats">
              <button
                type="button"
                style={textButtonStyle}
                onClick={() => nav(`/likes/${id}`)}
              >
                {likesCount} j’aime
              </button>
              <button
                type="button"
                style={textButtonStyle}
                onClick={() => focusCommentBox(id)}
              >
                {commentsCount} commentaires
              </button>
            </div>

            {/* ACTIONS */}
            <div className="fb-actions">
              <button className="fb-action-btn" onClick={() => handleLike(id)}>
                <i className="material-icons">thumb_up</i>
              </button>
              <button
                className="fb-action-btn"
                onClick={() => focusCommentBox(id)}
              >
                <i className="material-icons">chat</i>
              </button>
              <button
                className="fb-action-btn"
                disabled={sharingPostIds[id]}
                onClick={() => handleShare(id)}
              >
                <i className="material-icons">share</i>
                {sharingPostIds[id] ? " Partage…" : ""}
              </button>
            </div>

            {/* COMMENTAIRES */}
            <CommentSection
              post={post}
              onComment={(t) => handleCommentSubmit(id, t)}
              onReply={(cid, t) => handleCommentSubmit(id, t, cid)}
              onDeleteComment={(cid) => handleDeleteComment(cid, id)}
              onDeleteReply={(cid, rid) => handleDeleteReply(cid, rid, id)}
            />
          </article>
        );
      })}
    </div>
  );

  /* ========================================================= */
  /* RENDER GLOBAL PAGE                                        */
  /* ========================================================= */
  return (
    <div className="feed-wrapper">
      {/* MOBILE NAV */}
      <div className="mobile-navbar">
        <button className="nav-btn-round" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <div className="nav-title-pill">KZIIK</div>
        <button
          className="nav-btn-pill"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            nav("/login");
          }}
        >
          Déconnexion
        </button>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* DESKTOP HEADER */}
      <div className="desktop-header">
        <div className="desktop-header-left">
          <button className="nav-btn-round">☰</button>
          <div className="nav-title-pill">KZIIK</div>
        </div>

        <div className="desktop-header-right">
          <div className={`desktop-search ${inputFocused ? "focus" : ""}`}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onFocus={() => setInputFocused(true)}
              onBlur={() => !search && setInputFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="publish-btn desktop-only"
            onClick={() => setShowPostModal(true)}
          >
            <span className="material-icons">add</span> Publier
          </button>

          <button className="icon-btn">
            <span className="material-icons">notifications</span>
          </button>
          <button className="icon-btn">
            <span className="material-icons">chat</span>
          </button>
          <button className="icon-btn">
            <span className="material-icons">analytics</span>
          </button>

          <button
            className="logout-pill"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              nav("/login");
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* FEED MOBILE */}
      <main className="feed-main-mobile">
        <StoriesBar
          stories={storiesData}
          onOpen={(i) => {
            setStoryIndex(i);
            setShowStory(true);
          }}
        />
        {loading ? <div>Chargement…</div> : renderFeedPosts()}
      </main>

      {/* FEED DESKTOP */}
      <div className="desktop-layout">
        <div className="desktop-left">
          <LeftMenuDesktop />
        </div>

        <div className="desktop-center">
          <StoriesBar
            stories={storiesData}
            onOpen={(i) => {
              setStoryIndex(i);
              setShowStory(true);
            }}
          />
          {loading ? <div>Chargement…</div> : renderFeedPosts()}
        </div>

        <div className="desktop-right">
          <RightMenu />
        </div>
      </div>

      {/* BOTTOM BAR MOBILE */}
      <div className="mobile-bottom-bar">
        <button className="bottom-plus-btn" onClick={() => setShowPostModal(true)}>
          +
        </button>

        <div className={`bottom-input-wrapper ${inputFocused ? "expanded" : ""}`}>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onFocus={() => setInputFocused(true)}
            onBlur={() => !search && setInputFocused(false)}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {showStory && (
        <StoryViewer
          stories={storiesData}
          startIndex={storyIndex}
          onClose={() => setShowStory(false)}
        />
      )}

      {showPostModal && (
        <CreatePostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
}

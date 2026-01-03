// src/pages/FeedPage.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LeftMenu from "../components/LeftMenu";
import CreatePostModal from "../components/CreatePostModal";
import "../styles/menus.css";
import "../styles/stories.css";

const API_BASE = "";
const MEDIA_BASE = "https://emploisfacile.org"; // "" => même origine. Sinon: "https://emploisfacile.org"

// -----------------------------------------------------
// 50 STORIES MOCK
// -----------------------------------------------------
const storiesData = Array.from({ length: 50 }).map((_, i) => ({
  id: i + 1,
  name: "Utilisateur " + (i + 1),
  avatar: `https://i.pravatar.cc/100?img=${(i % 70) + 1}`,
  media: `https://images.pexels.com/photos/${1181671 + i}/pexels-photo-${
    1181671 + i
  }.jpeg`,
}));

// -----------------------------------------------------
// Fallback local si API down
// -----------------------------------------------------
const demoPosts = Array.from({ length: 10 }).map((_, i) => ({
  id: (i + 1).toString(),
  user: {
    _id: "local-user",
    name: ["EmploisFacile", "Orange CI", "Candidat en vue"][i % 3],
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

// -----------------------------------------------------
// Stories Bar
// -----------------------------------------------------
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

// -----------------------------------------------------
// Media slider
// -----------------------------------------------------
function MediaSlider({ media = [] }) {
  if (!media || media.length === 0) return null;
  return (
    <div
      className="media-slider"
      style={{ display: "flex", gap: 8, overflowX: "auto", padding: "6px 0" }}
    >
      {media.map((m, idx) => (
        <div
          key={idx}
          style={{
            minWidth: 280,
            maxWidth: 560,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {m.type === "video" ? (
            <video
              controls
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <source src={m.url} />
              Ton navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : (
            <img
              src={m.url}
              alt={`media-${idx}`}
              style={{ width: "100%", height: "auto", display: "block" }}
              loading="lazy"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------
// Story Viewer
// -----------------------------------------------------
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
  }, [index, paused, stories.length, onClose]);

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

// ========================================================================
// FEED PAGE PRINCIPAL
// ========================================================================
export default function FeedPage() {
  const nav = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);

  // current user
  const currentUser = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  // Chargement initial
  useEffect(() => {
    fetchPosts();
    const token = localStorage.getItem("token");
    if (!token) nav("/login");
  }, []);

  // ========================================================================
  // FETCH POSTS
  // ========================================================================
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts(demoPosts);
      }
    } catch (err) {
      console.error("fetchPosts err", err);
      setPosts(demoPosts);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // CRÉATION POST (réactif)
  // ========================================================================
  const handleCreatePost = async (payload) => {

    try {

      const fd = new FormData();

      fd.append("text", payload.text || "");



      const allFiles = [

        ...payload.images,

        ...payload.videos,

        ...payload.audios,

        ...payload.pdfs,

      ];




        return;

      }



      const newPost = await res.json();

      setPosts((p) => [newPost, ...p]);

    } catch (e) {

      console.error(e);

      alert("Erreur réseau lors de la publication");

    }

  };

  // ========================================================================
  // SUPPRESSION POST
  // ========================================================================
  const handleDeletePost = async (postId) => {
    if (!confirm("Confirmer suppression de la publication ?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`
      });
      if (res.ok) {
        setPosts((p) => p.filter((x) => x._id !== postId && x.id !== postId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur suppression");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau suppression");
    }
  };

  // ========================================================================
  // LIKE
  // ========================================================================
  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`
      });
      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      const liked = data?.liked;
      const userId = currentUser?._id || currentUser?.id;

      setPosts((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) !== postId) return p;
          if (!userId) return p;

          const hasLike = (p.likes || []).some(
            (id) => String(id) === String(userId)
          );

          let newLikes = p.likes || [];
          if (liked && !hasLike) newLikes = [...newLikes, userId];
          if (!liked && hasLike)
            newLikes = newLikes.filter((id) => String(id) !== String(userId));

          return { ...p, likes: newLikes };
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ========================================================================
  // COMMENTAIRES
  // ========================================================================
  const handleCommentSubmit = async (postId, text, parentCommentId = null) => {
    if (!text || !text.trim()) return;
    try {
      const url = parentCommentId
        ? `${API_BASE}/api/posts/${postId}/comment/${parentCommentId}/reply`
        : `${API_BASE}/api/posts/${postId}/comment`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur commentaire");
        return;
      }

      const updated = await res.json();

      setPosts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (updated._id || updated.id) ? updated : p
        )
      );
    } catch {
      alert("Erreur réseau commentaire");
    }
  };

  // ========================================================================
  // SHARE
  // ========================================================================
  const handleShare = async (postId) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié !");
    } catch {
      prompt("Copiez le lien :", shareUrl);
    }
  };

  // ========================================================================
  // FILTRE RECHERCHE
  // ========================================================================
  const filteredPosts = posts.filter((post) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const text = (post.text || "").toLowerCase();
    const userName = (post.user?.name || "").toLowerCase();
    const title = (post.title || "").toLowerCase();
    return text.includes(q) || userName.includes(q) || title.includes(q);
  });

  // ========================================================================
  // AFFICHAGE POSTS
  // ========================================================================
  const renderFeedPosts = () => (
    <div className="feed-posts">
      {filteredPosts.map((post) => {
        const id = post._id || post.id;
        const isAuthor =
          currentUser &&
          (currentUser.id === post.user?._id ||
            currentUser._id === post.user?._id ||
            currentUser.id === post.user);

        const createdAt = post.createdAt
          ? new Date(post.createdAt).toLocaleString()
          : post.time || "";

        return (
          <article key={id} className="feed-post-card">
            <div className="feed-post-header">
              <div className="feed-post-avatar" />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div className="feed-post-author">
                      {post.user?.name || "Utilisateur"}
                    </div>
                    <div className="feed-post-meta">
                      {post.badge && <span>{post.badge}</span>}
                      {(post.badge || createdAt) && (
                        <span className="dot">•</span>
                      )}
                      <span>{createdAt}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleShare(id)}>🔗</button>
                    <button onClick={() => handleLike(id)}>
                      👍 {post.likes?.length || 0}
                    </button>
                    {isAuthor && (
                      <button onClick={() => handleDeletePost(id)}>🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {post.title && (
              <div className="feed-post-title">{post.title}</div>
            )}
            <div className="feed-post-text">{post.text}</div>

            <MediaSlider media={post.media} />

            <CommentSection
              post={post}
              onComment={(t) => handleCommentSubmit(id, t)}
              onReply={(cid, t) => handleCommentSubmit(id, t, cid)}
            />
          </article>
        );
      })}
    </div>
  );

  // ========================================================================
  // RENDER PRINCIPAL
  // ========================================================================
  return (
    <div className="feed-wrapper">
      {/* NAV MOBILE */}
      <div className="mobile-navbar">
        <button className="nav-btn-round" onClick={() => setShowMenu(true)}>
          ☰
        </button>
        <div className="nav-title-pill">EmploisFacile</div>
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

      {/* HEADER DESKTOP */}
      <div className="desktop-header">
        <div className="desktop-header-left">
          <button className="nav-btn-round">☰</button>
          <div className="nav-title-pill">EmploisFacile</div>
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
            <button className="desktop-search-btn">🔍</button>
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

      {/* POPUP MENU MOBILE */}
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <LeftMenu />
          </div>
        </div>
      )}

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
          <LeftMenu />
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
          <div
            className="right-menu-box"
            style={{ position: "sticky", top: 110 }}
          >
            <h3 style={{ color: "white" }}>Publicités</h3>
          </div>
        </div>
      </div>

      {/* BARRE MOBILE BAS */}
      <div className="mobile-bottom-bar">
        <button
          className="bottom-plus-btn"
          onClick={() => setShowPostModal(true)}
        >
          +
        </button>

        <div
          className={`bottom-input-wrapper ${
            inputFocused ? "expanded" : ""
          }`}
        >
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onFocus={() => setInputFocused(true)}
            onBlur={() => !search && setInputFocused(false)}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="bottom-send-btn">↑</button>
        </div>
      </div>

      {/* STORY VIEWER */}
      {showStory && (
        <StoryViewer
          stories={storiesData}
          startIndex={storyIndex}
          onClose={() => setShowStory(false)}
        />
      )}

      {/* MODAL PUBLICATION — maintenant réactif */}
      {showPostModal && (
        <CreatePostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
}

// ========================================================================
// COMMENT SECTION
// ========================================================================
function CommentSection({ post, onComment, onReply }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            replyTo ? `Répondre à ${replyTo.name}` : "Ajouter un commentaire..."
          }
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            background: "#111",
            border: "1px solid #222",
            color: "white",
          }}
        />

        <button
          onClick={() => {
            if (!text.trim()) return;
            if (replyTo) onReply(replyTo.id, text);
            else onComment(text);
            setText("");
            setReplyTo(null);
          }}
        >
          Envoyer
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        {(post.comments || []).map((c) => (
          <div
            key={c._id || c.id}
            style={{
              padding: 8,
              borderRadius: 8,
              background: "#080808",
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{c.user?.name || "Utilisateur"}</strong>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleString()
                    : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() =>
                    setReplyTo({
                      id: c._id || c.id,
                      name: c.user?.name || "Utilisateur",
                    })
                  }
                >
                  Répondre
                </button>
              </div>
            </div>

            <div style={{ marginTop: 6 }}>{c.text}</div>

            <div style={{ marginTop: 8, marginLeft: 8 }}>
              {(c.replies || []).map((r) => (
                <div
                  key={r._id || r.id}
                  style={{
                    padding: 6,
                    borderRadius: 8,
                    background: "#0b0b0b",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <strong>{r.user?.name || "Utilisateur"}</strong>{" "}
                    <span style={{ color: "#888", fontSize: 12 }}>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>

                  <div style={{ marginTop: 4 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

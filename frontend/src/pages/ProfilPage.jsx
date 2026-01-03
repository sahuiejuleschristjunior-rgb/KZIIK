import { useEffect, useState, useId } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../components/Post";
import ProfilePhotoViewer from "../components/ProfilePhotoViewer";
import "../styles/profil.css";
import { filterHiddenPosts, rememberHiddenPost } from "../utils/hiddenPosts";

const API_URL = import.meta.env.VITE_API_URL;

/* ================================================
   FIX DES URL IMAGES / UPLOAD
================================================ */
const withCacheBuster = (url) => {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cb=${Date.now()}`;
};

const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  if (path.startsWith("/uploads")) {
    return `${API_URL.replace("/api", "")}${path}`;
  }

  return path;
};

export default function ProfilPage() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const { id: routeId } = useParams(); // 👈 ID DU PROFIL VISITÉ

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);
  const [coverKey, setCoverKey] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [viewerItems, setViewerItems] = useState([]);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  /* ================================================
     INIT LOAD
  ================================================ */
  const profileId = routeId || currentUser?._id;
  const avatarInputId = useId();
  const coverInputId = useId();

  useEffect(() => {
    if (!token) return nav("/login");
    if (!profileId) return;

    loadProfile(profileId);
    loadUserPosts(profileId);
  }, [profileId]); // 👈 recharge lors d'un changement d'URL

  useEffect(() => {
    setBioDraft(user?.bio || "");
  }, [user]);

  /* ================================================
     UPLOAD HANDLERS
  ================================================ */
  const handleUpload = async (file, endpoint, formField, stateField) => {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append(formField, file);

    setIsUploading(true);

    try {
      const res = await fetch(`${API_URL}/auth${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const nextValue = data[stateField] ?? data[formField];

        setUser((prev) => ({
          ...prev,
          [stateField]: (() => {
            const resolvedUrl = nextValue
              ? fixUrl(nextValue)
              : prev?.[stateField];
            const cacheSafeUrl = resolvedUrl ? withCacheBuster(resolvedUrl) : resolvedUrl;
            return cacheSafeUrl || prev?.[stateField];
          })(),
        }));

        if (stateField === "avatar") setAvatarKey(Date.now());
        if (stateField === "coverPhoto") setCoverKey(Date.now());
      } else {
        alert(data.error || "Erreur upload.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const f = e.target.files[0];
    if (f) handleUpload(f, "/profile/avatar", "avatar", "avatar");
  };

  const handleCoverChange = (e) => {
    const f = e.target.files[0];
    if (f) handleUpload(f, "/profile/cover", "cover", "coverPhoto");
  };

  const handleBioSave = async (e) => {
    e.preventDefault();
    if (!isOwner || savingBio) return;

    setSavingBio(true);

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bioDraft }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Impossible de mettre à jour la bio.");
        return;
      }

      if (data.user) {
        setUser((prev) => ({
          ...prev,
          ...data.user,
          avatar: fixUrl(data.user.avatar),
          coverPhoto: fixUrl(data.user.coverPhoto),
        }));
      }
    } catch (err) {
      console.error("BIO UPDATE ERROR", err);
      alert("Erreur serveur lors de la mise à jour de la bio.");
    } finally {
      setSavingBio(false);
    }
  };

  /* ================================================
     LOAD PROFILE (CORRECT ENDPOINT)
  ================================================ */
  const loadProfile = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await fetch(`${API_URL}/auth/user/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const payload = data?.user || data; // L'API renvoie soit { user }, soit directement l'utilisateur

      if (res.ok && payload) {
        setUser({
          ...payload,
          avatar: withCacheBuster(fixUrl(payload.avatar)),
          coverPhoto: withCacheBuster(fixUrl(payload.coverPhoto)),
        });
      }
    } catch (err) {
      console.error("PROFILE ERROR:", err);
    }
  };

  /* ================================================
     LOAD POSTS (CORRIGÉ)
  ================================================ */
  const loadUserPosts = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await fetch(
        `${API_URL}/posts/user/${targetId}?includeAds=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const list = await res.json();

      if (res.ok && Array.isArray(list)) {
        const normalized = list.map((p) => ({
          ...p,
          media: p.media?.map((m) => ({
            ...m,
            url: fixUrl(m.url),
          })),
        }));

        setPosts(filterHiddenPosts(normalized, currentUser?._id));
      }
    } catch (err) {
      console.error("POST ERROR:", err);
    }

    setLoading(false);
  };

  const handleHidePost = (postId) => {
    rememberHiddenPost(postId, currentUser?._id);
    setPosts((prev) => filterHiddenPosts(prev, currentUser?._id));
  };

  const photoItems = posts
    .flatMap((p) =>
      (p.media || [])
        .filter((m) => {
          if (!m?.url) return false;
          if (m.type) return m.type.startsWith("image");
          return /(png|jpe?g|webp|gif)$/i.test(m.url);
        })
        .map((m, idx) => ({ ...m, key: `${p._id || idx}-${idx}`, fromPost: p?._id }))
    )
    .slice(0, 30);

  useEffect(() => {
    setViewerItems(photoItems);
  }, [photoItems]);

  const thumbLimit = 9;
  const displayPhotoItems = photoItems.slice(0, thumbLimit);
  const remainingPhotos = Math.max(0, photoItems.length - displayPhotoItems.length);

  /* ================================================
     LOADING
  ================================================ */
  if (!user || loading) {
    return <div className="profil-loading">Chargement du profil…</div>;
  }

  const isOwner = currentUser?._id === profileId;

  const coverURL = user.coverPhoto || "/default-cover.jpg";
  const avatarURL = user.avatar || "/default-avatar.png";
  const bioText = user.bio?.trim() || "Aucune bio renseignée pour le moment.";
  const friendsCount = user.friends?.length ?? 0;
  const followersCount = user.followers?.length ?? 0;

  const formatCount = (value) => {
    if (value > 999) return `${(value / 1000).toFixed(1)}k`;
    return value;
  };

  const openPhotoViewer = (items = photoItems, startIdx = 0) => {
    const sourceItems = items?.length ? items : photoItems;
    if (!sourceItems.length) return;
    const safeIndex = Math.max(0, Math.min(startIdx, sourceItems.length - 1));
    setViewerItems(sourceItems);
    setActivePhotoIndex(safeIndex);
    setShowPhotoViewer(true);
  };

  /* ================================================
     RENDER
  ================================================ */
  return (
    <div className="profil-wrapper">
      {/* Hidden Upload Inputs */}
      {isOwner && (
        <>
          <input
            id={coverInputId}
            type="file"
            className="profil-file-input"
            accept="image/*"
            onChange={handleCoverChange}
            style={{ opacity: 0, pointerEvents: "none" }}
          />
          <input
            id={avatarInputId}
            type="file"
            className="profil-file-input"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ opacity: 0, pointerEvents: "none" }}
          />
        </>
      )}

      <div className="profil-hero">
        {/* COVER */}
        <div className="profil-cover">
          <img
            key={`${coverURL}-${coverKey}`}
            src={coverURL}
            alt="Couverture du profil"
            className="profil-cover-media"
            loading="lazy"
          />
          <div className="profil-cover-meta">Ratio 2.67:1 — 1200x450 px recommandé</div>
          {isOwner && (
            <label className="change-cover-btn" htmlFor={coverInputId}>
              Changer la couverture
            </label>
          )}
        </div>

        {/* HEADER */}
        <div className="profil-hero-row">
          <div className="profil-hero-main">
            <div
              key={`${avatarURL}-${avatarKey}`}
              className="profil-avatar"
              style={{ backgroundImage: `url(${avatarURL})` }}
            >
              {isOwner && (
                <label className="change-avatar-btn" htmlFor={avatarInputId}>
                  📷
                </label>
              )}
            </div>

            <div className="profil-title-block">
              <h1>{user.name}</h1>
              <p className="profil-stats">
                {formatCount(friendsCount)} amis | {formatCount(followersCount)} abonnés
              </p>

            </div>
          </div>

          <div className="profil-hero-actions">
            {isOwner ? (
              <>
                <button className="profil-btn primary" onClick={() => nav("/fb/settings")}>
                  Modifier le profil
                </button>
                <label className="profil-btn ghost" htmlFor={coverInputId}>
                  Mettre à jour la couverture
                </label>
                <button className="profil-btn" onClick={() => setActiveTab("about")}>
                  Modifier la bio
                </button>
              </>
            ) : (
              <>
                <button
                  className="profil-btn primary"
                  onClick={() => nav(`/messages?userId=${profileId}`)}
                >
                  Message
                </button>
                <button className="profil-btn ghost">Suivre</button>
                <button className="profil-btn">…</button>
              </>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="profil-tabs-bar">
          <div className="profil-tabs">
            <button
              className={activeTab === "posts" ? "active" : ""}
              onClick={() => setActiveTab("posts")}
            >
              Publications
            </button>

            <button
              className={activeTab === "about" ? "active" : ""}
              onClick={() => setActiveTab("about")}
            >
              À propos
            </button>

            <button
              className={activeTab === "photos" ? "active" : ""}
              onClick={() => setActiveTab("photos")}
            >
              Photos
            </button>
          </div>

          <div className="profil-tabs-actions">
            <button className="profil-btn ghost">…</button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="profil-content">
        {/* POSTS */}
        {activeTab === "posts" && (
          <div className="profil-grid">
            <div className="profil-col">
              <div className="profil-card intro-card">
                <h3>Intro</h3>
                <p className="profil-intro-text">{bioText}</p>
                {isOwner && (
                  <button className="profil-btn" onClick={() => setActiveTab("about")}>
                    Modifier les détails
                  </button>
                )}
              </div>

              <div className="profil-card profil-info-card">
                <h3>Informations</h3>
                <div className="profil-info-line">
                  <span role="img" aria-label="friends">
                    👥
                  </span>
                  <span>{formatCount(friendsCount)} amis</span>
                </div>
                <div className="profil-info-line">
                  <span role="img" aria-label="followers">
                    🌟
                  </span>
                  <span>{formatCount(followersCount)} abonnés</span>
                </div>
              </div>

              <div className="profil-card photos-card">
                <div className="profil-card-header">
                  <h3>Photos</h3>
                  {photoItems.length > 0 && (
                    <button className="profil-link" onClick={() => openPhotoViewer(photoItems, 0)}>
                      Afficher tout
                    </button>
                  )}
                </div>
                {photoItems.length === 0 ? (
                  <p className="profil-empty">Aucune photo pour le moment.</p>
                ) : (
                  <div className="profil-photo-grid">
                    {displayPhotoItems.map((m, idx) => {
                      const showOverlay = remainingPhotos > 0 && idx === displayPhotoItems.length - 1;

                      return (
                        <button
                          key={m.key}
                          className="profil-photo-thumb"
                          style={{ backgroundImage: `url(${m.url})` }}
                          onClick={() => openPhotoViewer(photoItems, idx)}
                          aria-label="Ouvrir la photo"
                        >
                          {showOverlay && <span className="profil-photo-overlay">+{remainingPhotos}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="profil-col">
              <div className="profil-posts">
                {posts.length === 0 ? (
                  <div className="profil-empty">Aucune publication.</div>
                ) : (
                  posts.map((p) => (
                    <Post
                      key={p._id}
                      post={p}
                      currentUser={currentUser}
                      onMediaClick={(items, start) => openPhotoViewer(items, start)}
                      onHidePost={handleHidePost}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="profil-about-grid">
            <div className="profil-card">
              <div className="profil-card-header">
                <h3>Biographie</h3>
                {!isOwner && <span className="profil-subtle">Présentation</span>}
              </div>
              {isOwner ? (
                <form className="profil-bio-form" onSubmit={handleBioSave}>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Parlez un peu de vous..."
                    rows={5}
                    maxLength={500}
                  />
                  <div className="profil-bio-actions">
                    <span className="profil-bio-hint">
                      {bioDraft?.trim().length || 0}/500 caractères
                    </span>
                    <button className="profil-btn primary" type="submit" disabled={savingBio}>
                      {savingBio ? "Enregistrement..." : "Mettre à jour"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="profil-intro-text">{bioText}</p>
              )}
            </div>

            <div className="profil-card profil-info-card">
              <h3>Informations</h3>
              <div className="profil-info-line">
                <span role="img" aria-label="friends">
                  👥
                </span>
                <span>{formatCount(friendsCount)} amis</span>
              </div>
              <div className="profil-info-line">
                <span role="img" aria-label="followers">
                  🌟
                </span>
                <span>{formatCount(followersCount)} abonnés</span>
              </div>
            </div>
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === "photos" && (
          <div className="profil-photos">
            <div className="profil-card">
              <div className="profil-card-header">
                <h3>Photos</h3>
                <span className="profil-subtle">{photoItems.length} photos</span>
              </div>
              {photoItems.length === 0 ? (
                <p className="profil-empty">Aucune photo publiée pour le moment.</p>
              ) : (
                <div className="profil-photo-grid large">
                  {photoItems.map((m, idx) => (
                    <button
                      key={m.key}
                      className="profil-photo-cell"
                      onClick={() => openPhotoViewer(photoItems, idx)}
                      aria-label={`Ouvrir la photo ${idx + 1}`}
                    >
                      <img src={m.url} alt="Publication" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPhotoViewer && (
        <ProfilePhotoViewer
          items={viewerItems}
          index={activePhotoIndex}
          onChangeIndex={setActivePhotoIndex}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </div>
  );
}

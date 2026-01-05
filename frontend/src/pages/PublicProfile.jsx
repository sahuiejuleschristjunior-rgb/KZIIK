import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../components/Post";
import RelationButton from "../components/social/RelationButton";
import ProfilePhotoViewer from "../components/ProfilePhotoViewer";
import FacebookLayout from "./FacebookLayout";
import "../styles/profil.css";
import { useAuth } from "../context/AuthContext";
import { filterHiddenPosts, rememberHiddenPost } from "../utils/hiddenPosts";
import useRelation from "../hooks/useRelation";
import { fetchInbox, sendMessagePayload } from "../api/messagesApi";
import { API_URL } from "../api/config";

const API_ROOT = API_URL;
const API_STATIC = API_URL.replace(/\/$/, "");

/* ================================================
   FIX URL IMAGES – VERSION PROPRE
================================================ */
const fixUrl = (path) => {
  if (!path) return "";

  if (path.startsWith("http://")) {
    return `https://${path.slice("http://".length)}`;
  }

  if (path.startsWith("https://")) return path;
  if (path.startsWith("/uploads")) return `${API_STATIC}${path}`;
  if (path.startsWith("uploads")) return `${API_STATIC}/${path}`;
  if (path.startsWith("/default")) return `${API_STATIC}/uploads${path}`;
  return `${API_STATIC}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user: authUser } = useAuth();

  const [user, setUser] = useState(null);     // Profil visité
  const [viewer, setViewer] = useState(null); // Utilisateur connecté
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerItems, setViewerItems] = useState([]);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageFeedback, setMessageFeedback] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFeedback, setMenuFeedback] = useState("");
  const menuRef = useRef(null);

  const viewerId = viewer?._id || authUser?._id;
  const relation = useRelation(id);

  /* ============================================================
      LOAD CONNECTED USER
  ============================================================ */
  useEffect(() => {
    if (authUser) {
      setViewer(authUser);
      return;
    }

    if (!token) return;

    fetch(`${API_ROOT}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => data?.user && setViewer(data.user))
      .catch(console.error);
  }, [authUser, token]);

  /* ============================================================
      LOAD PROFILE USER
  ============================================================ */
  useEffect(() => {
    fetch(`${API_ROOT}/auth/user/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        const payload = data?.user ?? data;

        if (!res.ok || !payload?._id) {
          throw new Error("Utilisateur introuvable");
        }

        setUser({
          ...payload,
          avatar: fixUrl(payload.avatar),
          coverPhoto: fixUrl(payload.coverPhoto),
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, token]);

  /* ============================================================
      LOAD POSTS
  ============================================================ */
  useEffect(() => {
    fetch(`${API_ROOT}/posts/user/${id}?includeAds=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((list) => {
        const normalized = Array.isArray(list)
          ? list.map((p) => ({
              ...p,
              media: p.media?.map((m) => ({
                ...m,
                url: fixUrl(m.url),
              })),
            }))
          : [];
        setPosts(filterHiddenPosts(normalized, viewerId));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, token]);

  const handleHidePost = (postId) => {
    rememberHiddenPost(postId, viewerId);
    setPosts((prev) => filterHiddenPosts(prev, viewerId));
  };

  useEffect(() => {
    if (!viewerId) return;
    setPosts((prev) => filterHiddenPosts(prev, viewerId));
  }, [viewerId]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleCopyProfileLink = async () => {
    if (!user?._id) return;
    const profileLink = `${window.location.origin}/profil/${user._id}`;
    try {
      await navigator.clipboard.writeText(profileLink);
      setMenuFeedback("Lien du profil copié.");
    } catch (err) {
      setMenuFeedback("Impossible de copier le lien.");
    } finally {
      setTimeout(() => setMenuFeedback(""), 2000);
      setMenuOpen(false);
    }
  };

  const handleShareProfile = async () => {
    if (!user?._id) return;
    const profileLink = `${window.location.origin}/profil/${user._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: user.name || "Profil",
          url: profileLink,
        });
        setMenuFeedback("Profil partagé.");
      } else {
        await navigator.clipboard.writeText(profileLink);
        setMenuFeedback("Lien du profil copié.");
      }
    } catch (err) {
      setMenuFeedback("Impossible de partager le profil.");
    } finally {
      setTimeout(() => setMenuFeedback(""), 2000);
      setMenuOpen(false);
    }
  };

  const photoItems = useMemo(
    () =>
      posts
        .flatMap((p) =>
          (p.media || [])
            .filter((m) => {
              if (!m?.url) return false;
              if (m.type) return m.type.startsWith("image");
              return /(png|jpe?g|webp|gif)$/i.test(m.url);
            })
            .map((m, idx) => ({
              ...m,
              url: fixUrl(m.url),
              key: `${p._id || idx}-${idx}`,
              fromPost: p?._id,
            }))
        )
        .slice(0, 30),
    [posts]
  );

  const profileMediaItems = useMemo(() => {
    const items = [];
    if (user?.coverPhoto) {
      items.push({
        url: user.coverPhoto,
        key: "profile-cover",
        kind: "cover",
      });
    }
    if (user?.avatar) {
      items.push({
        url: user.avatar,
        key: "profile-avatar",
        kind: "avatar",
      });
    }
    return items;
  }, [user]);

  useEffect(() => {
    setViewerItems(photoItems);
  }, [photoItems]);

  const isFriend = relation?.status?.isFriend;

  const sendProfileMessage = async () => {
    if (!user?._id) return;
    const trimmed = messageText.trim();

    if (!trimmed) {
      setMessageError("Le message ne peut pas être vide.");
      return;
    }

    if (trimmed.length > 500) {
      setMessageError("500 caractères maximum.");
      return;
    }

    setMessageError("");
    setMessageFeedback("");

    try {
      const { data } = await sendMessagePayload({
        receiver: user._id,
        content: trimmed,
      });

      if (data?.type === "request") {
        setMessageFeedback("Message envoyé comme demande.");
        setMessageModalOpen(false);
        setMessageText("");
      } else {
        setMessageFeedback("Conversation ouverte dans Messages.");
        navigate(`/messages?userId=${user._id}`);
      }
    } catch (err) {
      setMessageError("Impossible d'envoyer le message.");
    }
  };

  const hasExistingConversation = async () => {
    if (!user?._id || !viewerId) return false;

    try {
      const inboxData = await fetchInbox();
      const inbox = Array.isArray(inboxData)
        ? inboxData
        : Array.isArray(inboxData?.data)
        ? inboxData.data
        : [];

      return inbox.some((conversation) => {
        const participants = Array.isArray(conversation?.participants)
          ? conversation.participants
          : [];
        const participantIds = participants
          .map((participant) => participant?._id || participant)
          .filter(Boolean)
          .map((participantId) => String(participantId));

        return (
          participantIds.includes(String(user._id)) &&
          participantIds.includes(String(viewerId))
        );
      });
    } catch (err) {
      console.error("Erreur chargement conversations:", err);
      return false;
    }
  };

  const handleMessageClick = async () => {
    setMessageFeedback("");
    setMessageError("");

    if (isFriend) {
      navigate(`/messages?userId=${user._id}`);
      return;
    }

    const canOpenConversation = await hasExistingConversation();
    if (canOpenConversation) {
      navigate(`/messages?userId=${user._id}`);
      return;
    }

    setMessageModalOpen(true);
  };

  const renderContent = () => {
    if (loading || !user || !viewer) {
      return <div className="profil-loading">Chargement…</div>;
    }

    const isMe = String(viewer._id) === String(user._id);

    const openViewer = (items = photoItems, idx = 0) => {
      const sourceItems = items?.length ? items : photoItems;
      if (!sourceItems.length) return;
      const safeIndex = Math.max(0, Math.min(idx, sourceItems.length - 1));
      setViewerItems(sourceItems);
      setViewerIndex(safeIndex);
      setViewerOpen(true);
    };

    const openProfileMedia = (kind) => {
      const index = profileMediaItems.findIndex((item) => item.kind === kind);
      if (index < 0) return;
      openViewer(profileMediaItems, index);
    };

    /* ============================================================
        RENDER
    ============================================================ */
    return (
      <div className="profil-wrapper">
        <div className="profil-hero">
          {/* COUVERTURE */}
          <div className="profil-cover">
            <button
              type="button"
              className="profil-cover-button"
              onClick={() => openProfileMedia("cover")}
              disabled={!user.coverPhoto}
              aria-label="Afficher la photo de couverture"
            >
              <img
                src={user.coverPhoto}
                alt="Couverture du profil"
                className="profil-cover-media"
                loading="lazy"
              />
            </button>
            <div className="profil-cover-meta">Ratio 2.67:1 — 1200x450 px recommandé</div>
          </div>

          {/* ENTÊTE */}
          <div className="profil-hero-row">
            <div className="profil-avatar-wrapper profil-avatar-wrapper--interactive">
              <button
                type="button"
                className="profil-avatar-button"
                onClick={() => openProfileMedia("avatar")}
                disabled={!user.avatar}
                aria-label="Afficher la photo de profil"
              >
                <div
                  className="profil-avatar profil-avatar-large"
                  style={{ backgroundImage: `url(${user.avatar})` }}
                />
              </button>
            </div>
            <div className="profil-hero-main">
              <div className="profil-title-block">
                <h1>{user.name}</h1>
                <div className="profil-stats">
                  <span>{user.friends?.length || 0} amis</span> |
                  <span> {user.followers?.length || 0} abonnés</span>
                </div>
              </div>
            </div>

            {!isMe && (
              <div className="profil-hero-actions profile-actions">
                <button
                  className="profil-btn primary"
                  onClick={handleMessageClick}
                >
                  Message
                </button>
                  <RelationButton targetId={user._id} />
                  {messageFeedback && (
                    <div className="profil-toast">{messageFeedback}</div>
                  )}
              </div>
            )}
          </div>

          {/* TABS */}
          <div className="profil-tabs-bar">
            <div className="profil-tabs">
              <button className="active">Publications</button>
              <button disabled>À propos</button>
              <button disabled>Photos</button>
            </div>
            <div className="profil-tabs-actions">
              <div className="profil-more" ref={menuRef}>
                <button
                  className="profil-btn ghost"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  ···
                </button>
                {menuOpen && (
                  <div className="profil-more-menu" role="menu">
                    <button type="button" role="menuitem" onClick={handleShareProfile}>
                      Partager le profil
                    </button>
                    <button type="button" role="menuitem" onClick={handleCopyProfileLink}>
                      Copier le lien du profil
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(`/profil/${user._id}/amis`)}
                    >
                      Voir la liste des amis
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {menuFeedback && <div className="profil-toast profil-toast--menu">{menuFeedback}</div>}

        <div className="profil-content">
          <div className="profil-grid">
            <div className="profil-col">
              <div className="profil-card intro-card">
                <h3>Intro</h3>
                <p className="profil-intro-text">
                  {user.bio || "Aucune bio renseignée pour le moment."}
                </p>
                <div className="profil-info-line">
                  <span role="img" aria-label="friends">
                    👥
                  </span>
                  <span>{user.friends?.length || 0} amis</span>
                </div>
                <div className="profil-info-line">
                  <span role="img" aria-label="followers">
                    🌟
                  </span>
                  <span>{user.followers?.length || 0} abonnés</span>
                </div>
              </div>

              <div className="profil-card photos-card">
                <div className="profil-card-header">
                  <h3>Photos</h3>
                  {photoItems.length > 0 && (
                    <button className="profil-link" onClick={() => openViewer(photoItems, 0)}>
                      Afficher tout
                    </button>
                  )}
                </div>
                {photoItems.length === 0 ? (
                  <p className="profil-empty">Aucune photo pour le moment.</p>
                ) : (
                  <div className="profil-photo-grid">
                    {photoItems.slice(0, 9).map((m, idx) => (
                      <button
                        key={m.key}
                        className="profil-photo-thumb"
                        style={{ backgroundImage: `url(${m.url})` }}
                        aria-label="Photo de la galerie"
                        onClick={() => openViewer(photoItems, idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="profil-col">
              {posts.length === 0 ? (
                <div className="profil-card profil-empty">Aucune publication.</div>
              ) : (
                <div className="profil-posts">
                  {posts.map((p) => (
                    <Post
                      key={p._id}
                      post={p}
                      currentUser={viewer}
                      onMediaClick={(items, start) => openViewer(items, start)}
                      onHidePost={handleHidePost}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {viewerOpen && (
          <ProfilePhotoViewer
            items={viewerItems}
            index={viewerIndex}
            onChangeIndex={setViewerIndex}
            onClose={() => setViewerOpen(false)}
          />
        )}

        {messageModalOpen && (
          <div className="profil-modal-overlay" role="dialog" aria-modal="true">
            <div className="profil-modal">
              <div className="profil-modal-header">
                <h3>Envoyer un message</h3>
                <button
                  type="button"
                  className="profil-close"
                  onClick={() => setMessageModalOpen(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
              <p className="profil-modal-hint">
                Ce message sera envoyé comme demande. Aucun média n'est autorisé.
              </p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Écrivez votre message (500 caractères max)"
              />
              {messageError && <div className="profil-modal-error">{messageError}</div>}
              <div className="profil-modal-actions">
                <button
                  type="button"
                  className="profil-btn ghost"
                  onClick={() => setMessageModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="profil-btn primary"
                  onClick={sendProfileMessage}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return <FacebookLayout headerOnly>{renderContent()}</FacebookLayout>;
}

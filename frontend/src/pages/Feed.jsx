import React, { useState, useEffect } from "react";
import { FaHeart, FaRegComment, FaShare } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MediaRenderer from "../components/MediaRenderer";
import TextClamp from "../components/TextClamp";
import { API_URL } from "../api/config";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/post`, {
      headers: { Authorization: `Bearer ${token}`
    })
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setLoading(false);
      });
  }, []);

  const sendComment = async (postId) => {
    if (!commentText[postId]) return;

    await fetch(`${API_URL}/post/${postId}/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text: commentText[postId] })
    });

    setCommentText({ ...commentText, [postId]: "" });

    // Recharger les posts après commentaire
    const updated = await fetch(`${API_URL}/post`, {
      headers: { Authorization: `Bearer ${token}`
    }).then(r => r.json());

    setPosts(updated);
  };

  const toggleExpand = (postId) => {
    setExpanded({ ...expanded, [postId]: !expanded[postId] });
  };

  if (loading) {
    return (
      <div className="global-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="feed-container">

      {/* HEADER */}
      <header className="feed-header">
        <div className="feed-logo">KZIIK</div>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/");
          }}
        >
          Déconnexion
        </button>
      </header>

      {/* CRÉER UN POST */}
      <div className="create-row" onClick={() => navigate("/create")}>
        <div className="create-avatar"></div>
        <div className="create-box">+ Créer un post</div>
      </div>

      {/* STORIES */}
      <div className="stories-row">
        {[1,2,3,4,5,6].map((s, i) => (
          <div className="story-card" key={i}>
            <div className="story-avatar-wrap">
              <div
                className="story-avatar"
                style={{
                  backgroundImage: `url(/assets/default-avatar.png)`
                }}
              ></div>
            </div>
            <div className="story-user">Story {i+1}</div>
          </div>
        ))}
      </div>

      {/* POSTS */}
      <div className="posts-section">
        {posts.map((post, index) => {
          const commentsToShow = expanded[post._id]
            ? post.comments
            : post.comments.slice(0, 2);

          return (
            <article key={index} className="post-card">

              {/* HEADER POST */}
              <div className="post-header">
                <button
                  type="button"
                  className="avatar-link"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (post.user?._id) {
                      navigate(`/profil/${post.user._id}`);
                    }
                  }}
                  aria-label="Ouvrir le profil"
                >
                  <img
                    src={post.user?.avatar || "/assets/default-avatar.png"}
                    className="post-avatar"
                    loading="lazy"
                  />
                </button>
                <div>
                  <div className="post-user">{post.user?.name || "Utilisateur"}</div>
                  <div className="post-sub">Membre KZIIK</div>
                </div>
              </div>

              {/* TEXTE */}
              {post.text && (
                <TextClamp text={post.text} className="post-text" />
              )}

              {/* MÉDIAS */}
              {post.media?.map((m, idx) => {
                if (m.type === "audio") {
                  return (
                    <audio key={idx} className="post-audio" controls src={m.url}></audio>
                  );
                }

                if (!m?.url) return null;

                const isVideo = m.type === "video";
                return (
                  <MediaRenderer
                    key={idx}
                    media={m}
                    src={m.url}
                    type={m.type}
                    mimeType={m.mimeType}
                    mediaClassName={isVideo ? "post-video" : "post-image"}
                    controls={isVideo}
                    muted={isVideo ? m.muted : undefined}
                    autoPlay={m.autoPlay}
                  />
                );
              })}

              {/* META */}
              <div className="post-meta-small">
                <span>{post.likes?.length || 0} J’aime</span>
                <span>{post.comments?.length || 0} Commentaires</span>
              </div>

              {/* ACTIONS */}
              <div className="post-actions">
                <button className="action-btn">
                  <FaHeart /> Jaime

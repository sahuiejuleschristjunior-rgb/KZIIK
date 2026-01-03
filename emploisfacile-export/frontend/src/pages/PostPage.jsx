// src/pages/PostPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Post from "../components/Post";
import CommentSection from "../components/CommentSection";
import "../styles/postpage.css";
import { getHiddenPostIds, rememberHiddenPost } from "../utils/hiddenPosts";

export default function PostPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        const hidden = getHiddenPostIds(currentUser?._id);
        if (hidden.includes(String(data?._id))) {
          setPost(null);
        } else {
          setPost(data);
        }
      } else nav("/feed");
    } catch (err) {
      console.error(err);
      nav("/feed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------- */
  /*          ACTIONS            */
  /* ---------------------------- */

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      const liked = data.liked;
      const userId = currentUser?._id;

      setPost((p) => {
        const hasLike = p.likes.includes(userId);
        let newLikes = p.likes;

        if (liked && !hasLike) newLikes = [...newLikes, userId];
        if (!liked && hasLike)
          newLikes = newLikes.filter((l) => l !== userId);

        return { ...p, likes: newLikes };
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async (text) => {
    try {
      const res = await fetch(`/api/posts/${id}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();
      setPost(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (cid, text) => {
    try {
      const res = await fetch(`/api/posts/${id}/comment/${cid}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();
      setPost(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(
        `/api/posts/${id}/comment/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = await res.json();
      setPost(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    try {
      const res = await fetch(
        `/api/posts/${id}/comment/${commentId}/reply/${replyId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = await res.json();
      setPost(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Supprimer le post ?")) return;

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) nav("/feed");
    } catch (err) {
      console.error(err);
    }
  };

  const handleHidePost = () => {
    rememberHiddenPost(id, currentUser?._id);
    setPost(null);
  };

  /* ---------------------------- */
  /*         RENDER PAGE         */
  /* ---------------------------- */
  return (
    <div className="postpage-wrapper">
      <div className="postpage-header">
        <button className="back-btn" onClick={() => nav(-1)}>
          ← Retour
        </button>
      </div>

      {loading ? (
        <div className="postpage-loading">Chargement…</div>
      ) : !post ? (
        <div className="postpage-error">Post introuvable</div>
      ) : (
        <div className="postpage-center">
          <Post
            post={post}
            currentUser={currentUser}
            onLike={handleLike}
            onComment={handleComment}
            onReply={handleReply}
            onDeleteComment={handleDeleteComment}
            onDeleteReply={handleDeleteReply}
            onDeletePost={handleDeletePost}
            onHidePost={handleHidePost}
          />

          <CommentSection
            post={post}
            onComment={handleComment}
            onReply={handleReply}
            onDeleteComment={handleDeleteComment}
            onDeleteReply={handleDeleteReply}
          />
        </div>
      )}
    </div>
  );
}

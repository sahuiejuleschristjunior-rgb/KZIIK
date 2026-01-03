import { useState } from "react";
import "../styles/comments.css";

export default function CommentSection({
  post,
  onComment,
  onReply,
  onDeleteComment,
  onDeleteReply,
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user"));
  } catch {}

  const send = async () => {
    if (!text.trim()) return;

    setLoading(true);

    if (replyTo) await onReply(replyTo.id, text);
    else await onComment(text);

    setText("");
    setReplyTo(null);
    setLoading(false);
  };

  return (
    <div className="comment-section">
      <div className="comment-input-wrapper">
        <input
          id={`comment-box-${post._id || post.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? `Répondre à ${replyTo.name}` : "Ajouter un commentaire…"}
          className="comment-input"
        />

        {loading ? (
          <div className="heartbeat"></div>
        ) : (
          <button className="comment-send-btn" onClick={send}>
            Envoyer
          </button>
        )}
      </div>

      {(post.comments || []).map((c) => {
        const isCommentAuthor = String(c.user?._id) === String(currentUser?._id);

        return (
          <div key={c._id} id={`comment-${c._id}`} className="comment-item">
            <div className="comment-avatar" />

            <div className="comment-content">
              <div className="comment-header">
                <strong>{c.user?.name}</strong>
                <span className="comment-date">
                  {new Date(c.createdAt).toLocaleString()}
                </span>

                <div className="comment-menu">
                  <button className="comment-menu-btn">⋮</button>

                  <div className="comment-menu-popup">
                    <button onClick={() => setReplyTo({ id: c._id, name: c.user?.name })}>
                      Répondre
                    </button>

                    {isCommentAuthor && (
                      <button
                        className="delete-btn"
                        onClick={() => onDeleteComment(c._id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="comment-text">{c.text}</div>

              <div className="reply-list">
                {(c.replies || []).map((r) => {
                  const isReplyAuthor = String(r.user?._id) === String(currentUser?._id);

                  return (
                    <div key={r._id} id={`reply-${r._id}`} className="reply-item">
                      <div className="reply-avatar" />

                      <div className="reply-content">
                        <div className="comment-header">
                          <strong>{r.user?.name}</strong>
                          <span className="comment-date">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>

                          <div className="comment-menu">
                            <button className="comment-menu-btn">⋮</button>
                            <div className="comment-menu-popup">
                              {isReplyAuthor && (
                                <button
                                  className="delete-btn"
                                  onClick={() => onDeleteReply(c._id, r._id)}
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="comment-text">{r.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/fr";

import { acceptFriendRequest, rejectFriendRequest } from "../api/socialApi";
import { useNotifications } from "../context/NotificationContext";
import { getImageUrl } from "../utils/imageUtils";

moment.locale("fr");

export default function NotificationItem({ notif, onHandled }) {
  const navigate = useNavigate();
  const { removeNotifications, deleteById, deleteByRelated } =
    useNotifications() || {};
  const actionType = notif.actionType || notif.type;

  const getNotifConversationId = (item) =>
    item?.conversationId ||
    (typeof item?.conversation === "object"
      ? item.conversation?._id
      : item?.conversation) ||
    item?.from?._id ||
    item?.from;

  const isFriendRequest = actionType === "friend_request";
  const notifClass = "notif-item unread";

  const avatarUrl = getImageUrl(notif.from?.avatar) || "/default-avatar.jpg";

  let message = "";
  let icon = "✨";

  switch (actionType) {
    case "like":
      message = "a aimé votre publication.";
      icon = "👍";
      break;

    case "comment":
      message = `a commenté votre publication : "${(notif.text || "").slice(0, 40)}"`;
      icon = "💬";
      break;

    case "reply":
      message = `a répondu à votre commentaire : "${(notif.text || "").slice(0, 40)}"`;
      icon = "↩️";
      break;

    case "message":
      message = `vous a envoyé un message : "${(notif.text || "").slice(0, 40)}"`;
      icon = "✉️";
      break;

    case "message_request":
      message = "vous a envoyé une demande de message.";
      icon = "💬";
      break;

    case "friend_request":
      message = "vous a envoyé une demande d’amitié.";
      icon = "👤";
      break;

    case "friend_accept":
      message = "a accepté votre demande d’amitié.";
      icon = "🤝";
      break;

    case "friend_reject":
      message = "a refusé votre demande d’amitié.";
      icon = "❌";
      break;

    case "follow":
      message = "a commencé à vous suivre.";
      icon = "👥";
      break;

    default:
      message = "a effectué une action.";
      icon = "✨";
  }

  const handleAccept = async (e) => {
    e.stopPropagation();
    await acceptFriendRequest(notif.from._id);
    await deleteByRelated?.(notif.relatedId);
    removeNotifications?.(
      (n) =>
        (n.actionType || n.type) === "friend_request" &&
        String(n.from?._id || n.from) === String(notif.from._id)
    );
    onHandled?.(notif._id, { handled: true }); // ✔ Empêche la notif de revenir
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    await rejectFriendRequest(notif.from._id);
    await deleteByRelated?.(notif.relatedId);
    removeNotifications?.(
      (n) =>
        (n.actionType || n.type) === "friend_request" &&
        String(n.from?._id || n.from) === String(notif.from._id)
    );
    onHandled?.(notif._id, { handled: true }); // ✔ Empêche la notif de revenir
  };

  const handleClick = async () => {
    if (isFriendRequest) return;

    const notifConversationId = getNotifConversationId(notif);

    if (actionType === "message_request") {
      await deleteByRelated?.(notif.relatedId);
      navigate("/messages", { replace: true, state: { source: "notification" } });
      return;
    }

    if (actionType === "message") {
      await deleteByRelated?.(notif.relatedId);
      removeNotifications?.((item) => item._id === notif._id);
      navigate("/messages", {
        replace: true,
        state: {
          openConversationId: notifConversationId || null,
          source: "notification",
        },
      });
      return;
    }

    if (["like", "comment", "reply", "share"].includes(actionType)) {
      await deleteById?.(notif._id);
      navigate("/fb", {
        state: {
          fromNotification: true,
          focusPostId:
            notif.postId || notif.post?._id || notif.relatedId || null,
          focusCommentId: notif.commentId || notif.comment?._id || null,
          focusReplyId: notif.replyId || notif.reply?._id || null,
        },
      });
      return;
    }

    if (notif.from?._id) {
      await deleteById?.(notif._id);
      navigate(`/profil/${notif.from._id}`);
    }
  };

  return (
    <div className={notifClass} onClick={handleClick}>
      <div className="notif-avatar-container">
        <img
          src={avatarUrl}
          alt={notif.from?.name || "Utilisateur"}
          className="notif-avatar"
          loading="lazy"
        />
        <span className="notif-icon">{icon}</span>
      </div>

      <div className="notif-content">
        <p className="notif-message">
          <strong>{notif.from?.name || "Un utilisateur"}</strong> {message}
        </p>

        <span className="notif-time">
          {moment(notif.createdAt).fromNow()}
        </span>

        {isFriendRequest && (
          <div className="notif-actions">
            <button className="primary" onClick={handleAccept}>
              Accepter
            </button>
            <button className="secondary" onClick={handleReject}>
              Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

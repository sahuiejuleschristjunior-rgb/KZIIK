// src/components/ConversationItem.jsx
export default function ConversationItem({
  avatar,
  name,
  last,
  lastMessage = null,
  lastTime,
  unreadCount = 0,
  isOnline = false,
  onClick,
}) {
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasUnread = unreadCount > 0 || lastMessage?.isRead === false;

  return (
    <div className="conversation-item" onClick={onClick}>
      <div className="conv-avatar-wrapper">
        <div
          className="conv-avatar"
          style={{ backgroundImage: `url(${avatar || "/default-avatar.png"})` }}
        />
        <span className={isOnline ? "conv-status-dot online" : "conv-status-dot offline"} />
      </div>

      <div className="conv-texts">
        <div className="conv-top-row">
          <div className="conv-name">{name}</div>
          {lastTime && <div className="conv-time">{formatTime(lastTime)}</div>}
        </div>
        <div className="conv-bottom-row">
          <div className="conv-last-msg">
            {last}
            {hasUnread && <span className="inbox-badge-new">Nouveau</span>}
          </div>
          {unreadCount > 0 && (
            <span className="conv-unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}
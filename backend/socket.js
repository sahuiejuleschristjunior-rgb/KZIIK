// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Notification = require("./models/Notification");

let io = null;

/* ============================================================
   FONCTION GLOBALE POUR ENVOYER UNE NOTIFICATION
============================================================ */
async function sendNotification(userId, notification) {
  if (!io || !notification) return;
  const { type, actionType, relatedId, from = null, text = "" } = notification;
  if (!type || !actionType || !relatedId) return;

  try {
    const notif = await Notification.create({
      userId,
      type,
      actionType,
      relatedId,
      from,
      text,
    });
    io.to(String(userId)).emit("notification:new", notif);
  } catch (err) {
    console.error("SOCKET NOTIF ERROR:", err);
  }
}

/* ============================================================
   INITIALISATION SOCKET.IO
============================================================ */
function initSocket(server) {
  const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "*";

  io = new Server(server, {
    cors: {
      origin: FRONTEND_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },

    // 🔥 Route explicite (compatible NGINX : wss://domain/socket.io)
    path: "/socket.io",

    // important : accepter polling puis websocket (upgrade)
    transports: ["polling", "websocket"],

    pingInterval: 25000,
    pingTimeout: 60000,
  });

  /* ============================================================
     AUTH AVEC TOKEN (middleware)
============================================================ */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        const err = new Error("Token obligatoire");
        err.data = { code: "NO_TOKEN" };
        return next(err);
      }

      const rawToken = String(token)
        .replace(/^Bearer\s+/i, "")
        .trim()
        .replace(/^"|"$/g, "");
      const parts = rawToken.split(".");
      const hasValidParts = parts.length === 3 && parts.every((p) => Boolean(p));

      if (!hasValidParts || rawToken === "null" || rawToken === "undefined") {
        const err = new Error("Token invalide");
        err.data = { code: "INVALID_TOKEN" };
        return next(err);
      }

      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      const error = new Error("Token invalide");
      error.data = { code: "INVALID_TOKEN" };
      return next(error);
    }
  });

  /* ============================================================
     SOCKET.IO CONNECTÉ
============================================================ */
  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(String(userId));

    console.log("🔌 Socket connecté :", userId, "| ID :", socket.id);

    /* ============================================================
       MESSAGES — TEMPS RÉEL
    ============================================================ */
    socket.on("send_message", ({ receiver, content }) => {
      if (!receiver || !content) return;

      const payload = {
        sender: userId,
        receiver,
        content,
        createdAt: new Date(),
      };

      io.to(String(receiver)).emit("new_message", payload);
      io.to(String(userId)).emit("new_message", payload);
    });

    /* ============================================================
       TYPING
    ============================================================ */
    socket.on("typing", ({ to, isTyping = true }) => {
      if (!to) return;
      io.to(String(to)).emit("typing", { from: userId, isTyping });
    });

    /* ============================================================
       READ RECEIPTS
    ============================================================ */
    socket.on("messages_read", ({ readerId, withUserId }) => {
      if (!withUserId) return;

      io.to(String(withUserId)).emit("messages_read_update", {
        readerId,
        withUserId,
        readAt: new Date(),
      });
    });

    /* ============================================================
       AMIS - TEMPS RÉEL
    ============================================================ */
    socket.on("friend_request", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "friend_request",
        relatedId: userId,
        from: userId,
        text: "Vous avez reçu une demande d’amitié",
      });
    });

    socket.on("friend_accept", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "friend_accept",
        relatedId: userId,
        from: userId,
        text: "Votre demande d’amitié a été acceptée",
      });
    });

    socket.on("friend_reject", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "friend_reject",
        relatedId: userId,
        from: userId,
        text: "Votre demande d’amitié a été refusée",
      });
    });

    socket.on("friend_remove", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "friend_remove",
        relatedId: userId,
        from: userId,
        text: "Vous n’êtes plus amis",
      });
    });

    /* ============================================================
       FOLLOW — TEMPS RÉEL
    ============================================================ */
    socket.on("follow_user", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "follow",
        relatedId: userId,
        from: userId,
        text: "Vous avez un nouvel abonné",
      });
    });

    socket.on("unfollow_user", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "unfollow",
        relatedId: userId,
        from: userId,
        text: "Un utilisateur s'est désabonné",
      });
    });

    /* ============================================================
       POSTS — LIKE / COMMENTAIRES
    ============================================================ */
    socket.on("post_like", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "like",
        relatedId: postId,
        from: userId,
        text: "Quelqu'un aime votre publication",
      });
    });

    socket.on("post_comment", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "comment",
        relatedId: postId,
        from: userId,
        text: "Quelqu'un a commenté votre publication",
      });
    });

    socket.on("post_reply", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "public",
        actionType: "reply",
        relatedId: postId,
        from: userId,
        text: "Quelqu'un a répondu à votre commentaire",
      });
    });

    /* ============================================================
       SIGNAUX WEBRTC
    ============================================================ */
    socket.on("call_offer", ({ to, offer, callType }) => {
      if (!to) return;
      const type = callType || "video";
      io.to(String(to)).emit("call_offer", { from: userId, offer, callType: type });

      sendNotification(to, {
        type: "public",
        actionType: "call",
        relatedId: userId,
        from: userId,
        text: type === "audio" ? "Appel audio entrant" : "Appel entrant",
      });
    });

    socket.on("call_answer", ({ to, answer }) => {
      if (!to) return;
      io.to(String(to)).emit("call_answer", { from: userId, answer });
    });

    socket.on("call_ice_candidate", ({ to, candidate }) => {
      if (!to) return;
      io.to(String(to)).emit("call_ice_candidate", {
        from: userId,
        candidate,
      });
    });

    socket.on("call_hangup", ({ to }) => {
      if (!to) return;
      io.to(String(to)).emit("call_hangup", {
        from: userId,
      });
    });

    /* ============================================================
       USER STATUS
    ============================================================ */
    socket.broadcast.emit("user_online", userId);

    socket.on("disconnect", () => {
      console.log("❌ Déconnexion :", userId);
      socket.broadcast.emit("user_offline", userId);
    });
  });

  return io;
}

/* ============================================================
   EXPORTS
============================================================ */
function getIO() {
  if (!io) throw new Error("Socket.io non initialisé !");
  return io;
}

module.exports = { initSocket, getIO, sendNotification };

const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const MessageRequest = require("../models/MessageRequest");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");

const typingState = new Map();
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const REQUEST_MESSAGE_MAX = 500;
const REQUEST_COOLDOWN_MS = 15 * 60 * 1000;
const requestRateMap = new Map();

const ATTACHMENT_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

function isUserParticipant(message, userId) {
  if (!message || !userId) return false;
  return (
    message.sender.toString() === userId || message.receiver.toString() === userId
  );
}

function populateMessage(message) {
  if (!message) return message;
  return message.populate([
    { path: "sender", select: "name avatar role" },
    { path: "receiver", select: "name avatar role" },
    { path: "replyTo", select: "content type sender receiver" },
  ]);
}

function getSenderId(req) {
  return req?.user?._id || req?.user?.id || null;
}

function areFriends(user, otherUserId) {
  return Array.isArray(user?.friends)
    ? user.friends.some((f) => String(f.user) === String(otherUserId))
    : false;
}

function isBlocked(user, otherUserId) {
  return Array.isArray(user?.blockedUsers)
    ? user.blockedUsers.some((u) => String(u) === String(otherUserId))
    : false;
}

function containsLink(text) {
  if (!text) return false;
  return /(https?:\/\/|www\.)/i.test(text);
}

function resolveMessageType({ explicitType, mimeType }) {
  if (explicitType && Message.schema.path("type").enumValues.includes(explicitType)) {
    return explicitType;
  }

  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  return "file";
}

function buildFileMetaFromUpload(file) {
  if (!file) return {};
  const publicUrl = `/uploads/messages/${file.filename}`;
  return {
    fileUrl: publicUrl,
    fileName: file.originalname || file.filename,
    mimeType: file.mimetype || null,
  };
}

function enforceRequestRateLimit(userId) {
  if (!userId) return false;
  const now = Date.now();
  const last = requestRateMap.get(String(userId)) || 0;
  if (now - last < REQUEST_COOLDOWN_MS) {
    return true;
  }
  requestRateMap.set(String(userId), now);
  return false;
}

async function findExistingConversation(userAId, userBId) {
  if (!userAId || !userBId) return null;
  const a = new mongoose.Types.ObjectId(userAId);
  const b = new mongoose.Types.ObjectId(userBId);
  return Conversation.findOne({
    participants: { $all: [a, b] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });
}

async function findOrCreateConversation(senderId, receiverId) {
  const senderObjectId = new mongoose.Types.ObjectId(senderId);
  const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

  let conversation = await Conversation.findOne({
    participants: { $all: [senderObjectId, receiverObjectId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderObjectId, receiverObjectId],
    });
  }

  return conversation;
}

/* ============================================================
🔥 UTILITAIRE : PUSH NOTIF + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  const notif = await Notification.create({
    userId,
    from: data.from || null,
    type: data.type,
    actionType: data.actionType,
    relatedId: data.relatedId,
    text: data.text || "",
  });

  const populated = await notif.populate("from", "name avatar role");
  getIO().to(String(userId)).emit("notification:new", populated);
  return populated;
}

async function buildMessageRequest({ senderUser, receiverUser, content }) {
  const senderId = senderUser?._id;
  const receiverId = receiverUser?._id;

  if (!senderId || !receiverId) {
    return {
      errorStatus: 400,
      message: "Expéditeur ou destinataire manquant.",
    };
  }

  if (enforceRequestRateLimit(senderId)) {
    return {
      errorStatus: 429,
      message: "Trop de demandes. Réessayez dans quelques minutes.",
    };
  }

  const trimmed = (content || "").trim();
  if (!trimmed) {
    return {
      errorStatus: 400,
      message: "Le message ne peut pas être vide.",
    };
  }

  if (trimmed.length > REQUEST_MESSAGE_MAX) {
    return {
      errorStatus: 400,
      message: `Le message doit contenir au maximum ${REQUEST_MESSAGE_MAX} caractères.`,
    };
  }

  if (containsLink(trimmed)) {
    return {
      errorStatus: 400,
      message: "Les liens sont désactivés dans les demandes de message.",
    };
  }

  const pendingExisting = await MessageRequest.findOne({
    status: "pending",
    $or: [
      { fromUser: senderId, toUser: receiverId },
      { fromUser: receiverId, toUser: senderId },
    ],
  });

  if (pendingExisting) {
    return {
      errorStatus: 403,
      message: "Une demande de message est déjà en attente.",
    };
  }

  const conversationExists = await findExistingConversation(senderId, receiverId);
  if (conversationExists) {
    return {
      errorStatus: 409,
      message: "Une conversation existe déjà entre ces utilisateurs.",
    };
  }

  const request = await MessageRequest.create({
    fromUser: senderId,
    toUser: receiverId,
    message: trimmed,
  });

  const populated = await request.populate("fromUser", "name avatar role");
  getIO().to(receiverId.toString()).emit("message_request_received", populated);

    return { request: populated };
  }

  /* ============================================================
  POST /api/messages
  ➤ Envoyer un message
  ============================================================ */
async function createAndDispatchMessage({
  sender,
  receiverId,
  conversation,
  content,
  type,
  clientTempId,
  replyMessageId,
  replyPreview,
  fileMeta = {},
}) {
  const message = await Message.create({
    sender,
    receiver: receiverId,
    conversation: conversation._id,
    content,
    type: type || "text",
    clientTempId: clientTempId || null,
    replyTo: replyMessageId,
    replyPreview,
    isRead: false,
    ...fileMeta,
  });

  conversation.lastMessage = message._id;
  conversation.updatedAt = new Date();
  await conversation.save();

  const populated = await populateMessage(message);
  const plainMessage = populated?.toObject ? populated.toObject() : populated;

  console.log("[messages] message enregistré", {
    messageId: plainMessage?._id,
    type: plainMessage?.type,
    hasFile: Boolean(plainMessage?.fileUrl),
    fileUrl: plainMessage?.fileUrl || null,
  });

  const payload = {
    from: sender,
    to: receiverId,
    message: plainMessage,
  };

  const io = getIO();
  io.to(receiverId.toString()).emit("new_message", payload);
  io.to(sender.toString()).emit("new_message", payload);
  io.emit("new_message", payload);
  console.log("[messages] événement émis", {
    to: receiverId,
    from: sender,
    messageId: plainMessage?._id,
    type: plainMessage?.type,
  });

  await pushNotification(receiverId, {
    from: sender,
    type: "public",
    actionType: "message",
    relatedId: message._id,
    text: "Nouveau message reçu",
  });

  return plainMessage;
}

exports.sendMessage = async (req, res) => {
  try {
    const sender = getSenderId(req);
    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const { receiver, content, type, clientTempId, replyTo, fileUrl, fileName, mimeType } =
      req.body;

    const receiverId = receiver;

    const hasTextContent = typeof content === "string" && content.trim() !== "";
    const hasFile = Boolean(fileUrl);

    if (!receiverId || (!hasTextContent && !hasFile)) {
      return res
        .status(400)
        .json({ message: "Destinataire ou contenu manquant." });
    }

    if (receiverId === sender) {
      return res
        .status(400)
        .json({ message: "Impossible d'envoyer un message à vous-même." });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    const [receiverUser, senderUser] = await Promise.all([
      User.findById(receiverId),
      User.findById(sender),
    ]);

    if (!receiverUser || !senderUser) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    if (isBlocked(receiverUser, sender) || isBlocked(senderUser, receiverId)) {
      return res.status(403).json({ message: "Interaction non autorisée." });
    }

    const isFriend =
      areFriends(senderUser, receiverId) && areFriends(receiverUser, sender);

    const existingConversation = await findExistingConversation(
      sender,
      receiverId
    );

    // =====================
    // MESSAGE REQUEST FLOW
    // =====================
    if (!isFriend && !existingConversation) {
      if ((type && type !== "text") || hasFile) {
        return res
          .status(400)
          .json({ message: "Seuls les messages textes sont autorisés." });
      }

      const { request, errorStatus, message: errorMessage } =
        await buildMessageRequest({
          senderUser,
          receiverUser,
          content,
        });

      if (errorStatus) {
        return res.status(errorStatus).json({ message: errorMessage });
      }

      await pushNotification(receiverId, {
        from: sender,
        type: "public",
        actionType: "message_request",
        relatedId: request._id,
        text: "Nouvelle demande de message",
      });

      return res.status(201).json({
        success: true,
        type: "request",
        message: "Message envoyé comme demande.",
        data: request,
      });
    }

    // =====================
    // DIRECT FRIEND MESSAGE
    // =====================
    let replyPreview = null;
    let replyMessageId = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);
      if (repliedMessage) {
        replyMessageId = repliedMessage._id;
        replyPreview = {
          messageId: replyMessageId,
          content: repliedMessage.content || "",
          type: repliedMessage.type || "text",
        };
      }
    }

    let conversation = existingConversation;
    if (!conversation) {
      if (!isFriend) {
        return res.status(403).json({
          message: "Impossible d'envoyer un message sans accepter la demande.",
        });
      }
      conversation = await findOrCreateConversation(sender, receiverId);
    }

    const messageType = resolveMessageType({
      explicitType: type,
      mimeType,
    });

    const finalContent = hasTextContent
      ? content
      : fileName || "Pièce jointe";

    const fileMeta = hasFile
      ? {
          fileUrl,
          fileName: fileName || null,
          mimeType: mimeType || null,
        }
      : {};

    const message = await createAndDispatchMessage({
      sender,
      receiverId,
      conversation,
      content: finalContent,
      type: messageType,
      clientTempId,
      replyMessageId,
      replyPreview,
      fileMeta,
    });

    return res.status(201).json({
      success: true,
      message: "Message envoyé.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'envoi du message.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/attachment
➤ Envoyer un fichier (image / vidéo / document)
============================================================ */
exports.sendAttachmentMessage = async (req, res) => {
  try {
    const sender = getSenderId(req);
    const { receiver, content, type, clientTempId, replyTo } = req.body || {};
    const receiverId = receiver;
    const file = req.file;

    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Destinataire invalide." });
    }

    if (!file) {
      return res.status(400).json({ message: "Aucun fichier reçu." });
    }

    if (
      file.mimetype &&
      !ATTACHMENT_MIMES.has(file.mimetype) &&
      !file.mimetype.startsWith("image/") &&
      !file.mimetype.startsWith("video/")
    ) {
      return res.status(400).json({
        message: "Type de fichier non supporté pour les messages.",
      });
    }

    const [receiverUser, senderUser] = await Promise.all([
      User.findById(receiverId),
      User.findById(sender),
    ]);

    if (!receiverUser || !senderUser) {
      return res.status(404).json({ message: "Destinataire introuvable." });
    }

    if (isBlocked(receiverUser, sender) || isBlocked(senderUser, receiverId)) {
      return res.status(403).json({ message: "Interaction non autorisée." });
    }

    const isFriend =
      areFriends(senderUser, receiverId) && areFriends(receiverUser, sender);

    let conversation = await findExistingConversation(sender, receiverId);
    if (!conversation) {
      if (!isFriend) {
        return res.status(403).json({
          message:
            "Impossible d'envoyer un fichier sans accepter la demande de message.",
        });
      }
      conversation = await findOrCreateConversation(sender, receiverId);
    }

    let replyPreview = null;
    let replyMessageId = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);
      if (repliedMessage) {
        replyMessageId = repliedMessage._id;
        replyPreview = {
          messageId: replyMessageId,
          content: repliedMessage.content || "",
          type: repliedMessage.type || "text",
        };
      }
    }

    console.log("[messages] fichier reçu", {
      name: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      tempPath: file.path,
    });

    const fileMeta = buildFileMetaFromUpload(file);
    const relativePath = fileMeta.fileUrl.replace(/^\//, "");
    const absolutePath = path.join(__dirname, "..", relativePath);
    const saved = fs.existsSync(absolutePath);
    console.log("[messages] fichier sauvegardé", {
      absolutePath,
      exists: saved,
      publicUrl: fileMeta.fileUrl,
    });
    const hasCaption = typeof content === "string" && content.trim() !== "";

    const message = await createAndDispatchMessage({
      sender,
      receiverId,
      conversation,
      content: hasCaption ? content : fileMeta.fileName || "Pièce jointe",
      type: resolveMessageType({ explicitType: type, mimeType: file.mimetype }),
      clientTempId,
      replyMessageId,
      replyPreview,
      fileMeta,
    });

    return res.status(201).json({
      success: true,
      message: "Pièce jointe envoyée.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'envoi de la pièce jointe.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/request
➤ Créer une demande de message
============================================================ */
exports.createMessageRequest = async (req, res) => {
  try {
    const senderId = getSenderId(req);
    const { toUser, message } = req.body;

    if (!senderId) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (!toUser || !mongoose.Types.ObjectId.isValid(toUser)) {
      return res.status(400).json({ message: "Destinataire invalide." });
    }

    if (String(toUser) === String(senderId)) {
      return res
        .status(400)
        .json({ message: "Impossible d'envoyer une demande à vous-même." });
    }

    const [receiverUser, senderUser] = await Promise.all([
      User.findById(toUser),
      User.findById(senderId),
    ]);

    if (!receiverUser || !senderUser) {
      return res.status(404).json({ message: "Destinataire introuvable." });
    }

    if (isBlocked(receiverUser, senderId) || isBlocked(senderUser, toUser)) {
      return res.status(403).json({ message: "Interaction non autorisée." });
    }

    if (areFriends(senderUser, toUser) && areFriends(receiverUser, senderId)) {
      return res
        .status(400)
        .json({ message: "Vous êtes déjà connectés en messages." });
    }

    const { request, errorStatus, message: errorMessage } =
      await buildMessageRequest({
        senderUser,
        receiverUser,
        content: message,
      });

    if (errorStatus) {
      return res.status(errorStatus).json({ message: errorMessage });
    }

    await pushNotification(toUser, {
      from: senderId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
      text: "Nouvelle demande de message",
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la création de la demande.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/requests
➤ Liste des demandes reçues
============================================================ */
exports.getMessageRequests = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const requests = await MessageRequest.find({
      toUser: userId,
      status: "pending",
    })
      .populate("fromUser", "name avatar role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des demandes.",
      details: error.message,
    });
  }
};

async function createFriendshipIfNeeded(userA, userB) {
  const alreadyFriends =
    areFriends(userA, userB._id) && areFriends(userB, userA._id);
  if (alreadyFriends) return;

  userA.friends = userA.friends || [];
  userB.friends = userB.friends || [];

  if (!areFriends(userA, userB._id)) {
    userA.friends.push({ user: userB._id, category: "public" });
  }

  if (!areFriends(userB, userA._id)) {
    userB.friends.push({ user: userA._id, category: "public" });
  }

  await Promise.all([userA.save(), userB.save()]);
}

/* ============================================================
POST /api/messages/requests/:id/accept
➤ Accepter une demande
============================================================ */
exports.acceptMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Cette demande a déjà été traitée." });
    }

    const [receiver, sender] = await Promise.all([
      User.findById(userId).select("name avatar role"),
      User.findById(request.fromUser).select("name avatar role"),
    ]);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    if (isBlocked(receiver, sender._id)) {
      request.status = "rejected";
      await request.save();
      return res.status(403).json({ message: "Interaction bloquée." });
    }

    const existingConversation = await findExistingConversation(
      sender._id,
      receiver._id
    );

    const conversation =
      existingConversation ||
      (await Conversation.create({
        participants: [sender._id, receiver._id],
      }));

    request.status = "accepted";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

    const recipientView = {
      _id: conversation._id,
      user: sender,
      unreadCount: 0,
      lastMessage: null,
    };

    const requesterView = {
      _id: conversation._id,
      user: receiver,
      unreadCount: 0,
      lastMessage: null,
    };

    getIO()
      .to(sender._id.toString())
      .emit("conversation_created", requesterView);
    getIO()
      .to(receiver._id.toString())
      .emit("conversation_created", recipientView);

    return res.status(200).json({ success: true, conversation: recipientView });
  } catch (error) {
    return res.status(500).json({
      message: "Impossible d'accepter la demande.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/requests/:id/decline
➤ Refuser une demande
============================================================ */
exports.declineMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    request.status = "rejected";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du refus de la demande.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/requests/:id/block
➤ Bloquer un utilisateur suite à une demande
============================================================ */
exports.blockFromMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    receiver.blockedUsers = receiver.blockedUsers || [];
    if (!isBlocked(receiver, request.fromUser)) {
      receiver.blockedUsers.push(request.fromUser);
      await receiver.save();
    }

    request.status = "rejected";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du blocage de l'utilisateur.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id
➤ Modifier un message texte (limité à 12h)
============================================================ */
exports.updateMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Contenu requis." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (!isUserParticipant(message, userId)) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    if (message.type !== "text") {
      return res.status(400).json({ message: "Seuls les messages textes sont modifiables." });
    }

    const createdAt = new Date(message.createdAt).getTime();
    if (Date.now() - createdAt > TWELVE_HOURS_MS) {
      return res.status(400).json({
        message: "Le message ne peut plus être modifié (délai de 12h dépassé).",
      });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await populateMessage(message);

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("message_updated", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la modification du message.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/conversation/:userId
➤ Récupérer la conversation
============================================================ */
exports.getConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const myObjectId = new mongoose.Types.ObjectId(myId);

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: myId, receiver: otherId },
            { sender: otherId, receiver: myId },
          ],
        },
        { deletedForAll: { $ne: true } },
        { deletedFor: { $ne: myObjectId } },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar role")
      .populate("receiver", "name avatar role")
      .populate("replyTo", "content type sender receiver");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement de la conversation.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/inbox
➤ Inbox
============================================================ */
exports.getInbox = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const inbox = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "name avatar role" },
          { path: "receiver", select: "name avatar role" },
        ],
      })
      .populate("participants", "name avatar role");

    return res.status(200).json(inbox);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement de la boîte de réception.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id/read
➤ Marquer un message comme lu
============================================================ */
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (message.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      relatedId: message._id,
    });

    getIO().to(message.sender.toString()).emit("message_read", {
      messageId: message._id,
      readAt: message.readAt,
    });

    return res.status(200).json({
      success: true,
      message: "Message marqué comme lu.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/read-all/:userId
➤ Marquer toute la conversation comme lue
============================================================ */
exports.markAllAsReadForConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;

    const updated = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: myId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    getIO()
      .to(String(otherUserId))
      .emit("message_read", { withUserId: myId });

    const unreadMessages = await Message.find({
      sender: otherUserId,
      receiver: myId,
      isRead: true,
    })
      .select("_id")
      .lean();

    const publicIds = unreadMessages.map((msg) => msg._id);
    if (publicIds.length > 0) {
      await Notification.deleteMany({
        userId: myId,
        type: "public",
        relatedId: { $in: publicIds },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tous les messages ont été marqués comme lus.",
      updatedCount: updated.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut en lecture.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/:id/react
➤ Ajouter / retirer une réaction
============================================================ */
exports.reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji requis." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (
      message.sender.toString() !== userId &&
      message.receiver.toString() !== userId
    ) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    const currentReactions = [...(message.reactions || [])];
    const existingIndex = currentReactions.findIndex(
      (r) => r.user && r.user.toString() === userId
    );

    if (existingIndex >= 0 && currentReactions[existingIndex].emoji === emoji) {
      currentReactions.splice(existingIndex, 1);
    } else if (existingIndex >= 0) {
      currentReactions[existingIndex].emoji = emoji;
      currentReactions[existingIndex].createdAt = new Date();
    } else {
      currentReactions.push({ user: userId, emoji });
    }

    message.reactions = currentReactions;
    await message.save();

    const populated = await message.populate({
      path: "reactions.user",
      select: "name avatar",
    });

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("reaction_update", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la réaction.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/:id/reactions
➤ Récupérer les réactions d’un message
============================================================ */
exports.getMessageReactions = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).populate({
      path: "reactions.user",
      select: "name avatar",
    });

    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (
      message.sender.toString() !== req.user.id &&
      message.receiver.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    return res.status(200).json({
      success: true,
      reactions: message.reactions || [],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des réactions.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id/pin
➤ Épingler / désépingler un message
============================================================ */
exports.togglePin = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    const desiredState =
      typeof req.body?.pinned === "boolean" ? req.body.pinned : null;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (!isUserParticipant(message, userId)) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    const pinnedList = message.pinnedBy || [];
    message.pinnedBy = pinnedList;
    const alreadyPinned = pinnedList.some((id) => id.toString() === userId);
    const shouldPin = desiredState === null ? !alreadyPinned : desiredState;

    if (shouldPin && !alreadyPinned) {
      pinnedList.push(userId);
      message.lastPinnedAt = new Date();
    }

    if (!shouldPin && alreadyPinned) {
      message.pinnedBy = pinnedList.filter((id) => id.toString() !== userId);
      if (!message.pinnedBy.length) {
        message.lastPinnedAt = null;
      }
    }

    await message.save();
    const populated = await populateMessage(message);

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("message_pinned", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour de l'épingle.",
      details: error.message,
    });
  }
};

/* ============================================================
DELETE /api/messages/:id
➤ Supprimer un message
============================================================ */
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    const scope = ((req.query.scope || req.body?.scope || "me").toString() || "me")
      .toLowerCase()
      .trim();

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    const isSender = message.sender.toString() === userId;
    const isReceiver = message.receiver.toString() === userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    if (scope === "all") {
      if (!isSender) {
        return res
          .status(403)
          .json({ message: "Seul l'expéditeur peut supprimer pour tous." });
      }

      if (!message.deletedForAll) {
        message.deletedForAll = true;
        message.deletedAt = new Date();
        message.deletedFor = [message.sender, message.receiver];

        const mediaPaths = [];
        if (message.fileUrl) {
          mediaPaths.push(path.join(__dirname, `..${message.fileUrl}`));
        }

        await message.save();

        mediaPaths.forEach((p) => {
          try {
            if (fs.existsSync(p)) {
              fs.unlinkSync(p);
            }
          } catch (err) {
            console.error("Erreur suppression fichier message", err);
          }
        });
      }

      getIO()
        .to(message.sender.toString())
        .to(message.receiver.toString())
        .emit("message_deleted", { messageId, scope: "all" });

      return res.status(200).json({
        success: true,
        message: "Message supprimé pour tout le monde.",
      });
    }

    const alreadyDeleted = (message.deletedFor || []).some(
      (id) => id && id.toString() === userId
    );

    if (!alreadyDeleted) {
      message.deletedFor = [...(message.deletedFor || []), userId];
      await message.save();
    }

    getIO()
      .to(userId.toString())
      .emit("message_deleted", { messageId, scope: "me" });

    return res
      .status(200)
      .json({ success: true, message: "Message supprimé pour vous." });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la suppression du message.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/typing
➤ Flag typing temporaire en mémoire
============================================================ */
exports.setTypingFlag = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, isTyping } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId requis." });
    }

    const key = `${senderId}:${receiverId}`;
    typingState.set(key, { isTyping: Boolean(isTyping), at: Date.now() });

    const now = Date.now();
    for (const [k, value] of typingState.entries()) {
      if (now - value.at > 30000) {
        typingState.delete(k);
      }
    }

    return res.status(200).json({
      success: true,
      typing: Boolean(isTyping),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut de frappe.",
      details: error.message,
    });
  }
};

/* ============================================================
🆕 GET /api/messages/friends
➤ Liste des amis pour démarrer une conversation
============================================================ */
exports.getMessageFriends = async (req, res) => {
  try {
    const me = req.user.id;

    const user = await User.findById(me).populate(
      "friends.user",
      "name avatar role"
    );

    const friends = (user.friends || [])
      .filter((f) => f.user)
      .map((f) => ({
        _id: f.user._id,
        name: f.user.name,
        avatar: f.user.avatar,
        role: f.user.role,
        category: f.category,
      }));

    return res.status(200).json({
      success: true,
      friends,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des amis pour messages",
      details: error.message,
    });
  }
};

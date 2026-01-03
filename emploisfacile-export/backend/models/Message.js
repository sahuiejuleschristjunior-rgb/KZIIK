const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Expéditeur du message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Destinataire
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Conversation de rattachement (1-to-1)
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    // Lien optionnel vers une candidature
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    // Lien optionnel vers une offre
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },

    // Type de message (texte, système, appel vidéo, fichier…)
    type: {
      type: String,
      enum: ["text", "system", "video", "file", "videoCall", "audio"],
      default: "text",
    },

    // Contenu du message (texte)
    content: {
      type: String,
      trim: true,
      default: "",
    },

    // URL d’un fichier (si type = file)
    fileUrl: {
      type: String,
      default: null,
    },

    // URL d'un audio (si type = audio)
    audioUrl: {
      type: String,
      default: null,
    },

    // Réponse à un autre message (optionnel)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Extrait rapide du message auquel on répond pour l'affichage
    replyPreview: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
      content: {
        type: String,
        default: "",
      },
      type: {
        type: String,
        default: "text",
      },
    },

    // Identifiant client temporaire pour éviter les doublons d'affichage
    clientTempId: {
      type: String,
      default: null,
      index: true,
    },

    // ID de salle pour appels vidéo WebRTC
    callRoomId: {
      type: String,
      default: null,
    },

    // Réactions emoji
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Suppressions ciblées
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedForAll: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // Lecture
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Historique de modification (texte uniquement)
    editedAt: {
      type: Date,
      default: null,
    },

    // Épinglage par utilisateur (type WhatsApp)
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastPinnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Amélioration : index bidirectionnel pour conversation
messageSchema.index(
  { sender: 1, receiver: 1, createdAt: -1 },
  { background: true }
);

messageSchema.index(
  { receiver: 1, sender: 1, createdAt: -1 },
  { background: true }
);

module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

/*
  MODÈLE DE NOTIFICATION (STRICT)
  - userId : destinataire
  - type : "public" | "job"
  - actionType : nature de l'action
  - relatedId : identifiant lié à l'action
*/

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["public", "job"],
      required: true,
      index: true,
    },

    actionType: {
      type: String,
      required: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    replyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    // Expéditeur / auteur de l’action (optionnel pour affichage)
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Texte optionnel (pour affichage)
    text: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);

const mongoose = require("mongoose");

const reactionTypes = ["like", "love", "care", "haha", "wow", "sad", "angry"];

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: reactionTypes,
      required: true,
      default: "like",
    },
  },
  { _id: false }
);

const mediaSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video", "audio"], required: true },
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    media: mediaSubSchema, // 🔥 média sur la réponse (optionnel)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // 🔥 like réponses
    reactions: [reactionSchema], // 🔥 réactions détaillées
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    media: mediaSubSchema, // 🔥 média sur le commentaire (optionnel)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // 🔥 like commentaires
    reactions: [reactionSchema], // 🔥 réactions détaillées
    createdAt: { type: Date, default: Date.now },
    replies: [replySchema],
  },
  { _id: true }
);

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    sharedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    page: { type: mongoose.Schema.Types.ObjectId, ref: "Page", default: null },

    authorType: { type: String, enum: ["user", "page"], default: "user" },

    text: { type: String, default: "" },

    media: [mediaSubSchema],

    comments: [commentSchema],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isSponsored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);

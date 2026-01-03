const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, trim: true },
    categories: { type: [String], default: [] },
    bio: { type: String, default: "", trim: true },
    avatar: { type: String, default: "/default-avatar.png" },
    coverPhoto: { type: String, default: "/default-cover.jpg" },
    website: { type: String, default: "" },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    location: { type: String, default: "" },
    contact: { type: String, default: "" },

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PageSchema.index({
  name: "text",
  slug: "text",
  category: "text",
  categories: "text",
  bio: "text",
});

module.exports = mongoose.model("Page", PageSchema);

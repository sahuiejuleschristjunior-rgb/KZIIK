const mongoose = require("mongoose");

const SponsoredPostSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    ownerType: { type: String, enum: ["user", "page"], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ["draft", "review", "awaiting_payment", "active", "paused", "ended"],
      default: "draft",
    },
    creative: {
      text: { type: String, default: "" },
      link: { type: String, default: "" },
      media: [{ url: String, type: String }],
    },
    objective: { type: String, default: null },
    audience: {
      country: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      ageMin: { type: Number, default: null },
      ageMax: { type: Number, default: null },
      category: { type: String, default: "" },
    },
    budgetTotal: { type: Number, default: 0 },
    budgetDaily: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    targeting: { type: Object, default: null },
    review: {
      startedAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      emailSentAt: { type: Date, default: null },
    },
    payment: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "FCFA" },
      link: { type: String, default: "" },
      status: { type: String, enum: ["pending", "paid"], default: "pending" },
      emailSentAt: { type: Date, default: null },
    },
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
    archived: { type: Boolean, default: false },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SponsoredPost", SponsoredPostSchema);

const mongoose = require("mongoose");

const messageRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

messageRequestSchema.index(
  { fromUser: 1, toUser: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" }, background: true }
);

module.exports = mongoose.model("MessageRequest", messageRequestSchema);

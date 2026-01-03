const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length === 2;
        },
        message: "Une conversation doit avoir exactement 2 participants.",
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

conversationSchema.index(
  { participants: 1 },
  { background: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);

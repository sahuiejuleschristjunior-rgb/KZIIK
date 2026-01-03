const mongoose = require("mongoose");

module.exports = {
  connect: async () => {
    const uri = (process.env.MONGO_URI || "").trim();

    if (!uri) {
      const error = new Error(
        "MONGO_URI not set in env. Define it in .env or via PM2/host environment before starting the backend."
      );
      error.code = "MONGO_URI_MISSING";
      throw error;
    }

    try {
      return await mongoose.connect(uri, {
        autoIndex: false, // ❗ Empêche mongoose de recréer automatiquement les index
      });
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message || err);
      throw err;
    }
  },
};

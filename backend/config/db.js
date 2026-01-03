const mongoose = require('mongoose');

module.exports = {
  connect: async () => {
    const { MONGO_URI } = process.env;
    const uri = (MONGO_URI || "").trim();

    if (!uri) {
      throw new Error(
        "MONGO_URI not set in env. Define it in .env or via PM2/host environment before starting the backend."
      );
    }

    return mongoose.connect(uri, {
      autoIndex: false,     // ❗ Empêche mongoose de recréer automatiquement les index
    });
  }
};

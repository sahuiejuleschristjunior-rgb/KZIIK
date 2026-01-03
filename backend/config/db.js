const mongoose = require('mongoose');

module.exports = {
  connect: async () => {
    const { MONGO_URI } = process.env;

    if (!MONGO_URI) {
      throw new Error("MONGO_URI not set in env");
    }

    return mongoose.connect(MONGO_URI, {
      autoIndex: false,     // ❗ Empêche mongoose de recréer automatiquement les index
    });
  }
};

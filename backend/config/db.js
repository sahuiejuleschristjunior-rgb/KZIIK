const mongoose = require('mongoose');
const { MONGO_URI } = process.env;

module.exports = {
  connect: async () => {
    if (!MONGO_URI) throw new Error("MONGO_URI not set in env");

    return mongoose.connect(MONGO_URI, {
      autoIndex: false,     // ❗ Empêche mongoose de recréer automatiquement les index
    });
  }
};

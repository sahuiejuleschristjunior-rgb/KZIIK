/*******************************************************
 *  PURGE NOTIFICATIONS — SUPPRESSION TOTALE (ONE-SHOT) *
 *******************************************************/
require("dotenv").config();
const mongoose = require("mongoose");
const Notification = require("./models/Notification");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 7000,
    });
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ ERREUR CONNEXION MONGO — Abandon de la purge");
    console.error(err.message);
    process.exit(0);
  }
}

async function purge() {
  const result = await Notification.deleteMany({});
  console.log(`🧹 Notifications supprimées : ${result.deletedCount || 0}`);
  process.exit(0);
}

(async () => {
  await connectDB();
  await purge();
})();

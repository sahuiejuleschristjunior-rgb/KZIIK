const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("../config/loadEnv")();

const db = require("../config/db");
const User = require("../models/User");

const DEMO_USER = {
  name: "KZIIK TM",
  email: "masecobass@gmail.com",
  password: "@SUCCESS7",
  role: "user",
};

async function ensureDemoUser() {
  await db.connect();

  const hashedPassword = await bcrypt.hash(DEMO_USER.password, 10);

  const user = await User.findOneAndUpdate(
    { email: DEMO_USER.email },
    {
      $set: {
        name: DEMO_USER.name,
        password: hashedPassword,
        role: DEMO_USER.role,
        verified: true,
        otp: null,
        otpExpires: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return user;
}

(async () => {
  try {
    const user = await ensureDemoUser();
    console.log("✅ Utilisateur de démonstration prêt :", {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Impossible de créer l'utilisateur de démo:", err);
  } finally {
    await mongoose.connection.close();
  }
})();

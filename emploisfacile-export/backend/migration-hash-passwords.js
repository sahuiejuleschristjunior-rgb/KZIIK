// migration-hash-passwords.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

(async () => {
  try {
    console.log("🔄 Connexion à MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("📌 Recherche des comptes avec mot de passe non-haché...");
    const users = await User.find();

    let updated = 0;

    for (const user of users) {
      // Vérifie si le mot de passe semble déjà hashé
      // bcrypt génère des hash commençant par "$2"
      if (user.password.startsWith("$2")) {
        continue; // déjà sécurisé
      }

      console.log(`➡ Hachage du mot de passe pour ${user.email}`);

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(user.password, salt);

      user.password = hashed;
      await user.save();
      updated++;
    }

    console.log(`✅ Migration terminée : ${updated} mot(s) de passe haché(s)`);

    mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ ERREUR MIGRATION :", err);
    process.exit(1);
  }
})();
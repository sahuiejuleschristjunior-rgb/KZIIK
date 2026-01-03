/*******************************************************
 *  CLEANUP UPLOADS — VERSION PRO, STABLE ET SÉCURISÉE *
 *******************************************************/
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

/* =====================================================
   🟦 1) Connexion MongoDB (Sécurisée + Timeout propre)
   ===================================================== */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 7000,
    });
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ ERREUR CONNEXION MONGO — Abandon du nettoyage");
    console.error(err.message);
    process.exit(0); // Ne pas faire planter PM2 !
  }
}

/* =====================================================
   🟩 2) Modèle Post minimal (évite bugs)
   ===================================================== */
const Post = mongoose.model(
  "Post",
  new mongoose.Schema(
    {
      media: [
        {
          url: String,
          type: String,
        },
      ],
    },
    { strict: false }
  )
);

/**
 * Extract the filename from a media URL.
 * Handles both absolute URLs (https://domain/uploads/foo.webp)
 * and relative paths (/uploads/foo.webp or uploads/foo.webp).
 */
function getFileName(url) {
  if (!url || typeof url !== "string") return null;

  // Ignore query parameters (e.g., signed URLs)
  const clean = url.split("?")[0];

  try {
    const parsed = new URL(clean);
    return path.basename(parsed.pathname);
  } catch (_err) {
    // Not an absolute URL → treat as path
    return path.basename(clean);
  }
}

/* =====================================================
   🟧 3) Fonction principale
   ===================================================== */
async function cleanup() {
  const uploadDir = path.join(__dirname, "uploads");

  if (!fs.existsSync(uploadDir)) {
    console.log("⚠️ Aucun dossier uploads — rien à nettoyer.");
    process.exit(0);
  }

  console.log("📁 Lecture du dossier uploads…");

  const allFiles = fs.readdirSync(uploadDir);
  const usedFiles = new Set();

  /* -------------------------------------------
     🔍 Récupérer tous les fichiers utilisés
  ------------------------------------------- */
  const posts = await Post.find().lean();

  posts.forEach((post) => {
    if (Array.isArray(post.media)) {
      post.media.forEach((m) => {
        if (m.url) {
          const fileName = getFileName(m.url);

          if (!fileName) return;

          usedFiles.add(fileName);

          // thumbnail éventuel
          const ext = path.extname(fileName);
          const base = fileName.replace(ext, "");

          // Ancienne convention
          usedFiles.add(`${base}_thumb${ext}`);
          // Vidéos : thumbnails générés en .jpg avec suffixe -thumb
          usedFiles.add(`${base}-thumb.jpg`);
        }
      });
    }
  });

  console.log("📌 Fichiers utilisés :", usedFiles.size);

  /* -------------------------------------------
     🗑️ Suppression des fichiers orphelins
  ------------------------------------------- */
  let deleted = 0;

  for (const file of allFiles) {
    if (!usedFiles.has(file)) {
      const fullPath = path.join(uploadDir, file);
      try {
        fs.unlinkSync(fullPath);
        deleted++;
        console.log("🗑️ Supprimé :", file);
      } catch (err) {
        console.error("❌ Erreur suppression", file, err.message);
      }
    }
  }

  console.log(`✨ Nettoyage terminé. ${deleted} fichier(s) supprimé(s).`);
  process.exit(0);
}

/* =====================================================
   🟨 4) Exécution
   ===================================================== */
(async () => {
  await connectDB();
  await cleanup();
})();
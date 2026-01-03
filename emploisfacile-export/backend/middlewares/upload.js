const path = require("path");
const multer = require("multer");
const fs = require('fs');

// Définir le chemin d'upload et s'assurer que le dossier existe.
// Le chemin est maintenant: backend/uploads (si ce fichier est dans backend/middlewares)
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      // Nettoyer le nom de base pour n'autoriser que les caractères alphanumériques et '_'
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Format : nom_de_base-timestamp-random.ext
    cb(null, base + "-" + unique + ext);
  },
});

const allowed = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-m4v",
  "video/x-msvideo", // .avi
];

const allowedExtensions = [
  ".jpeg",
  ".jpg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".m4v",
  ".avi",
];

function fileFilter(req, file, cb) {
  const ext = (path.extname(file.originalname) || "").toLowerCase();

  if (allowed.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Le format du fichier n'est pas autorisé. Formats acceptés: Images (JPEG, PNG, GIF, WEBP) et Vidéos (MP4, MOV, AVI)."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 Mo
});

module.exports = upload;

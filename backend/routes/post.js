const router = require("express").Router();

// ✔️ Middleware d'auth
const auth = require("../middlewares/authMiddleware");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const postCtrl = require("../controllers/postController");
const { MAX_UPLOAD_BYTES } = require("../config/uploadLimits");

/* =====================================================
   📁 Création automatique du dossier uploads
===================================================== */
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =====================================================
   📦 Configuration Multer (stockage + filtrage)
===================================================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + ext);
  },
});

// Formats autorisés
const allowedTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

const allowedExtensions = [
  ".png",
  ".jpeg",
  ".jpg",
  ".webp",
  ".mp4",
  ".mov",
  ".m4v",
  ".avi",
  ".webm",
  ".mpeg",
];

function fileFilter(req, file, cb) {
  const ext = (path.extname(file.originalname) || "").toLowerCase();

  if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(ext)) {
    return cb(new Error("Format non supporté"), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

/* =====================================================
   📌 ROUTES POSTS
===================================================== */

// ➤ Créer un post (texte + fichiers)
router.post("/", auth, upload.array("files", 10), postCtrl.create);

// ➤ Mettre à jour un post
router.put("/:id", auth, upload.array("newMedia", 10), postCtrl.updatePost);

// ⭐⭐⭐ NOUVELLE ROUTE SCROLL INFINI
router.get("/paginated", auth, postCtrl.listPaginated);

// ➤ Liste complète des posts
router.get("/", auth, postCtrl.list);

// ➤ Liste des posts vidéo
router.get("/videos", auth, postCtrl.listVideoPosts);

// ⭐⭐⭐ ROUTE PUBLIC PROFILE (placer AVANT les routes dynamiques !)
router.get("/user/:id", auth, postCtrl.getPostsByUser);

// ➤ Récupérer les likes d'un post
router.get("/:id/likes", auth, postCtrl.getLikes);

// ➤ Like / unlike post
router.post("/:id/like", auth, postCtrl.like);

// ➤ Partager un post
router.post("/:id/share", auth, postCtrl.sharePost);

// =====================================================
// ⭐⭐⭐ COMMENTAIRES
// =====================================================

// ➤ Commentaire (texte + média)
router.post(
  "/:id/comment",
  auth,
  upload.single("media"),
  postCtrl.comment
);

// ➤ Like commentaire
router.post(
  "/:postId/comment/:commentId/like",
  auth,
  postCtrl.likeComment
);

// ➤ Réaction commentaire (👍❤️😂😮😢😡)
router.post(
  "/:postId/comment/:commentId/react",
  auth,
  postCtrl.reactToComment
);

// ➤ Supprimer un commentaire
router.delete("/:postId/comment/:commentId", auth, postCtrl.deleteComment);

// =====================================================
// ⭐⭐⭐ RÉPONSES AUX COMMENTAIRES
// =====================================================

// ➤ Répondre à un commentaire (texte + média)
router.post(
  "/:postId/comment/:commentId/reply",
  auth,
  upload.single("media"),
  postCtrl.reply
);

// ➤ Like réponse
router.post(
  "/:postId/comment/:commentId/reply/:replyId/like",
  auth,
  postCtrl.likeReply
);

// ➤ Réaction réponse
router.post(
  "/:postId/comment/:commentId/reply/:replyId/react",
  auth,
  postCtrl.reactToReply
);

// ➤ Supprimer une réponse
router.delete(
  "/:postId/comment/:commentId/reply/:replyId",
  auth,
  postCtrl.deleteReply
);

// =====================================================
// ➤ Supprimer un post
// =====================================================
router.delete("/:id", auth, postCtrl.deletePost);

module.exports = router;

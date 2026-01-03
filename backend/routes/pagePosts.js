const router = require("express").Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/pagesController");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + ext);
  },
});

const allowedTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
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
  ".mpeg",
  ".mp3",
  ".wav",
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
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.post("/:slug", auth, upload.array("files", 10), ctrl.createPagePost);
router.get("/:slug", auth, ctrl.getPagePosts);

module.exports = router;

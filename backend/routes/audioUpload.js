const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { TMP_DIR, launchAudioWorker } = require("../utils/audioWorker");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${tempId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post("/upload-audio", upload.single("audio"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: "Aucun fichier audio fourni" });
  }

  const tempId = path.parse(file.filename).name;

  res.json({
    success: true,
    tempId,
  });

  launchAudioWorker(file.path, tempId, console);
});

module.exports = router;

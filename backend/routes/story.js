const router = require("express").Router();

// ✔️ Correction : dossier "middlewares" (avec S)
const auth = require("../middlewares/authMiddleware");

const multer = require("multer");
const path = require("path");

const storyCtrl = require("../controllers/storyController");

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (_, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post("/", auth, upload.single("file"), storyCtrl.create);
router.get("/", auth, storyCtrl.list);

// Reactions aux stories
router.post("/:id/react", auth, storyCtrl.reactToStory);

module.exports = router;

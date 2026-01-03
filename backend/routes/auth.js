const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const auth = require("../controllers/authController");

// Middleware d'auth
const { isAuthenticated } = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

// 🔥 Import de la fonction pour récupérer un user
const { getUserById } = require("../controllers/authController");

// ===========================
// CONFIGURATION MULTER
// ===========================
const storage = multer.diskStorage({
  destination: (_, __, cb) =>
    cb(null, path.join(__dirname, "..", "uploads")),
  filename: (_, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ===========================
// AUTHENTIFICATION
// ===========================
router.post("/register", auth.register);
router.post("/verify-register", auth.verifyRegisterOtp);
router.post("/resend-register-otp", auth.resendRegisterOtp);

router.post("/login", auth.login);

router.post("/forgot", auth.forgotPassword);
router.post("/verify-reset", auth.verifyResetOtp);
router.post("/reset-password", auth.resetPassword);
router.post("/resend-reset-otp", auth.resendResetOtp);

// 🌟 PROFIL
router.get("/profile", isAuthenticated, auth.getProfile);
router.put("/profile", isAuthenticated, auth.updateProfile);
router.post("/change-password", isAuthenticated, auth.changePassword);

// 🌟 ROUTE IMPORTANTE POUR LE FRONT : /me
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await auth.me(req, res, true);
    if (!user) return;

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        companyName: user.companyName || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur /me",
    });
  }
});

// Upload Avatar
router.post(
  "/profile/avatar",
  isAuthenticated,
  upload.single("avatar"),
  auth.uploadProfilePicture
);

// Upload Cover
router.post(
  "/profile/cover",
  isAuthenticated,
  upload.single("cover"),
  auth.uploadCoverPhoto
);

// 🌟 NOUVELLE ROUTE PUBLIC PROFILE
router.get("/user/:id", isAuthenticated, getUserById);

// ===========================
// ADMIN
// ===========================
router.get("/admin/users", isAuthenticated, isAdmin, auth.getAllUsers);
router.put("/admin/upgrade/:id", isAuthenticated, isAdmin, auth.upgradeToAdmin);
router.put("/admin/downgrade/:id", isAuthenticated, isAdmin, auth.downgradeUser);
router.get("/admin/stats", isAuthenticated, isAdmin, auth.getStats);

module.exports = router;
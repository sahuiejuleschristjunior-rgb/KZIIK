const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailer = require("../utils/mailer");

const INSCRIPTION_FROM = process.env.SMTP_INSCRIPTION_FROM || "KZIIK <inscription@kziik.com>";

/* ================================
   Générateur OTP
================================ */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================================
   Création Token JWT
================================ */
function createToken(user) {
  const payload = { id: user._id, email: user.email, role: user.role };
  const jwtSecret = process.env.JWT_SECRET || "change_this_secret_now";
  return jwt.sign(payload, jwtSecret, { expiresIn: "30d" });
}

/* ============================================================
   INSCRIPTION
============================================================ */
async function register(req, res) {
  try {
    const { name, email, password, role, companyName } = req.body;

    const cleanedName = (name || "").trim();

    if (cleanedName.length < 5) {
      return res.status(400).json({ error: "Le nom complet doit contenir au moins 5 caractères" });
    }

    const parts = cleanedName.split(/\s+/);
    if (parts.length < 2) {
      return res.status(400).json({ error: "Veuillez entrer un nom et un prénom" });
    }

    if (/\d/.test(cleanedName)) {
      return res.status(400).json({ error: "Le nom ne doit pas contenir de chiffres" });
    }

    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
    if (!nameRegex.test(cleanedName)) {
      return res.status(400).json({ error: "Le nom contient des caractères non autorisés" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
    if (!pwRegex.test(password)) {
      return res.status(400).json({
        error: "Le mot de passe doit contenir au moins une lettre et un chiffre",
      });
    }

    if (role === "recruiter" && (!companyName || companyName.trim().length === 0)) {
      return res.status(400).json({ error: "Le nom de l'entreprise est requis pour les recruteurs." });
    }

    const allowedRoles = ["user", "candidate", "recruiter", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "user";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.verified) {
        const otp = generateOTP();
        existingUser.otp = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        await mailer.sendTemplateEmail(
          "otp_email.html",
          email,
          "Votre nouveau code de vérification",
          { OTP_CODE: otp },
          INSCRIPTION_FROM
        );

        return res.json({
          success: true,
          message: "Un nouveau code de vérification a été envoyé",
        });
      }

      return res.status(400).json({ error: "Cet email existe déjà" });
    }

    const otp = generateOTP();
    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      name: cleanedName,
      email,
      password: hashed,
      role: finalRole,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      verified: false,
    };

    if (finalRole === "recruiter" && companyName) {
      userData.companyName = companyName.trim();
    }

    await User.create(userData);

    await mailer.sendTemplateEmail(
      "otp_email.html",
      email,
      "Votre code de vérification",
      { OTP_CODE: otp },
      INSCRIPTION_FROM
    );

    res.json({ success: true, message: "OTP envoyé" });
  } catch (err) {
    console.error("register:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   VERIFY REGISTER OTP
============================================================ */
async function verifyRegisterOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });
    if (user.otp !== otp) return res.status(400).json({ error: "Code incorrect" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ error: "Code expiré" });

    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    await mailer.sendTemplateEmail(
      "welcome_email.html",
      email,
      "Bienvenue sur KZIIK 🎉",
      {},
      INSCRIPTION_FROM
    );

    const token = createToken(user);
    res.json({ success: true, token });
  } catch (err) {
    console.error("verifyRegisterOtp:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   RESEND REGISTER OTP
============================================================ */
async function resendRegisterOtp(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    await mailer.sendTemplateEmail(
      "otp_email.html",
      email,
      "Nouveau code de vérification",
      { OTP_CODE: otp },
      INSCRIPTION_FROM
    );

    res.json({ success: true, message: "Nouveau code envoyé" });
  } catch (err) {
    console.error("resendRegisterOtp:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   LOGIN
============================================================ */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Identifiants invalides" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Identifiants invalides" });

    if (!user.verified) return res.status(400).json({ error: "Email non vérifié" });

    const device = req.headers["user-agent"] || "Inconnu";
    const ip = req.headers["x-forwarded-for"] || req.ip || "Inconnue";
    const date = new Date().toLocaleString();

    await mailer.sendTemplateEmail(
      "new_login_alert.html",
      email,
      "Nouvelle connexion détectée",
      { DEVICE: device, IP: ip, DATE: date }
    );

    const token = createToken(user);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      verified: user.verified,
      createdAt: user.createdAt,
      companyName: user.companyName,
      companyInfo: user.companyInfo,
      candidateProfile: user.candidateProfile,
    };

    return res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error("login:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   FORGOT PASSWORD
============================================================ */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    await mailer.sendTemplateEmail(
      "otp_email.html",
      email,
      "Réinitialisation du mot de passe",
      { OTP_CODE: otp }
    );

    res.json({ success: true, message: "OTP envoyé" });
  } catch (err) {
    console.error("forgotPassword:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   RESET OTP
============================================================ */
async function verifyResetOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });
    if (user.otp !== otp) return res.status(400).json({ error: "Code incorrect" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ error: "Code expiré" });

    res.json({ success: true, message: "OTP validé" });
  } catch (err) {
    console.error("verifyResetOtp:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   RESEND RESET OTP
============================================================ */
async function resendResetOtp(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    await mailer.sendTemplateEmail(
      "otp_email.html",
      email,
      "Nouveau code de réinitialisation",
      { OTP_CODE: otp }
    );

    res.json({ success: true, message: "Nouveau code envoyé" });
  } catch (err) {
    console.error("resendResetOtp:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   RESET PASSWORD
============================================================ */
async function resetPassword(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Email inconnu" });

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: "Le mot de passe doit contenir au moins 8 caractères",
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.verified = true;
    user.otp = null;
    user.otpExpires = null;
    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    await mailer.sendTemplateEmail(
      "password_reset_success.html",
      email,
      "Mot de passe mis à jour",
      {}
    );

    res.json({ success: true });
  } catch (err) {
    console.error("resetPassword:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   GET PROFILE
============================================================ */
async function getProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(400).json({ error: "Token invalide" });

    const user = await User.findById(userId).select("-password -otp -otpExpires -__v");

    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("getProfile:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   UPDATE PROFILE
============================================================ */
async function updateProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const {
      name,
      companyName,
      companyInfo,
      candidateProfile,
      professionalProfile,
      bio,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (name) user.name = name;

    if (typeof bio === "string") {
      user.bio = bio.trim();
    }

    if (user.role === "recruiter") {
      if (companyName) user.companyName = companyName;
      if (companyInfo) user.companyInfo = companyInfo;
    } else if (user.role === "candidate") {
      if (candidateProfile) user.candidateProfile = candidateProfile;
      if (professionalProfile) user.professionalProfile = professionalProfile;
    }

    // Validate only the modified fields to avoid unrelated validation errors
    await user.save({ validateModifiedOnly: true });

    const safeUser = await User.findById(userId).select("-password -otp -otpExpires -__v");

    const profileData = {
      id: safeUser._id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      avatar: safeUser.avatar,
      coverPhoto: safeUser.coverPhoto,
      bio: safeUser.bio,
      verified: safeUser.verified,
      createdAt: safeUser.createdAt,
      companyName: safeUser.companyName,
      companyInfo: safeUser.companyInfo,
      candidateProfile: safeUser.candidateProfile,
      professionalProfile: safeUser.professionalProfile,
    };

    res.json({ success: true, user: profileData });
  } catch (err) {
    console.error("updateProfile:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   CHANGE PASSWORD
============================================================ */
async function changePassword(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ error: "Mot de passe actuel incorrect" });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Mot de passe mis à jour" });
  } catch (err) {
    console.error("changePassword:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   ROUTE /me
============================================================ */
async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "_id email role name avatar coverPhoto bio companyName companyInfo candidateProfile professionalProfile"
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error("me:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   UPLOAD PHOTO DE PROFIL
============================================================ */
async function uploadProfilePicture(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier d'avatar fourni." });
    }

    const newAvatarUrl = "/uploads/" + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: newAvatarUrl },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    res.json({
      success: true,
      message: "Photo de profil mise à jour avec succès.",
      avatar: newAvatarUrl,
    });
  } catch (err) {
    console.error("uploadProfilePicture:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de la photo de profil." });
  }
}

/* ============================================================
   UPLOAD PHOTO DE COUVERTURE
============================================================ */
async function uploadCoverPhoto(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier de couverture fourni." });
    }

    const newCoverUrl = "/uploads/" + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { coverPhoto: newCoverUrl },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    res.json({
      success: true,
      message: "Photo de couverture mise à jour avec succès.",
      coverPhoto: newCoverUrl,
    });
  } catch (err) {
    console.error("uploadCoverPhoto:", err);
    res.status(500).json({ error: "Erreur lors de la mise à jour de la photo de couverture." });
  }
}

/* ============================================================
   ADMIN — LISTE USERS
============================================================ */
async function getAllUsers(req, res) {
  try {
    const users = await User.find().select("-password -otp -otpExpires -__v");
    res.json({ success: true, users });
  } catch (err) {
    console.error("getAllUsers:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   ADMIN — PROMOTE ADMIN
============================================================ */
async function upgradeToAdmin(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    user.role = "admin";
    await user.save();

    res.json({ success: true, message: "Utilisateur promu admin" });
  } catch (err) {
    console.error("upgradeToAdmin:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   ADMIN — REMOVE ADMIN
============================================================ */
async function downgradeUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    user.role = "user";
    await user.save();

    res.json({ success: true, message: "Utilisateur rétrogradé" });
  } catch (err) {
    console.error("downgradeUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   ADMIN — STATS
============================================================ */
async function getStats(req, res) {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalUnverified = await User.countDocuments({ verified: false });

    const totalMembers = await User.countDocuments({ role: "user" });
    const totalCandidates = await User.countDocuments({ role: "candidate" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalUnverified,
        totalMembers,
        totalCandidates,
        totalRecruiters,
      },
    });
  } catch (err) {
    console.error("getStats:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   🔥 PUBLIC PROFILE : GET USER BY ID
============================================================ */
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -otp -otpExpires")
      .populate("friends.user", "name avatar");

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json(user);
  } catch (err) {
    console.error("Erreur getUserById:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/* ============================================================
   EXPORTS
============================================================ */
module.exports = {
  register,
  verifyRegisterOtp,
  resendRegisterOtp,
  login,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendResetOtp,
  getProfile,
  updateProfile,
  changePassword,
  me,
  getAllUsers,
  upgradeToAdmin,
  downgradeUser,
  getStats,
  uploadProfilePicture,
  uploadCoverPhoto,
  getUserById,     // <── ✔ ajout propre
};

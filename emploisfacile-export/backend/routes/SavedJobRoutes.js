// routes/SavedJobRoutes.js

const express = require("express");
const router = express.Router();
const SavedJobController = require("../controllers/SavedJobController");
const { isAuthenticated, isCandidate } = require("../middlewares/auth");

// ⭐ Ajouter un favori
router.post("/", isAuthenticated, isCandidate, SavedJobController.saveJob);

// 🗑 Retirer un favori
router.delete("/:jobId", isAuthenticated, isCandidate, SavedJobController.removeSavedJob);

// 📄 Voir mes favoris
router.get("/", isAuthenticated, isCandidate, SavedJobController.getMySavedJobs);

module.exports = router;
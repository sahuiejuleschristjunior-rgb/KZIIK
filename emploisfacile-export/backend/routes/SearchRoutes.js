const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const searchController = require("../controllers/SearchController");

// Recherche globale
router.get("/global", auth, searchController.globalSearch);

module.exports = router;
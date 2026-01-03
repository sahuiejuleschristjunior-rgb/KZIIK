const express = require("express");
const router = express.Router();

// Controllers
const socialCtrl = require("../controllers/socialController");

// Auth middleware
const { isAuthenticated } = require("../middlewares/auth");

// Sécurité : Si un handler n’existe pas → erreur contrôlée
const safe = (fnName) => {
  if (typeof socialCtrl[fnName] !== "function") {
    console.error("❌ socialController missing function:", fnName);
    return (req, res) =>
      res.status(500).json({ error: `Controller function ${fnName} not found.` });
  }
  return socialCtrl[fnName];
};

/* =======================
    AMIS
======================= */
router.post(
  "/friends/request/:id",
  isAuthenticated,
  safe("sendFriendRequest")
);

router.post(
  "/friends/accept/:id",
  isAuthenticated,
  safe("acceptFriendRequest")
);

router.post(
  "/friends/reject/:id",
  isAuthenticated,
  safe("rejectFriendRequest")
);

router.post(
  "/friends/cancel/:id",
  isAuthenticated,
  safe("cancelFriendRequest")
);

router.delete(
  "/friends/remove/:id",
  isAuthenticated,
  safe("removeFriend")
);

/* =======================
    CATÉGORIE D’AMI
======================= */
router.patch(
  "/friends/category/:id",
  isAuthenticated,
  safe("changeFriendCategory")
);

/* =======================
    LISTE DES AMIS ✅
======================= */
router.get(
  "/friends",
  isAuthenticated,
  safe("getFriends")
);

/* =======================
   FRIEND REQUESTS (REÇUES)
======================= */
router.get(
  "/requests",
  isAuthenticated,
  safe("getFriendRequests")
);

/* =======================
    FOLLOW
======================= */
router.post(
  "/follow/:id",
  isAuthenticated,
  safe("followUser")
);

router.post(
  "/unfollow/:id",
  isAuthenticated,
  safe("unfollowUser")
);

/* =======================
    BLOCK
======================= */
router.post(
  "/block/:id",
  isAuthenticated,
  safe("blockUser")
);

router.post(
  "/unblock/:id",
  isAuthenticated,
  safe("unblockUser")
);

/* =======================
   RELATION STATUS
======================= */
router.get(
  "/status/:id",
  isAuthenticated,
  safe("getRelationStatus")
);

/* =======================
   SOCIAL PROFILE
======================= */
router.get(
  "/profile/:id",
  isAuthenticated,
  safe("getSocialProfile")
);

module.exports = router;

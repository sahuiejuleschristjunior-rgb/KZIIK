const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/notificationController");

// 1. Lister les notifications
router.get("/", auth, ctrl.getNotifications);

// 2. Marquer toutes comme lues
router.put("/read-all", auth, ctrl.markAllAsRead);

// 3. Compter les non lues
router.get("/unread/count", auth, ctrl.countUnread);

// 4. Supprimer toutes les notifications utilisateur
router.delete("/cleanup", auth, ctrl.cleanupUserNotifications);

// 5. Supprimer par type (public/job)
router.delete("/by-type/:type", auth, ctrl.deleteByType);

// 6. Supprimer par action liée
router.delete("/by-related/:id", auth, ctrl.deleteByRelated);

// 7. Supprimer une notification
router.delete("/:id", auth, ctrl.deleteById);

module.exports = router;

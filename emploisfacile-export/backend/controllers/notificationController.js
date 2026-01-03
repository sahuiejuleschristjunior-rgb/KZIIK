const Notification = require("../models/Notification");

/* ============================================================
   📌 RÉCUPÉRER LES NOTIFICATIONS DE L'UTILISATEUR
   ============================================================ */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
      .populate("from", "name avatar role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION GET ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des notifications."
    });
  }
};


/* ============================================================
   📌 MARQUER TOUTES LES NOTIFICATIONS COMME LUES
   ============================================================ */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.deleteMany({ userId });

    res.json({ message: "Toutes les notifications ont été supprimées." });
  } catch (err) {
    console.error("NOTIFICATION READ ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la suppression."
    });
  }
};


/* ============================================================
   📌 COMPTER LES NOTIFICATIONS NON LUES
   ============================================================ */
exports.countUnread = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({
      userId,
    });

    res.json({ count });
  } catch (err) {
    console.error("NOTIFICATION COUNT ERROR:", err);
    res.status(500).json({
      error: "Erreur lors du comptage des notifications non lues."
    });
  }
};

/* ============================================================
   📌 SUPPRIMER TOUTES LES NOTIFICATIONS DE L'UTILISATEUR
   ============================================================ */
exports.cleanupUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.deleteMany({ userId });

    res.json({ message: "Notifications utilisateur supprimées." });
  } catch (err) {
    console.error("NOTIFICATION CLEANUP ERROR:", err);
    res.status(500).json({
      error: "Erreur lors du nettoyage des notifications.",
    });
  }
};

/* ============================================================
   📌 SUPPRIMER PAR TYPE (public/job)
   ============================================================ */
exports.deleteByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;

    if (!["public", "job"].includes(type)) {
      return res.status(400).json({ error: "Type invalide." });
    }

    await Notification.deleteMany({ userId, type });

    res.json({ message: "Notifications supprimées par type." });
  } catch (err) {
    console.error("NOTIFICATION DELETE BY TYPE ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la suppression par type.",
    });
  }
};

/* ============================================================
   📌 SUPPRIMER PAR ACTION LIÉE
   ============================================================ */
exports.deleteByRelated = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await Notification.deleteMany({
      userId,
      relatedId: id,
    });

    res.json({ message: "Notifications supprimées par action." });
  } catch (err) {
    console.error("NOTIFICATION DELETE BY RELATED ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la suppression par action.",
    });
  }
};

/* ============================================================
   📌 SUPPRIMER UNE NOTIFICATION
   ============================================================ */
exports.deleteById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await Notification.deleteOne({ _id: id, userId });

    res.json({ message: "Notification supprimée." });
  } catch (err) {
    console.error("NOTIFICATION DELETE ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la suppression.",
    });
  }
};

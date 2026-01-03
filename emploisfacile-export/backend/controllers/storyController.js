// controllers/storyController.js

const Story = require("../models/Story");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

/* ============================================================
   🔥 UTILITAIRE — NOTIFICATION + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  const notif = await Notification.create({
    userId,
    from: data.from || null,
    type: "public",
    actionType: data.actionType,
    relatedId: data.relatedId,
    text: data.text,
  });

  getIO().to(String(userId)).emit("notification:new", notif);

  return notif;
}

/* ============================================================
   📌 CRÉER UNE STORY
============================================================ */
exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier média trouvé." });
    }

    // Création story
    const story = await Story.create({
      user: req.user.id,
      media: "/uploads/" + req.file.filename,
      type: req.file.mimetype.startsWith("video") ? "video" : "image",
    });

    // 📣 NOTIFICATION — si l’auteur est un créateur : prévenir ses abonnés
    const author = await User.findById(req.user.id);

    if (author.isCreator && Array.isArray(author.followers)) {
      author.followers.forEach((followerId) => {
        pushNotification(followerId, {
          from: req.user.id,
          actionType: "story_new",
          relatedId: story._id,
          text: `${author.name} a publié une nouvelle story.`,
        });

        getIO().to(String(followerId)).emit("story:new", story);
      });
    }

    res.status(201).json(story);
  } catch (err) {
    console.error("STORY CREATE ERROR:", err);
    res.status(500).json({ error: "Erreur lors de la création de la story." });
  }
};


/* ============================================================
   📌 LISTE DES STORIES NON EXPIRÉES
============================================================ */
exports.list = async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gte: new Date() } })
      .populate("user", "name avatar isCreator")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error("STORY LIST ERROR:", err);
    res.status(500).json({ error: "Erreur lors du chargement des stories." });
  }
};


/* ============================================================
   📌 RÉACTION À UNE STORY + NOTIFICATION
============================================================ */
exports.reactToStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.id;
    const { reaction } = req.body;

    const validReactions = ["❤️", "😂", "👍", "🔥", "😮", "😢"];
    if (!validReactions.includes(reaction)) {
      return res.status(400).json({ message: "Type de réaction invalide." });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story non trouvée." });
    }

    const existingIndex = story.reactions.findIndex(
      (r) => r.user.toString() === userId
    );

    let action = null;

    if (existingIndex !== -1) {
      // Si déjà réagi
      const existing = story.reactions[existingIndex];

      if (existing.type === reaction) {
        story.reactions.splice(existingIndex, 1);
        action = "removed";
      } else {
        story.reactions[existingIndex].type = reaction;
        action = "updated";
      }
    } else {
      story.reactions.push({ user: userId, type: reaction });
      action = "created";
    }

    await story.save();

    // 👍 Tant que c'est pas toi qui réagit à ta propre story : envoyer une notif
    if (String(story.user) !== String(userId)) {
      await pushNotification(story.user, {
        from: userId,
        actionType: "story_reaction",
        relatedId: story._id,
        text: "A réagi à votre story.",
      });

      // Socket temps réel
      getIO().to(String(story.user)).emit("story:reaction", {
        storyId,
        userId,
        reaction,
      });
    }

    res.json({
      action,
      isReacted: action !== "removed",
      message:
        action === "removed"
          ? "Réaction retirée"
          : action === "updated"
          ? "Réaction mise à jour"
          : "Réaction ajoutée",
    });
  } catch (error) {
    console.error("Erreur réaction story :", error);
    res.status(500).json({
      message: "Erreur interne du serveur lors de la gestion de la réaction.",
    });
  }
};

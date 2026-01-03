// controllers/SavedJobController.js

const SavedJob = require("../models/SavedJob");
const Job = require("../models/Job");

/* ============================================================
   ⭐ Sauvegarder une offre
   POST /api/saved-jobs
============================================================ */
exports.saveJob = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId requis." });
    }

    // Vérifier si l'offre existe
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Offre introuvable." });
    }

    // Vérifier si déjà sauvegardée
    const exists = await SavedJob.findOne({
      job: jobId,
      candidate: candidateId,
    });

    if (exists) {
      return res.status(400).json({ message: "Déjà dans vos favoris." });
    }

    const saved = new SavedJob({
      candidate: candidateId,
      job: jobId,
    });

    await saved.save();

    return res.status(201).json({
      message: "Ajouté aux favoris.",
      saved,
    });
  } catch (err) {
    console.error("SAVE JOB ERROR:", err);
    return res.status(500).json({
      message: "Erreur serveur.",
      error: err.message,
    });
  }
};

/* ============================================================
   🗑 Retirer une offre des favoris
   DELETE /api/saved-jobs/:jobId
============================================================ */
exports.removeSavedJob = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const { jobId } = req.params;

    const deleted = await SavedJob.findOneAndDelete({
      candidate: candidateId,
      job: jobId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Cette offre n'est pas dans vos favoris." });
    }

    return res.json({ message: "Retirée des favoris." });
  } catch (err) {
    console.error("REMOVE FAVORITE ERROR:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* ============================================================
   📄 Récupérer tous les favoris d’un candidat
   GET /api/saved-jobs
============================================================ */
exports.getMySavedJobs = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const list = await SavedJob.find({ candidate: candidateId })
      .populate({
        path: "job",
        populate: { path: "recruiter", select: "name companyName" },
      })
      .sort({ createdAt: -1 });

    return res.json(list);
  } catch (err) {
    console.error("FAVORITES LIST ERROR:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
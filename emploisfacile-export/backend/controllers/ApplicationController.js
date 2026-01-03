const mongoose = require("mongoose");
const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");

/* ============================================================
   POST /api/applications
   ➤ Le candidat postule à une offre
============================================================ */
exports.applyToJob = async (req, res) => {
  const { jobId, message } = req.body;
  const candidateId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Identifiant d'offre invalide." });
    }

    // Vérifier que le job existe
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Offre d'emploi introuvable." });
    }

    // Empêcher la double candidature
    const existing = await Application.findOne({
      job: jobId,
      candidate: candidateId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Vous avez déjà postulé à cette offre.",
      });
    }

    // Créer la candidature
    const application = await Application.create({
      job: jobId,
      candidate: candidateId,
      message: message || "",
      status: "Pending",
    });

    // Ajouter la candidature dans le Job
    await Job.findByIdAndUpdate(jobId, {
      $push: { applications: application._id },
    });

    return res.status(201).json({
      success: true,
      message: "Candidature envoyée avec succès.",
      application,
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la création de la candidature.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/my-applications
   ➤ Candidat : voir ses propres candidatures
============================================================ */
exports.getMyApplications = async (req, res) => {
  const candidateId = req.user.id;

  try {
    const applications = await Application.find({ candidate: candidateId })
      .populate({
        path: "job",
        select: "title location contractType salaryRange recruiter",
        populate: {
          path: "recruiter",
          select: "name companyName email avatar",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidatures.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/status?jobId=:jobId
   ➤ Candidat : vérifier s'il a déjà postulé
============================================================ */
exports.getApplicationStatus = async (req, res) => {
  const { jobId } = req.query;
  const candidateId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Identifiant d'offre invalide." });
    }

    const existing = await Application.findOne({
      job: jobId,
      candidate: candidateId,
    }).select("_id");

    return res.status(200).json({ hasApplied: Boolean(existing) });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la vérification de la candidature.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/job/:jobId
   ➤ Recruteur : voir les candidats d'une offre
============================================================ */
exports.getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const recruiterId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Identifiant d'offre invalide." });
    }

    // Vérifier que le job appartient au recruteur
    const job = await Job.findOne({ _id: jobId, recruiter: recruiterId });

    if (!job) {
      return res.status(404).json({
        message: "Offre introuvable ou non autorisée.",
      });
    }

    const applications = await Application.find({ job: jobId })
      .populate("candidate", "name email role avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json(applications);

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidats.",
      details: error.message,
    });
  }
};

/* ============================================================
   PATCH /api/applications/:applicationId/status
   ➤ Recruteur : changer statut de candidature
============================================================ */
exports.updateApplicationStatus = async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;
  const recruiterId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Identifiant de candidature invalide." });
    }

    const application = await Application.findById(applicationId)
      .populate("job", "recruiter");

    if (!application) {
      return res.status(404).json({ message: "Candidature introuvable." });
    }

    if (String(application.job.recruiter) !== recruiterId) {
      return res.status(403).json({
        message: "Vous n'êtes pas autorisé à modifier cette candidature.",
      });
    }

    const allowedStatuses = [
      "Pending",
      "Reviewing",
      "Interview",
      "Accepted",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Statut invalide." });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Statut mis à jour : ${status}`,
      application,
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la mise à jour du statut.",
      details: error.message,
    });
  }
};

/* ============================================================
   GET /api/applications/recruiter/all
   ➤ Recruteur : voir toutes ses candidatures globales
============================================================ */
exports.getAllApplicationsForRecruiter = async (req, res) => {
  const recruiterId = req.user.id;

  try {
    // 1️⃣ Récupérer les jobs du recruteur
    const jobs = await Job.find({ recruiter: recruiterId }).select("_id title");

    const jobIds = jobs.map((j) => j._id);

    // 2️⃣ Toutes les candidatures des jobs
    const applications = await Application.find({
      job: { $in: jobIds },
    })
      .populate("candidate", "name email avatar role")
      .populate("job", "title location contractType")
      .lean();

    // 3️⃣ Trier : actifs en haut, rejetés en bas
    const sorted = applications.sort((a, b) => {
      const order = {
        Pending: 1,
        Reviewing: 2,
        Interview: 3,
        Accepted: 4,
        Rejected: 5,
      };
      return order[a.status] - order[b.status];
    });

    return res.status(200).json(sorted);

  } catch (error) {
    return res.status(500).json({
      error: "Erreur serveur lors de la récupération des candidatures recruteur.",
      details: error.message,
    });
  }
};

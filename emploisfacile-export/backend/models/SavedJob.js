// models/SavedJob.js

const mongoose = require("mongoose");

const savedJobSchema = new mongoose.Schema({
  // Candidat qui sauvegarde l'offre
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Offre d'emploi sauvegardée
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },

  // Date à laquelle l'offre a été ajoutée en favoris
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔒 Un candidat ne peut sauvegarder la même offre qu'une seule fois
savedJobSchema.index({ candidate: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("SavedJob", savedJobSchema);
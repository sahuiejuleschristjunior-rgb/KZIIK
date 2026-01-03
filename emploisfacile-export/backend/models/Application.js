const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // Offre associée
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },

    // Candidat
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Statut de la candidature
    status: {
      type: String,
      enum: ['Pending', 'Reviewing', 'Interview', 'Accepted', 'Rejected'],
      default: 'Pending',
    },

    // Message facultatif du candidat
    message: {
      type: String,
      default: '',
    },

    // CV associé à cette candidature
    cvUrl: {
      type: String,
      default: '',
    },

    // Dates automatiques
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt automatiques
  }
);

// Empêcher double candidature
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
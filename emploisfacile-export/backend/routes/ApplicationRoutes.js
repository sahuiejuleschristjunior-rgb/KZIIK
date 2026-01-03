const express = require('express');
const router = express.Router();

// Controllers
const ApplicationController = require('../controllers/ApplicationController');

// Middlewares
const { 
    isAuthenticated, 
    isCandidate, 
    isRecruiter 
} = require('../middlewares/auth');


// ==================================================
// CANDIDAT : créer et consulter ses candidatures
// ==================================================

// POST /api/applications
// ➤ Le candidat postule à une offre
router.post(
    '/',
    isAuthenticated,
    isCandidate,
    ApplicationController.applyToJob
);

// GET /api/applications/my-applications
// ➤ Candidat : voir ses propres candidatures
router.get(
    '/my-applications',
    isAuthenticated,
    isCandidate,
    ApplicationController.getMyApplications
);

// GET /api/applications/status?jobId=:jobId
// ➤ Candidat : vérifier le statut d'une candidature
router.get(
    '/status',
    isAuthenticated,
    isCandidate,
    ApplicationController.getApplicationStatus
);


// ==================================================
// RECRUTEUR : consulter et gérer les candidatures
// ==================================================

// GET /api/applications/job/:jobId
// ➤ Recruteur : voir les candidats pour un job donné
router.get(
    '/job/:jobId',
    isAuthenticated,
    isRecruiter,
    ApplicationController.getJobApplications
);

// GET /api/applications/all
// ➤ Recruteur : voir toutes ses candidatures (tous jobs confondus)
router.get(
    '/all',
    isAuthenticated,
    isRecruiter,
    ApplicationController.getAllApplicationsForRecruiter
);

// PATCH /api/applications/:applicationId/status
// ➤ Recruteur : modifier le statut d’une candidature
router.patch(
    '/:applicationId/status',
    isAuthenticated,
    isRecruiter,
    ApplicationController.updateApplicationStatus
);


module.exports = router;

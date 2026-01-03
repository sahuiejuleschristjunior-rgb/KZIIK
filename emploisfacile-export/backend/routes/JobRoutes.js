const express = require('express');
const router = express.Router();
const JobController = require('../controllers/JobController');

// Middleware principal d'auth (authMiddleware.js)
const auth = require('../middlewares/authMiddleware');

// Vérifie si un utilisateur est recruteur
// -> basé sur req.user.role
const isRecruiter = (req, res, next) => {
  if (req.user?.role !== "recruiter") {
    return res.status(403).json({ error: "Accès réservé aux recruteurs" });
  }
  next();
};

// POST /api/jobs - Créer une offre (réservé aux recruteurs)
router.post('/', auth, isRecruiter, JobController.createJob);

// GET /api/jobs/my-jobs - Offres publiées par le recruteur connecté
router.get('/my-jobs', auth, isRecruiter, JobController.getMyJobs);

// GET /api/jobs/search - Recherche backend (tous profils)
router.get('/search', auth, JobController.searchJobs);

// GET /api/jobs/:id - Détails d'une offre
router.get('/:id', auth, JobController.getJobById);

// GET /api/jobs - Toutes les offres (feed général)
router.get('/', auth, JobController.getAllJobs);

module.exports = router;

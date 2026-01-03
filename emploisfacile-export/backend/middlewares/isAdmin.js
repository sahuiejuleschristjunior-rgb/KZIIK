module.exports = (req, res, next) => {
  try {
    // Vérifie qu'un utilisateur est attaché au req (grâce au middleware auth)
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    // Vérifie si l'utilisateur a le rôle admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs" });
    }

    // Continue vers la route
    next();
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur (isAdmin)" });
  }
};

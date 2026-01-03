const jwt = require("jsonwebtoken");

/**
 * 🔥 MIDDLEWARE PRINCIPAL
 * Vérifie le JWT et attache req.user = { id, role }
 */
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Accès refusé. Token manquant ou invalide.",
    });
  }

  const rawToken = authHeader.split(" ")[1]?.trim().replace(/^"|"$/g, "");

  // Vérifie rapidement le format du token pour éviter les erreurs "jwt malformed".
  const parts = rawToken?.split(".");
  const hasValidParts = parts && parts.length === 3 && parts.every((p) => Boolean(p));

  if (!rawToken || rawToken === "null" || rawToken === "undefined" || !hasValidParts) {
    return res.status(401).json({
      error: "Accès refusé. Token manquant ou invalide.",
    });
  }

  try {
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);

    // Décode : { id: xxx, role: xxx }
    req.user = {
      id: decoded.id,
      role: decoded.role || null,
    };

    next();
  } catch (err) {
    console.error("JWT Verification Error:", err);
    return res.status(401).json({
      error: "Token expiré ou invalide.",
    });
  }
};

/**
 * 🔥 Vérifier rôle CANDIDAT
 */
const isCandidate = (req, res, next) => {
  if (req.user?.role === "candidate") return next();

  return res.status(403).json({
    error: "Accès refusé : rôle Candidat requis.",
  });
};

/**
 * 🔥 Vérifier rôle RECRUTEUR
 */
const isRecruiter = (req, res, next) => {
  if (req.user?.role === "recruiter") return next();

  return res.status(403).json({
    error: "Accès refusé : rôle Recruteur requis.",
  });
};

/**
 * 🔥 EXPORTS
 */
module.exports = {
  isAuthenticated,
  isCandidate,
  isRecruiter,
};

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;

    if (!auth)
      return res.status(401).json({ error: "Unauthorized" });

    const parts = auth.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Invalid token format" });

    const token = parts[1];

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "change_this_secret_now"
    );

    // 🔥 CRITIQUE : compatibilité avec tous les controllers
    req.user = payload;
    req.user.id = payload.id;    // <— indispensable
    req.userId = payload.id;     // pour compatibilité ancienne

    next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
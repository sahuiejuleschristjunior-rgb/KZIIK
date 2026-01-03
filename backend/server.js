require("./config/loadEnv")();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

// DB
const db = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const uploadRoutes = require("./routes/upload");
const storyRoutes = require("./routes/story");
const notificationRoutes = require("./routes/notifications");
const messageRoutes = require("./routes/MessageRoutes");
const pagesRoutes = require("./routes/pages");
const pagePostsRoutes = require("./routes/pagePosts");

// ⭐ SEARCH
const searchRoutes = require("./routes/SearchRoutes");

const adsRoutes = require("./routes/ads");

// ⭐ SOCIAL SYSTEM (amis + follow)
const socialRoutes = require("./routes/socialRoutes");

// Socket.io
const { initSocket } = require("./socket");

// Express
const app = express();
const server = http.createServer(app);

// 🔒 PORT FIXE (PRODUCTION SAFE)
const PORT = process.env.PORT || 3000;

/* ============================================================
   CORS
============================================================ */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ============================================================
   BODY PARSER
============================================================ */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ============================================================
   STATIC FILES
============================================================ */
// Serve uploaded files under both /uploads and /api/uploads for backward compatibility
const uploadsPath = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsPath));
app.use("/api/uploads", express.static(uploadsPath));

/* ============================================================
   ROUTES API (TOUTES sous /api)
============================================================ */

// Regroupe toutes les routes sous le préfixe /api
const apiRouter = express.Router();

// Exemple obligatoire : /api/auth/register
apiRouter.use("/auth", authRoutes);

apiRouter.use("/posts", postRoutes);
apiRouter.use("/stories", storyRoutes);
apiRouter.use("/upload", uploadRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/messages", messageRoutes);
apiRouter.use("/search", searchRoutes);
apiRouter.use("/social", socialRoutes);
apiRouter.use("/ads", adsRoutes);

// ⭐ PAGES
apiRouter.use("/pages", pagesRoutes);
apiRouter.use("/page-posts", pagePostsRoutes);

// Santé API
apiRouter.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Monte toutes les routes d'API sous le préfixe /api
app.use("/api", apiRouter);

/* ============================================================
   SOCKET.IO
============================================================ */
initSocket(server);

/* ============================================================
   🔍 DEBUG SAFE (OPTIONNEL – NE PLANTE JAMAIS)
============================================================ */
function dumpRoutesSafe() {
  try {
    if (!app._router || !app._router.stack) return;

    console.log("========== 📋 ROUTES EXPRESS ==========");
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .join(",")
          .toUpperCase();
        console.log(`🧭 ${methods} ${layer.route.path}`);
      }
    });
    console.log("======================================");
  } catch (err) {
    // 🔇 jamais bloquer le serveur pour du debug
  }
}

/* ============================================================
   START SERVER
============================================================ */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`KZIIK backend running on port ${PORT}`);

  // 🔍 active seulement si besoin
  // dumpRoutesSafe();
});

const connectWithRetry = async () => {
  try {
    await db.connect();
    console.log("✔ Database connected");
  } catch (err) {
    console.error("❌ DB ERROR :", err);
    console.log("⏳ Retrying database connection in 5s...");
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

  

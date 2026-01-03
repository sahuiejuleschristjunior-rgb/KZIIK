require("dotenv").config();
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
const jobRoutes = require("./routes/JobRoutes");
const applicationRoutes = require("./routes/ApplicationRoutes");
const storyRoutes = require("./routes/story");
const notificationRoutes = require("./routes/notifications");
const savedJobRoutes = require("./routes/SavedJobRoutes");
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
const PORT = Number(process.env.PORT) || 3000;

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
   ROUTES API
============================================================ */

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/ads", adsRoutes);

// ⭐ PAGES
app.use("/api/pages", pagesRoutes);
app.use("/api/page-posts", pagePostsRoutes);

/* ============================================================
   HEALTH CHECK
============================================================ */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

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
db.connect()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log("✔ Backend running on port", PORT);

      // 🔍 active seulement si besoin
      // dumpRoutesSafe();
    });
  })
  .catch((err) => {
    console.error("❌ DB ERROR :", err);
    process.exit(1);
  });

  
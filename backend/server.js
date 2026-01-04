const path = require("path");
require("./config/loadEnv")();
const express = require("express");
const cors = require("cors");
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
const audioUploadRoutes = require("./routes/audioUpload");

// ⭐ SOCIAL SYSTEM (amis + follow)
const socialRoutes = require("./routes/socialRoutes");

// Socket.io
const { initSocket } = require("./socket");

// Express
const app = express();
const server = http.createServer(app);

// 🔒 PORT FIXE (PRODUCTION SAFE)
const PORT = process.env.PORT || 3000;
const envFilePath = path.join(__dirname, ".env");

const getMongoUri = () => (process.env.MONGO_URI || "").trim();

let serverStarted = false;

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
app.use((req, res, next) => {
  if (req.url.endsWith(".mp3")) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
  }
  next();
});

app.get("/uploads/audio/:file", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(__dirname, "uploads/audio", req.params.file);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(filePath, { start, end });
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "audio/mpeg"
  });
  stream.pipe(res);
});

app.use("/uploads", express.static(uploadsPath));
app.use((req, res, next) => {
  if (req.url.endsWith(".mp3")) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
  }
  next();
});

app.get("/uploads/audio/:file", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const filePath = path.join(__dirname, "uploads/audio", req.params.file);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(filePath, { start, end });
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "audio/mpeg"
  });
  stream.pipe(res);
});

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
apiRouter.use("/audio", audioUploadRoutes);

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
const validateEnv = () => {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.error("❌ DB ERROR : MONGO_URI not set in env");
    console.error(
      `Ajoutez MONGO_URI dans ${envFilePath} ou exportez-la via l'environnement PM2 (pm2 start ecosystem.config.js --update-env).`
    );
    process.exit(1);
  }

  console.log(`✅ MONGO_URI détectée via ${envFilePath}`);
};

const startServer = () => {
  if (serverStarted) return;

  server.listen(PORT, "0.0.0.0", () => {
    serverStarted = true;
    console.log(`KZIIK backend running on port ${PORT}`);

    // 🔍 active seulement si besoin
    // dumpRoutesSafe();
  });
};

const connectWithRetry = async () => {
  try {
    await db.connect();
    console.log("✔ Database connected");
    startServer();
  } catch (err) {
    console.error("❌ DB ERROR :", err);

    // En cas de variable manquante, on sort immédiatement pour éviter une boucle infinie
    if (err && (err.code === "MONGO_URI_MISSING" || String(err.message || "").includes("MONGO_URI"))) {
      process.exit(1);
    }

    console.log("⏳ Retrying database connection in 5s...");
    setTimeout(connectWithRetry, 5000);
  }
};

validateEnv();
connectWithRetry();

  

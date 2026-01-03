const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const uploadsDir = path.join(__dirname, "../uploads");
const ffprobePath = ffmpegPath
  ? ffmpegPath.replace(/ffmpeg(\.exe)?$/, (match, ext) => `ffprobe${ext || ""}`)
  : null;

if (ffprobePath && fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

const JOB_MEDIA = {
  imageMimes: new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]),
  videoMimes: new Set(["video/mp4"]),
  imageExtensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  videoExtensions: new Set([".mp4"]),
  maxImages: 5,
  maxVideos: 1,
  maxVideoSeconds: 300,
};

const generateName = (extension) =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

const ensureFileCopied = async (src, dest) => {
  try {
    await fs.promises.copyFile(src, dest);
  } catch (err) {
    console.error("[upload] fallback copy failed", err);
  }
};

const processImageAsync = (file, targetPath) => {
  setImmediate(async () => {
    try {
      await sharp(file.path)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(targetPath);
    } catch (err) {
      console.error("[upload] image compression failed", err);
      await ensureFileCopied(file.path, targetPath);
    }
  });
};

const processVideoAsync = (file, targetPath, thumbnailPath) => {
  setImmediate(() => {
    ffmpeg(file.path)
      .setFfmpegPath(ffmpegPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-b:v 1200k", "-preset veryfast", "-movflags +faststart"])
      .on("error", async (err) => {
        console.error("[upload] video compression failed", err);
        await ensureFileCopied(file.path, targetPath);
      })
      .on("end", () => {
        ffmpeg(file.path)
          .setFfmpegPath(ffmpegPath)
          .screenshots({
            count: 1,
            timemarks: ["1"],
            filename: path.basename(thumbnailPath),
            folder: uploadsDir,
          })
          .on("error", (err) =>
            console.error("[upload] thumbnail generation failed", err)
          );
      })
      .save(targetPath);
  });
};

const isJobImage = (file) => {
  const ext = (path.extname(file.originalname) || "").toLowerCase();
  return JOB_MEDIA.imageMimes.has(file.mimetype) || JOB_MEDIA.imageExtensions.has(ext);
};

const isJobVideo = (file) => {
  const ext = (path.extname(file.originalname) || "").toLowerCase();
  return JOB_MEDIA.videoMimes.has(file.mimetype) || JOB_MEDIA.videoExtensions.has(ext);
};

const cleanupUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map((file) =>
      fs.promises.unlink(file.path).catch(() => {
        // Ignore cleanup errors
      })
    )
  );
};

const getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata?.format?.duration;
      resolve(Number.isFinite(duration) ? duration : null);
    });
  });

router.post("/file", upload.array("files", 10), (req, res) => {
  const urls = (req.files || []).map((file) => {
    const mime = file.mimetype || "";

    if (mime.startsWith("image/")) {
      const outputName = generateName(".webp");
      const outputPath = path.join(uploadsDir, outputName);
      processImageAsync(file, outputPath);
      return `/uploads/${outputName}`;
    }

    if (mime.startsWith("video/")) {
      const outputName = generateName(".mp4");
      const outputPath = path.join(uploadsDir, outputName);
      const thumbName = `${path.parse(outputName).name}-thumb.jpg`;
      const thumbPath = path.join(uploadsDir, thumbName);
      processVideoAsync(file, outputPath, thumbPath);
      return `/uploads/${outputName}`;
    }

    return `/uploads/${file.filename}`;
  });

  return res.json({
    success: true,
    urls,
  });
});

router.post("/job-media", upload.array("files", 6), async (req, res) => {
  const files = req.files || [];

  if (!files.length) {
    return res.status(400).json({
      success: false,
      error: "Aucun fichier envoyé.",
    });
  }

  const images = files.filter(isJobImage);
  const videos = files.filter(isJobVideo);
  const invalid = files.filter((file) => !isJobImage(file) && !isJobVideo(file));

  if (invalid.length) {
    await cleanupUploadedFiles(files);
    return res.status(400).json({
      success: false,
      error: "Formats autorisés : jpg, jpeg, png, webp et mp4.",
    });
  }

  if (images.length > JOB_MEDIA.maxImages) {
    await cleanupUploadedFiles(files);
    return res.status(400).json({
      success: false,
      error: "Maximum 5 images autorisées.",
    });
  }

  if (videos.length > JOB_MEDIA.maxVideos) {
    await cleanupUploadedFiles(files);
    return res.status(400).json({
      success: false,
      error: "Une seule vidéo est autorisée.",
    });
  }

  if (videos.length === 1) {
    try {
      const duration = await getVideoDuration(videos[0].path);
      if (!duration || duration > JOB_MEDIA.maxVideoSeconds) {
        await cleanupUploadedFiles(files);
        return res.status(400).json({
          success: false,
          error: "La durée de la vidéo ne doit pas dépasser 5 minutes.",
        });
      }
    } catch (err) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        success: false,
        error: "Impossible de vérifier la durée de la vidéo.",
      });
    }
  }

  const urls = files.map((file) => {
    if (isJobImage(file)) {
      const outputName = generateName(".webp");
      const outputPath = path.join(uploadsDir, outputName);
      processImageAsync(file, outputPath);
      return `/uploads/${outputName}`;
    }

    if (isJobVideo(file)) {
      const outputName = generateName(".mp4");
      const outputPath = path.join(uploadsDir, outputName);
      const thumbName = `${path.parse(outputName).name}-thumb.jpg`;
      const thumbPath = path.join(uploadsDir, thumbName);
      processVideoAsync(file, outputPath, thumbPath);
      return `/uploads/${outputName}`;
    }

    return `/uploads/${file.filename}`;
  });

  return res.json({
    success: true,
    urls,
  });
});

module.exports = router;

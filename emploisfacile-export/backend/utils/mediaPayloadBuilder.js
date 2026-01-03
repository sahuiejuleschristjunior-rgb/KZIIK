const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function copyOriginal(filePath, targetPath) {
  try {
    await fs.promises.copyFile(filePath, targetPath);
  } catch (err) {
    console.error("[upload] fallback copy failed", err);
  }
}

function compressImageAsync(file, targetPath) {
  setImmediate(async () => {
    try {
      await sharp(file.path)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(targetPath);
    } catch (err) {
      console.error("[upload] image compression failed", err);
      await copyOriginal(file.path, targetPath);
    }
  });
}

function detectType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function buildMediaPayload(file) {
  if (!file) return null;

  const mime = file.mimetype || "";

  if (mime.startsWith("image/")) {
    const targetName = `${path.parse(file.filename).name}.webp`;
    const targetPath = path.join(uploadsDir, targetName);
    compressImageAsync(file, targetPath);

    return {
      url: `/uploads/${targetName}`,
      type: "image",
    };
  }

  return {
    url: `/uploads/${file.filename}`,
    type: detectType(mime),
  };
}

module.exports = { buildMediaPayload };

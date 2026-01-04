const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const DEFAULT_MIN_SIZE_BYTES = 5 * 1024; // 5 KB
const DEFAULT_MIN_DURATION_SECONDS = 0.5;
const ffprobeExecutable = process.env.FFPROBE_PATH || "ffprobe";

function throwDetailed(message, context = {}) {
  const error = new Error(message);
  error.context = context;
  throw error;
}

async function probeAudio(filePath) {
  const args = [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_type,duration",
    "-of",
    "json",
    filePath,
  ];

  const { stdout } = await execFileAsync(ffprobeExecutable, args);
  let parsed = {};

  try {
    parsed = JSON.parse(stdout || "{}");
  } catch (error) {
    throwDetailed("Réponse ffprobe invalide", { error: error.message, stdout });
  }
  const streams = parsed.streams || [];
  return streams.find((s) => s.codec_type === "audio") || null;
}

async function validateAudio(
  filePath,
  {
    minSizeBytes = DEFAULT_MIN_SIZE_BYTES,
    minDurationSeconds = DEFAULT_MIN_DURATION_SECONDS,
  } = {}
) {
  if (!filePath) {
    throwDetailed("Chemin du fichier audio manquant");
  }

  if (!fs.existsSync(filePath)) {
    throwDetailed("Fichier audio introuvable", { filePath });
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throwDetailed("Chemin fourni n'est pas un fichier", { filePath });
  }

  if (stats.size < minSizeBytes) {
    throwDetailed("Fichier audio trop petit", { filePath, size: stats.size });
  }

  let stream;
  try {
    stream = await probeAudio(filePath);
  } catch (error) {
    throwDetailed("Analyse audio impossible (ffprobe)", {
      filePath,
      error: error.message,
    });
  }

  if (!stream) {
    throwDetailed("Flux audio introuvable", { filePath });
  }

  const duration = parseFloat(stream.duration || "0");
  if (!Number.isFinite(duration) || duration < minDurationSeconds) {
    throwDetailed("Durée audio insuffisante", { filePath, duration });
  }

  return {
    duration,
    size: stats.size,
  };
}

module.exports = {
  validateAudio,
};

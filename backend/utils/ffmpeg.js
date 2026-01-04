const fs = require("fs");

const DEFAULT_FFMPEG_PATH = "/usr/bin/ffmpeg";
const DEFAULT_FFPROBE_PATH = "/usr/bin/ffprobe";

const ffmpegPath = process.env.FFMPEG_PATH || DEFAULT_FFMPEG_PATH;
const ffprobePath = process.env.FFPROBE_PATH || DEFAULT_FFPROBE_PATH;

function isExecutableAvailable(executablePath) {
  return Boolean(executablePath && fs.existsSync(executablePath));
}

function logExecutableAvailability(label, executablePath, envVar) {
  if (isExecutableAvailable(executablePath)) {
    console.log(`✅ ${label} configuré : ${executablePath}`);
    return;
  }

  const envHint = envVar ? ` (variable ${envVar})` : "";
  console.warn(
    `⚠ ${label} introuvable${envHint} : ${executablePath || "non défini"}`
  );
}

module.exports = {
  DEFAULT_FFMPEG_PATH,
  DEFAULT_FFPROBE_PATH,
  ffmpegPath,
  ffprobePath,
  isExecutableAvailable,
  logExecutableAvailability,
};

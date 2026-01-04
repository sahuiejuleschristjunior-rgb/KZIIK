const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");

const execFileAsync = promisify(execFile);
const ffmpegExecutable = process.env.FFMPEG_PATH || ffmpegPath || "ffmpeg";

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function convertWebmToMp3(inputPath, outputPath) {
  if (!inputPath || !outputPath) {
    throw new Error("Chemins d'entrée et de sortie requis pour la conversion audio.");
  }

  ensureDir(outputPath);

  const args = [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-b:a",
    "128k",
    "-f",
    "mp3",
    outputPath,
  ];

  try {
    await execFileAsync(ffmpegExecutable, args);
    return { success: true, outputPath };
  } catch (error) {
    const message = error?.stderr || error?.message || "Conversion audio échouée";
    throw new Error(message);
  }
}

module.exports = {
  convertWebmToMp3,
};

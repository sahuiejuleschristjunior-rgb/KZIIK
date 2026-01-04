const fs = require("fs");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const ffprobePath = ffmpegPath
  ? ffmpegPath.replace(/ffmpeg(\.exe)?$/, (match, ext) => `ffprobe${ext || ""}`)
  : "ffprobe";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFileStability(filePath) {
  let stableCount = 0;
  let lastSize = -1;

  while (stableCount < 3) {
    const stats = await fs.promises.stat(filePath);
    const currentSize = stats.size;

    if (currentSize === lastSize) {
      stableCount += 1;
    } else {
      stableCount = 0;
      lastSize = currentSize;
    }

    if (stableCount < 3) {
      await wait(200);
    }
  }

  return true;
}

function runFfprobe(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];

    const probe = spawn(ffprobePath, args, { windowsHide: true });

    let stdout = "";
    let stderr = "";

    probe.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    probe.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    probe.on("error", (err) => {
      reject(err);
    });

    probe.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(stdout || "{}");
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function validateAudioStrict(filePath) {
  const exists = await fs.promises
    .access(filePath, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new Error(`Audio file not accessible: ${filePath}`);
  }

  const metadata = await runFfprobe(filePath);
  const streams = metadata.streams || [];
  const audioStream = streams.find((stream) => stream.codec_type === "audio");

  if (!audioStream) {
    throw new Error("No audio stream detected");
  }

  const duration = Number(metadata?.format?.duration || audioStream?.duration || 0);

  if (!Number.isFinite(duration) || duration < 0.8) {
    throw new Error("Audio too short (< 0.8s)");
  }

  return {
    duration,
    codec: audioStream.codec_name || "unknown",
    sampleRate: Number(audioStream.sample_rate) || null,
    channels: Number(audioStream.channels) || null,
  };
}

module.exports = {
  waitForFileStability,
  validateAudioStrict,
  runFfprobe,
  ffprobePath,
};

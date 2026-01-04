const fs = require("fs");
const { spawn } = require("child_process");

/**
 * ffprobe système (Ubuntu / production)
 */
const ffprobePath = "ffprobe";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFileStability(filePath) {
  let stableCount = 0;
  let lastSize = -1;

  while (stableCount < 3) {
    const stats = await fs.promises.stat(filePath);
    const currentSize = stats.size;

    if (currentSize === lastSize) {
      stableCount++;
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
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];

    const probe = spawn(ffprobePath, args);

    let stdout = "";
    let stderr = "";

    probe.stdout.on("data", (d) => (stdout += d));
    probe.stderr.on("data", (d) => (stderr += d));

    probe.on("error", reject);

    probe.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `ffprobe exited with ${code}`));
      }
      try {
        resolve(JSON.parse(stdout || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Validation stricte (worker / traitement)
 */
async function validateAudioStrict(filePath) {
  await fs.promises.access(filePath, fs.constants.R_OK);

  const metadata = await runFfprobe(filePath);
  const streams = metadata.streams || [];
  const audioStream = streams.find(s => s.codec_type === "audio");

  if (!audioStream) {
    throw new Error("No audio stream detected");
  }

  const duration = Number(
    metadata?.format?.duration ||
    audioStream?.duration ||
    0
  );

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

/**
 * Wrapper SAFE pour le contrôleur
 * ❌ ne casse jamais l'app
 */
async function validateAudio(filePath) {
  try {
    await validateAudioStrict(filePath);
    return true;
  } catch (err) {
    console.error("❌ Validation audio échouée", {
      path: filePath,
      error: err.message,
    });
    return false;
  }
}

module.exports = {
  waitForFileStability,
  runFfprobe,
  validateAudioStrict,
  validateAudio,
  ffprobePath,
};
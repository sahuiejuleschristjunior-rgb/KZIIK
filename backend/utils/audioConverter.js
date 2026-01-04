const { spawn } = require("child_process");

const FFMPEG_PATH = "/usr/bin/ffmpeg";

function convertAudioSafe(input, output) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const args = [
      "-y",
      "-i",
      input,
      "-vn",
      "-acodec",
      "libopus",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-b:a",
      "128k",
      output,
    ];

    const ffmpeg = spawn(FFMPEG_PATH, args, { windowsHide: true });

    let stderr = "";

    const timeout = setTimeout(() => {
      ffmpeg.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(new Error("ffmpeg conversion timed out"));
      }
    }, 15000);

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", (err) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    ffmpeg.on("close", (code) => {
      clearTimeout(timeout);
      if (settled) return;

      settled = true;

      if (code !== 0) {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
        return;
      }

      resolve(true);
    });
  });
}

async function convertWebmToMp3(input, output) {
  return convertAudioSafe(input, output);
}

module.exports = {
  convertAudioSafe,
  convertWebmToMp3,
};

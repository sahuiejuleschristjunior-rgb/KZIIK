const { spawn } = require("child_process");

function convertAudioSafe(input, output) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const args = [
      "-y",
      "-i",
      input,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-b:a",
      "128k",
      output,
    ];

    const ffmpeg = spawn(ffmpegPath || "ffmpeg", args, {
      windowsHide: true,
    });

    let stderr = "";
    let stdout = "";
    const timeout = setTimeout(() => {
      ffmpeg.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(new Error("ffmpeg conversion timed out"));
      }
    }, 10000);

    ffmpeg.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk;
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
      if (settled) {
        return;
      }
      settled = true;
      if (code !== 0) {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

module.exports = {
  convertAudioSafe,
};

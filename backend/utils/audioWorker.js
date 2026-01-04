const fs = require("fs");
const path = require("path");
const { convertAudioSafe } = require("./audioConverter");
const { waitForFileStability, validateAudioStrict } = require("./audioValidator");

const TMP_DIR = path.join(__dirname, "../uploads/audio/tmp");
const FINAL_DIR = path.join(__dirname, "../uploads/audio/final");

[FINAL_DIR, TMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function processAudioJob(tempFilePath, targetBasename) {
  const finalPath = path.join(FINAL_DIR, `${targetBasename}.mp3`);
  let sourceValidated = false;

  try {
    await waitForFileStability(tempFilePath);

    const stats = await fs.promises.stat(tempFilePath);
    if (!stats || stats.size <= 8 * 1024) {
      throw new Error("Audio file too small (<= 8KB)");
    }

    const sourceMeta = await validateAudioStrict(tempFilePath);
    sourceValidated = true;

    await convertAudioSafe(tempFilePath, finalPath);
    await validateAudioStrict(finalPath);

    await fs.promises.unlink(tempFilePath).catch(() => {});

    return { finalPath, sourceMeta };
  } catch (err) {
    // Never delete the input in the same tick as upload; this worker is async.
    if (!sourceValidated) {
      // Keep the file for investigation if the raw input itself was invalid.
      return Promise.reject(err);
    }

    await fs.promises.unlink(finalPath).catch(() => {});
    await fs.promises.unlink(tempFilePath).catch(() => {});
    return Promise.reject(err);
  }
}

function launchAudioWorker(tempFilePath, targetBasename, logger = console) {
  setImmediate(() => {
    processAudioJob(tempFilePath, targetBasename)
      .then(({ finalPath, sourceMeta }) => {
        logger.info(
          `[audio-worker] Processed ${path.basename(tempFilePath)} => ${path.basename(finalPath)} (${sourceMeta.codec})`
        );
      })
      .catch((err) => {
        logger.error(`[audio-worker] Failed to process ${path.basename(tempFilePath)}:`, err);
      });
  });
}

module.exports = {
  TMP_DIR,
  FINAL_DIR,
  launchAudioWorker,
  processAudioJob,
};

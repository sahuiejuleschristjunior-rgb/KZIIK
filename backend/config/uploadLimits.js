/**
 * Centralise la limite d'upload pour tous les endpoints acceptant des médias.
 * La valeur par défaut est portée à 2 Go pour permettre l'envoi de vidéos
 * longues et lourdes, mais elle peut être ajustée via la variable
 * d'environnement MAX_UPLOAD_MB.
 */

const DEFAULT_MAX_UPLOAD_MB = 2000; // 2 Go

const parseUploadLimit = () => {
  const envValue = Number(process.env.MAX_UPLOAD_MB);
  if (Number.isFinite(envValue) && envValue > 0) {
    return envValue;
  }
  return DEFAULT_MAX_UPLOAD_MB;
};

const MAX_UPLOAD_MB = parseUploadLimit();
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

module.exports = {
  MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES,
};

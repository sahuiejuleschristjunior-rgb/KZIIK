const fs = require("fs");
const path = require("path");

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
  if (!match) {
    return null;
  }

  const [, key, rawValue] = match;
  let value = rawValue;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  value = value.replace(/\\n/g, "\n");
  return { key, value };
};

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      return;
    }

    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  });
};

module.exports = () => {
  // Autorise un fichier .env à la racine du projet (ex: /var/www/kziik/.env)
  // puis un fichier spécifique au dossier backend (backend/.env). Le premier
  // fichier trouvé ne bloque pas le second : les valeurs déjà définies ne sont
  // pas écrasées, ce qui permet de définir un socle commun à la racine et de
  // surcharger au besoin côté backend.
  const rootEnvPath = path.join(__dirname, "..", "..", ".env");
  const backendEnvPath = path.join(__dirname, "..", ".env");

  loadEnvFile(rootEnvPath);
  loadEnvFile(backendEnvPath);

  // 🔐 Garantit qu'un secret JWT est toujours présent pour éviter les erreurs runtime
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET manquant");
    
  }
};

/* ==========================================================
   PAGE NAME RULES – SOURCE UNIQUE DE VÉRITÉ
   Utilisable : Backend (Express) & Frontend (React)
========================================================== */

/* -------------------------------
   CONFIG GLOBALE
-------------------------------- */
export const PAGE_NAME_CONFIG = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 60,

  // Regex principale (lettres, chiffres, accents, ponctuation contrôlée)
  REGEX: /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 .,'&-]{1,58}[A-Za-zÀ-ÿ0-9]$/,

  // Caractères interdits (sécurité)
  FORBIDDEN_CHARS: /[@#$%^*+=<>[\]{}|\\/~`]/,

  // Mots réservés / sensibles
  RESERVED_WORDS: [
    "facebook",
    "google",
    "instagram",
    "linkedin",
    "tiktok",
    "twitter",
    "meta",
    "whatsapp",
    "gouvernement",
    "ministere",
    "ministère",
    "police",
    "banque centrale",
    "etat",
    "officiel",
  ],
};

/* -------------------------------
   UTILITAIRES
-------------------------------- */
export const normalizeText = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const cleanPageName = (name = "") =>
  name
    .trim()
    .replace(/\s+/g, " ");

/* -------------------------------
   VALIDATION PRINCIPALE
-------------------------------- */
export const validatePageName = (rawName = "") => {
  if (!rawName || typeof rawName !== "string") {
    return { valid: false, error: "Nom requis" };
  }

  const name = cleanPageName(rawName);

  if (name.length < PAGE_NAME_CONFIG.MIN_LENGTH) {
    return { valid: false, error: "Nom trop court" };
  }

  if (name.length > PAGE_NAME_CONFIG.MAX_LENGTH) {
    return { valid: false, error: "Nom trop long" };
  }

  if (PAGE_NAME_CONFIG.FORBIDDEN_CHARS.test(name)) {
    return { valid: false, error: "Caractères non autorisés" };
  }

  if (!PAGE_NAME_CONFIG.REGEX.test(name)) {
    return { valid: false, error: "Format invalide" };
  }

  // Pas uniquement chiffres ou symboles
  if (/^[0-9 .,'&-]+$/.test(name)) {
    return { valid: false, error: "Nom non valide" };
  }

  // Mots réservés
  const normalized = normalizeText(name);
  if (
    PAGE_NAME_CONFIG.RESERVED_WORDS.some((w) =>
      normalized.includes(normalizeText(w))
    )
  ) {
    return { valid: false, error: "Nom réservé" };
  }

  return { valid: true, value: name };
};

/* -------------------------------
   SLUG SEO (OPTIONNEL)
-------------------------------- */
export const generatePageSlug = (name = "") =>
  normalizeText(name)
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");

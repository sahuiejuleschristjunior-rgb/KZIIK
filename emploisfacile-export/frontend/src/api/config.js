// API calls should target the dedicated API host by default to avoid hitting
// the public site (which would return HTML like "Cannot POST /api/pages").
// If you need a different host, set VITE_API_URL accordingly (e.g.
// http://localhost:4000 or https://example.com/api).
const DEFAULT_API = "https://api.emploisfacile.org/api";

function normalizeApiUrl(raw) {
  if (!raw) return DEFAULT_API;

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const hasCustomPath = parsed.pathname && parsed.pathname !== "/";
    const normalizedPath = hasCustomPath
      ? parsed.pathname.replace(/\/$/, "")
      : "/api";

    // If someone sets the main domain without a path, redirect to the API
    // subdomain to avoid sending requests to the public site.
    if (hostname === "emploisfacile.org" && !hasCustomPath) {
      return DEFAULT_API;
    }

    return `${parsed.origin}${normalizedPath}`;
  } catch (err) {
    console.warn("Invalid VITE_API_URL provided, falling back to default", err);
    return DEFAULT_API;
  }
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

import { useEffect, useRef, useState } from "react";
import "../styles/appOverlay.css";

function hasToken() {
  const t = localStorage.getItem("token");
  return Boolean(t && t !== "null" && t !== "undefined" && t.split(".").length === 3);
}

export default function AppLoadingOverlay() {
  const DURATION_MS = 1800;

  // Au refresh: si token existe déjà, on affiche direct
  const [visible, setVisible] = useState(() => hasToken());

  const prevTokenRef = useRef(hasToken());
  const timerRef = useRef(null);

  const showFor = (ms = DURATION_MS) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, ms);
  };

  // 1) Cas refresh: si visible au départ, on cache après durée
  useEffect(() => {
    if (visible) showFor(DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Cas login SPA: détecter apparition du token (poll limité + event storage)
  useEffect(() => {
    let cancelled = false;

    const checkTransition = () => {
      const nowHasToken = hasToken();
      const prevHasToken = prevTokenRef.current;

      // Transition "déconnecté -> connecté"
      if (!prevHasToken && nowHasToken) {
        showFor(DURATION_MS);
      }

      prevTokenRef.current = nowHasToken;
    };

    // a) storage event (utile si token est modifié via un autre onglet)
    const onStorage = (e) => {
      if (e.key === "token") checkTransition();
    };
    window.addEventListener("storage", onStorage);

    // b) mini-poll local (utile si login met le token sans re-monter le composant)
    let tries = 0;
    const interval = setInterval(() => {
      if (cancelled) return;
      tries += 1;
      checkTransition();
      if (tries >= 25) clearInterval(interval); // 25 * 100ms = 2.5s
    }, 100);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="app-overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="overlay-logo">EF</div>
        <div className="overlay-title">Bienvenue</div>
        <div className="overlay-subtitle">Préparation de votre expérience…</div>

        <div className="overlay-progress" aria-hidden="true">
          <div className="overlay-bar"></div>
        </div>

        <div className="overlay-hint">Synchronisation en cours</div>
      </div>
    </div>
  );
}

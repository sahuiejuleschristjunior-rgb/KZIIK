import React, { useState, useRef, useEffect } from "react";
import "../styles/otp.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtpRegister() {
  const nav = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const email = params.get("email");

  const { login } = useAuth();

  /* ------------------------------------------------------------
     Sécurité : si aucun email → retour inscription
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!email) nav("/register");
  }, [email, nav]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  const inputs = useRef([]);

  /* Focus premier champ */
  useEffect(() => {
    if (inputs.current[0]) inputs.current[0].focus();
  }, []);

  /* Timer pour renvoi OTP */
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /* GESTION DES CHAMPS OTP */
  function handleChange(e, index) {
    const val = e.target.value;
    if (!/^\d?$/.test(val)) return;

    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);

    if (val && index < 5) inputs.current[index + 1].focus();
  }

  function handleKey(e, index) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  }

  /* Coller un OTP complet */
  function handlePaste(e) {
    e.preventDefault();
    let text = e.clipboardData.getData("text").replace(/\D/g, "");
    text = text.slice(0, 6);

    if (text.length === 6) {
      setOtp(text.split(""));
      inputs.current[5].focus();
    }
  }

  function shakeAnim() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  /* ------------------------------------------------------------
     RENVOYER LE CODE OTP
  ------------------------------------------------------------ */
  async function resendCode() {
    try {
      setTimer(60);

      const res = await fetch(
        import.meta.env.VITE_API_URL + "/auth/resend-register-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Impossible de renvoyer le code.");
        return;
      }

      setError("Un nouveau code a été envoyé !");
      setTimeout(() => setError(""), 2000);

    } catch {
      setError("Erreur serveur.");
    }
  }

  /* ------------------------------------------------------------
     SOUMISSION DU CODE OTP
  ------------------------------------------------------------ */
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = otp.join("");

    if (code.length !== 6) {
      shakeAnim();
      setError("Code incomplet");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL + "/auth/verify-register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        shakeAnim();
        setError(data.error || "Code incorrect");
        setLoading(false);
        return;
      }

      /* --------------------------------------------------------
         🔥 Connexion automatique si le backend renvoie token
      -------------------------------------------------------- */
      if (data.token) {
        login(data.token, data.user || null);
      }

      /* --------------------------------------------------------
         🔥 Nouveau flow : redirection directe vers /complete-profile
      -------------------------------------------------------- */
      nav("/complete-profile");

    } catch (err) {
      console.error("OTP ERROR:", err);
      setError("Erreur réseau");
    }

    setLoading(false);
  }

  return (
    <div className="otp-page">
      <div className="otp-card">
        <h1 className="otp-title">Vérification</h1>
        <p className="otp-subtitle">
          Entrez le code envoyé à<br />
          <b>{email}</b>
        </p>

      {error && <div className="otp-error">{error}</div>}

        <form onSubmit={submit}>
          <div
            className={`otp-inputs ${shake ? "shake" : ""}`}
            onPaste={handlePaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                maxLength={1}
                inputMode="numeric"
                value={digit}
                onChange={e => handleChange(e, i)}
                onKeyDown={e => handleKey(e, i)}
                className="otp-box"
              />
            ))}
          </div>

          <button className="otp-btn" disabled={loading} type="submit">
            {loading ? "Vérification..." : "Vérifier"}
          </button>

          <div className="otp-resend">
            {timer > 0 ? (
              <span>Renvoyer le code dans {timer}s</span>
            ) : (
              <button
                type="button"
                className="resend-btn"
                onClick={resendCode}
              >
                Renvoyer le code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import "../styles/otp.css";
import { useNavigate, useLocation } from "react-router-dom";

export default function VerifyOtpReset() {
  const nav = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const email = params.get("email");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  const inputs = useRef([]);

  // AUTOFOCUS iOS FIX
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputs.current[0]?.focus();
    }, 200);
    return () => clearTimeout(timeout);
  }, []);

  // TIMER
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // HANDLE CHANGE
  function handleChange(e, index) {
    const value = e.target.value;

    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);

    if (value && index < 5) inputs.current[index + 1].focus();
  }

  // BACKSPACE
  function handleKey(e, index) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  }

  // COLLAGE
  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (text.length === 6) {
      setOtp(text.split(""));
      inputs.current[5].focus();
    }
  }

  // ===============================
  // RENVOYER CODE — ROUTE CORRECTE
  // ===============================
  async function resendCode() {
    try {
      setTimer(60);

      const res = await fetch(
        import.meta.env.VITE_API_URL + "/auth/resend-reset-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur serveur — impossible de renvoyer le code.");
        return;
      }

      setError("Un nouveau code a été envoyé !");
      setTimeout(() => setError(""), 2000);
    } catch {
      setError("Erreur réseau — réessayez.");
    }
  }

  // ===============================
  // VALIDATION OTP
  // ===============================
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = otp.join("");

    if (code.length !== 6) {
      shakeAnimation();
      setError("Code incomplet");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL + "/auth/verify-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: code }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        shakeAnimation();
        setError(data.error || "Code incorrect");
        setLoading(false);
        return;
      }

      nav("/new-password?email=" + encodeURIComponent(email));
    } catch {
      setError("Erreur réseau");
    }

    setLoading(false);
  }

  function shakeAnimation() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  return (
    <div className="otp-page">
      <div className="otp-card">

        <h1 className="otp-title">Vérification</h1>
        <p className="otp-subtitle">
          Entrez le code envoyé à <br />
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
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                maxLength={1}
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKey(e, i)}
                className="otp-box"
              />
            ))}
          </div>

          <button className="otp-btn" type="submit" disabled={loading}>
            {loading ? "Vérification..." : "Vérifier"}
          </button>

          <div className="otp-resend">
            {timer > 0 ? (
              <span>Renvoyer le code dans {timer}s</span>
            ) : (
              <button type="button" onClick={resendCode} className="resend-btn">
                Renvoyer le code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

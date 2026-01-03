import "../styles/Auth.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !email.includes("@")) {
      setError("Adresse email invalide");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Email introuvable");
        setLoading(false);
        return;
      }

      nav("/verify-reset?email=" + encodeURIComponent(email));
    } catch (err) {
      console.error(err);
      setError("Erreur réseau — réessayez");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Mot de passe oublié</h1>
        <div className="auth-sub">Un code vous sera envoyé par email</div>

        {error && (
          <div style={{ color: "salmon", marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <input
            className="input"
            type="email"
            placeholder="Votre email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
            autoFocus
          />

          <button className="primary-btn" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer le code"}
          </button>
        </form>

        <div className="link-muted" style={{ marginTop: 16 }}>
          <a href="/login" className="small-link">Retour à la connexion</a>
        </div>
      </div>
    </div>
  );
}

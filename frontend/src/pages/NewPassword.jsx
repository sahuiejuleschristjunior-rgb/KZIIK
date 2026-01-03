import "../styles/Auth.css";
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function NewPassword() {
  const nav = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Lien invalide — merci de recommencer.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL + "/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur serveur");
        setLoading(false);
        return;
      }

      alert("Mot de passe mis à jour avec succès !");
      nav("/login");

    } catch (err) {
      setError("Erreur réseau — vérifiez votre connexion.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Nouveau mot de passe</h1>

        <div className="auth-sub">
          Définissez un nouveau mot de passe pour :<br />
          <b>{email}</b>
        </div>

        {error && (
          <div style={{ color: "salmon", marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <input
            className="input"
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <input
            className="input"
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "En cours..." : "Confirmer"}
          </button>
        </form>
      </div>
    </div>
  );
}

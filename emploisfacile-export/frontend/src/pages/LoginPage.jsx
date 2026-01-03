import "../styles/Auth.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  const { login } = useAuth();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  /* ============================================================
     LOGIN
  ============================================================ */
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Identifiants incorrects");
        setLoading(false);
        return;
      }

      // Vérification intégrale du retour backend
      if (!data.token || !data.user) {
        setError(
          "Données de connexion incomplètes — contactez un administrateur"
        );
        setLoading(false);
        return;
      }

      // Stockage via contexte
      login(data.token, data.user);

      /* ========================================================
        REDIRECTION (NOUVEAU FLOW)
        → Tout le monde arrive sur /fb
        → Le layout gère ensuite le rôle (candidate / recruiter / admin)
      ======================================================== */
      return nav("/fb");

    } catch (err) {
      console.error("Login error:", err);
      setError("Erreur réseau — impossible de joindre l'API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Connexion</h1>
        <div className="auth-sub">Accédez à votre espace personnel</div>

        {error && (
          <div
            style={{
              color: "salmon",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <input
            className="input"
            name="email"
            type="email"
            placeholder="Adresse email"
            onChange={handleChange}
            value={form.email}
            autoComplete="email"
            required
            autoFocus
          />

          <input
            className="input"
            name="password"
            type="password"
            placeholder="Mot de passe"
            onChange={handleChange}
            value={form.password}
            autoComplete="current-password"
            required
          />

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="link-muted">
          <a href="/forgot" className="small-link">
            Mot de passe oublié ?
          </a>
        </div>

        <div className="link-muted">
          Nouveau sur EmploisFacile ?{" "}
          <a href="/register" className="small-link">
            S'inscrire
          </a>
        </div>
      </div>
    </div>
  );
}
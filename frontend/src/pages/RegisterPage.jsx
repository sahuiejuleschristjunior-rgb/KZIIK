// /frontend/src/pages/RegisterPage.jsx

import "../styles/Auth.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api/config";

/* ============================================================
   VALIDATION DU NOM (alignée 100% avec le backend)
============================================================ */
function validateName(name) {
  const cleanedName = (name || "").trim();

  if (cleanedName.length < 5) {
    return "Le nom complet doit contenir au moins 5 caractères";
  }

  const parts = cleanedName.split(/\s+/);
  if (parts.length < 2) {
    return "Veuillez entrer un nom et un prénom";
  }

  if (/\d/.test(cleanedName)) {
    return "Le nom ne doit pas contenir de chiffres";
  }

  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
  if (!nameRegex.test(cleanedName)) {
    return "Le nom contient des caractères non autorisés";
  }

  return "";
}

/* ============================================================
   PAGE REGISTER
============================================================ */
export default function RegisterPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  /* ========================================================
     SOUMISSION DU FORMULAIRE
  ======================================================== */
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation du nom
    const nameError = validateName(form.name);
    if (nameError) {
      setError(nameError);
      setLoading(false);
      return;
    }

    // Validation email
    if (!form.email || !form.email.includes("@")) {
      setError("Adresse email invalide.");
      setLoading(false);
      return;
    }

    // Validation mot de passe (même logique backend)
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
    if (!form.password || form.password.length < 8 || !pwRegex.test(form.password)) {
      setError("Le mot de passe doit faire au moins 8 caractères et contenir une lettre + un chiffre.");
      setLoading(false);
      return;
    }

    // Données à envoyer
    const dataToSend = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: "user",
    };

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const contentType = res.headers.get("content-type") || "";
      let data = {};
      let rawText = "";

      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (err) {
          console.error("register > parse json error", err);
        }
      } else {
        try {
          rawText = await res.text();
        } catch (err) {
          console.error("register > read text error", err);
        }
      }

      if (!res.ok) {
        const isGatewayIssue = res.status === 502 || res.status === 503;
        const fallbackText = rawText?.trim();

        setError(
          data.error ||
            (isGatewayIssue
              ? "Service momentanément indisponible. Merci de réessayer dans quelques instants."
              : fallbackText || "Erreur serveur")
        );
        setLoading(false);
        return;
      }

      // 🔥 Après inscription → OTP obligatoire
      nav(`/verify-register?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      console.error(err);
      setError("Erreur réseau — vérifiez votre connexion");
    }

    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Créer un compte</h1>
        <div className="auth-sub">Rejoignez KZIIK en 1 minute</div>

        {error && (
          <div
            style={{
              color: "red",
              marginBottom: 12,
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <input
            className="input"
            name="name"
            type="text"
            placeholder="Nom complet"
            required
            onChange={change}
            value={form.name}
          />

          <input
            className="input"
            name="email"
            type="email"
            placeholder="Adresse email"
            required
            onChange={change}
            value={form.email}
          />

          <input
            className="input"
            name="password"
            type="password"
            placeholder="Mot de passe"
            required
            onChange={change}
            value={form.password}
          />

          <button className="primary-btn" disabled={loading}>
            {loading ? "Envoi..." : "S’inscrire"}
          </button>
        </form>
      </div>
    </div>
  );
}

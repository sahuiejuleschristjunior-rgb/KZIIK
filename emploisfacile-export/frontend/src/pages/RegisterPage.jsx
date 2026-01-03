// /frontend/src/pages/RegisterPage.jsx

import "../styles/Auth.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [role, setRole] = useState("candidate");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleRoleChange(newRole) {
    setRole(newRole);
    setForm((prev) => ({ ...prev, companyName: "" }));
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

    // Validation recruteur
    if (role === "recruiter" && !form.companyName.trim()) {
      setError("Veuillez entrer le nom de votre entreprise.");
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
      role: role,
    };

    if (role === "recruiter") {
      dataToSend.companyName = form.companyName.trim();
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setError(data.error || "Erreur serveur");
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
        <div className="auth-sub">Rejoignez EmploisFacile en 1 minute</div>

        <div className="role-switch">
          <button
            type="button"
            className={`role-btn ${role === "candidate" ? "active" : ""}`}
            onClick={() => handleRoleChange("candidate")}
          >
            Candidat
          </button>

          <button
            type="button"
            className={`role-btn ${role === "recruiter" ? "active" : ""}`}
            onClick={() => handleRoleChange("recruiter")}
          >
            Recruteur
          </button>
        </div>

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

          {role === "recruiter" && (
            <input
              className="input"
              name="companyName"
              type="text"
              placeholder="Nom de l'entreprise"
              required
              onChange={change}
              value={form.companyName}
            />
          )}

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
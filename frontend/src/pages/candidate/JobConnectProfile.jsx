import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { API_URL } from "../../api/config";

export default function JobConnectProfile() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();
  const token = localStorage.getItem("token");
  const [formValues, setFormValues] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    skills: "",
    availability: "",
    portfolio: "",
    linkedin: "",
    bio: "",
    avatar: "",
    cvData: "",
    cvName: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data.user) return;
    const professionalProfile = data.user?.professionalProfile || {};
    setFormValues((prev) => ({
      ...prev,
      name: professionalProfile.name || data.user?.name || "",
      title: professionalProfile.title || data.user?.title || data.user?.jobTitle || "",
      email: professionalProfile.email || data.user?.email || "",
      phone: professionalProfile.phone || data.user?.phone || "",
      location: professionalProfile.location || data.user?.location || "",
      experience: professionalProfile.experience || data.user?.experience || "",
      skills: Array.isArray(professionalProfile.skills)
        ? professionalProfile.skills.join(", ")
        : professionalProfile.skills ||
          (Array.isArray(data.user?.skills) ? data.user.skills.join(", ") : data.user?.skills || ""),
      availability: professionalProfile.availability || data.user?.availability || "",
      portfolio: professionalProfile.portfolio || data.user?.portfolio || "",
      linkedin: professionalProfile.linkedin || data.user?.linkedin || "",
      bio: professionalProfile.bio || data.user?.bio || "",
      avatar: professionalProfile.avatar || "",
      cvData: professionalProfile.cvData || "",
      cvName: professionalProfile.cvName || "",
    }));
  }, [data.user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (file, field, nameField) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormValues((prev) => ({
        ...prev,
        [field]: reader.result,
        ...(nameField ? { [nameField]: file.name } : {}),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("");

    const professionalProfile = {
      ...(data.user?.professionalProfile || {}),
      ...formValues,
      skills: formValues.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ professionalProfile }),
      });

      if (!res.ok) {
        throw new Error("Impossible d'enregistrer votre profil.");
      }

      const payload = await res.json();
      if (payload.user) {
        localStorage.setItem("user", JSON.stringify(payload.user));
        data.updateUser?.(payload.user);
      }

      setStatusMessage("Profil candidat mis à jour avec succès.");
    } catch (error) {
      setStatusMessage(error.message || "Erreur lors de la mise à jour du profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProfessionalProfile = () => {
    nav("/candidate/profil-professionnel");
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Profil</p>
          <h3>Optimisez votre candidature</h3>
          <p className="hero__subtitle">
            Consultez et mettez à jour votre profil pour améliorer vos chances auprès des recruteurs.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={handleOpenProfessionalProfile}>
              Voir mon profil professionnel
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Profil</span>
            <strong>{data.profileCompletion}%</strong>
          </div>
          <div className="hero-chip">
            <span>Vues</span>
            <strong>{data.profileViews}</strong>
          </div>
          <div className="hero-chip">
            <span>Messages</span>
            <strong>{data.messagesCount}</strong>
          </div>
        </div>
      </section>

      <section className="card candidate-profile-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Mon profil</p>
            <h3>Ajouter ou mettre à jour votre profil candidat</h3>
          </div>
          <button className="primary-btn ghost" onClick={() => nav("/candidate/candidatures")}>
            Retour aux candidatures
          </button>
        </div>
        <form className="candidate-profile-form" onSubmit={handleSubmit}>
          <div className="profile-form-grid profile-form-grid--media">
            <div className="profile-form-field profile-form-field--media">
              <label htmlFor="avatar">Photo de profil</label>
              <div className="profile-avatar">
                {formValues.avatar ? (
                  <img src={formValues.avatar} alt="Photo de profil" />
                ) : (
                  <div className="profile-avatar-placeholder">Aucune photo</div>
                )}
              </div>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                onChange={(event) => handleFileUpload(event.target.files?.[0], "avatar")}
              />
              <span className="profile-form-hint">Formats acceptés : JPG, PNG. Taille max 5 Mo.</span>
            </div>
            <div className="profile-form-field profile-form-field--media">
              <label htmlFor="cv">CV (PDF ou Word)</label>
              <input
                id="cv"
                name="cv"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) => handleFileUpload(event.target.files?.[0], "cvData", "cvName")}
              />
              {formValues.cvName ? (
                <div className="profile-cv-info">
                  <span>{formValues.cvName}</span>
                  {formValues.cvData && (
                    <a className="primary-btn ghost" href={formValues.cvData} download={formValues.cvName}>
                      Télécharger le CV
                    </a>
                  )}
                </div>
              ) : (
                <span className="profile-form-hint">Ajoutez votre CV pour que les recruteurs puissent le télécharger.</span>
              )}
            </div>
          </div>
          <div className="profile-form-grid">
            <div className="profile-form-field">
              <label htmlFor="name">Nom complet</label>
              <input id="name" name="name" value={formValues.name} onChange={handleChange} placeholder="Ex : Nina Laurent" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="title">Métier ciblé</label>
              <input
                id="title"
                name="title"
                value={formValues.title}
                onChange={handleChange}
                placeholder="Ex : Développeuse front-end"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={formValues.email} onChange={handleChange} />
            </div>
            <div className="profile-form-field">
              <label htmlFor="phone">Téléphone</label>
              <input id="phone" name="phone" value={formValues.phone} onChange={handleChange} placeholder="+33 6 00 00 00 00" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="location">Localisation</label>
              <input id="location" name="location" value={formValues.location} onChange={handleChange} placeholder="Ex : Lyon" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="availability">Disponibilité</label>
              <input
                id="availability"
                name="availability"
                value={formValues.availability}
                onChange={handleChange}
                placeholder="Ex : Immédiate, 2 semaines"
              />
            </div>
          </div>
          <div className="profile-form-grid">
            <div className="profile-form-field">
              <label htmlFor="experience">Expérience clé</label>
              <input
                id="experience"
                name="experience"
                value={formValues.experience}
                onChange={handleChange}
                placeholder="Ex : 5 ans en React, 2 ans en design system"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="skills">Compétences (séparées par des virgules)</label>
              <input
                id="skills"
                name="skills"
                value={formValues.skills}
                onChange={handleChange}
                placeholder="React, TypeScript, UX"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="portfolio">Portfolio</label>
              <input
                id="portfolio"
                name="portfolio"
                value={formValues.portfolio}
                onChange={handleChange}
                placeholder="https://"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="linkedin">LinkedIn</label>
              <input
                id="linkedin"
                name="linkedin"
                value={formValues.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div className="profile-form-field full-width">
            <label htmlFor="bio">Présentation</label>
            <textarea
              id="bio"
              name="bio"
              value={formValues.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Décrivez votre parcours, vos motivations et ce que vous recherchez."
            />
          </div>
          {statusMessage && <p className="profile-form-status">{statusMessage}</p>}
          <div className="profile-form-actions">
            <button className="primary-btn" type="submit" disabled={isSaving}>
              {isSaving ? "Mise à jour..." : "Enregistrer les modifications"}
            </button>
            <button className="primary-btn ghost" type="button" onClick={handleOpenProfessionalProfile}>
              Ouvrir mon profil professionnel
            </button>
          </div>
        </form>
      </section>

      <section className="card" id="professional-profile">
        <div className="card-header">
          <div>
            <p className="eyebrow">Profil professionnel</p>
            <h3>Visible par les recruteurs</h3>
          </div>
          <button className="primary-btn ghost" type="button" onClick={handleOpenProfessionalProfile}>
            Voir le profil professionnel
          </button>
        </div>
        <div className="professional-profile">
          <div className="professional-profile__identity">
            <div className="profile-avatar profile-avatar--small">
              {formValues.avatar ? (
                <img src={formValues.avatar} alt="Photo de profil professionnelle" />
              ) : (
                <div className="profile-avatar-placeholder">Photo</div>
              )}
            </div>
            <div>
              <h4>{formValues.name || "Votre nom complet"}</h4>
              <p>{formValues.title || "Métier ciblé"}</p>
              <p className="professional-profile__meta">
                {formValues.location || "Localisation"} · {formValues.availability || "Disponibilité"}
              </p>
            </div>
          </div>
          <div className="professional-profile__details">
            <p>{formValues.bio || "Ajoutez une présentation pour vous démarquer auprès des recruteurs."}</p>
            <div className="professional-profile__tags">
              {formValues.skills
                ? formValues.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 6).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))
                : <span>Compétences</span>}
            </div>
          </div>
          <div className="professional-profile__actions">
            {formValues.cvData ? (
              <a className="primary-btn" href={formValues.cvData} download={formValues.cvName || "cv.pdf"}>
                Télécharger le CV
              </a>
            ) : (
              <button className="primary-btn ghost" type="button" onClick={() => document.getElementById("cv")?.click()}>
                Ajouter un CV
              </button>
            )}
            <span className="professional-profile__note">
              Ce profil est distinct de votre profil public et dédié aux candidatures.
            </span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Conseils</p>
            <h3>Complétez votre profil</h3>
          </div>
        </div>
        <div className="progress-block">
          <div className="progress-header">
            <span>Profil complété à {data.profileCompletion}%</span>
            <span className="progress-tip">Ajoutez votre portfolio pour atteindre 100% !</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${data.profileCompletion}%` }}></div>
          </div>
        </div>
      </section>
    </CandidateLayout>
  );
}

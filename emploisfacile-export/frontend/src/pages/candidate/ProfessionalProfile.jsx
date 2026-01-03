import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";

export default function ProfessionalProfile() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();
  const professionalProfile = data.user?.professionalProfile || {};
  const skillsValue = Array.isArray(professionalProfile.skills)
    ? professionalProfile.skills.join(", ")
    : professionalProfile.skills ||
      (Array.isArray(data.user?.skills) ? data.user.skills.join(", ") : data.user?.skills || "");

  const profile = {
    name: professionalProfile.name || data.user?.name || "",
    title: professionalProfile.title || data.user?.title || data.user?.jobTitle || "",
    email: professionalProfile.email || data.user?.email || "",
    phone: professionalProfile.phone || data.user?.phone || "",
    location: professionalProfile.location || data.user?.location || "",
    experience: professionalProfile.experience || data.user?.experience || "",
    skills: skillsValue,
    availability: professionalProfile.availability || data.user?.availability || "",
    portfolio: professionalProfile.portfolio || data.user?.portfolio || "",
    linkedin: professionalProfile.linkedin || data.user?.linkedin || "",
    bio: professionalProfile.bio || data.user?.bio || "",
    avatar: professionalProfile.avatar || "",
    cvData: professionalProfile.cvData || "",
    cvName: professionalProfile.cvName || "",
  };

  const skillTags = profile.skills
    ? profile.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 8)
    : [];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout} eyebrow="Profil professionnel" titlePrefix="Bonjour">
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Profil professionnel</p>
            <h3>Votre vitrine auprès des recruteurs</h3>
          </div>
          <button className="primary-btn ghost" type="button" onClick={() => nav("/candidate/profil")}>
            Modifier mon profil
          </button>
        </div>
        <div className="professional-profile">
          <div className="professional-profile__identity">
            <div className="profile-avatar profile-avatar--small">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Photo de profil professionnelle" />
              ) : (
                <div className="profile-avatar-placeholder">Photo</div>
              )}
            </div>
            <div>
              <h4>{profile.name || "Votre nom complet"}</h4>
              <p>{profile.title || "Métier ciblé"}</p>
              <p className="professional-profile__meta">
                {profile.location || "Localisation"} · {profile.availability || "Disponibilité"}
              </p>
            </div>
          </div>
          <div className="professional-profile__details">
            <p>{profile.bio || "Ajoutez une présentation pour vous démarquer auprès des recruteurs."}</p>
            <div className="professional-profile__tags">
              {skillTags.length ? skillTags.map((skill) => <span key={skill}>{skill}</span>) : <span>Compétences</span>}
            </div>
            <div>
              <p>{profile.experience || "Expérience clé"} </p>
              <p>{profile.email || "Email"} · {profile.phone || "Téléphone"}</p>
              <p>{profile.portfolio || "Portfolio"} · {profile.linkedin || "LinkedIn"}</p>
            </div>
          </div>
          <div className="professional-profile__actions">
            {profile.cvData ? (
              <a className="primary-btn" href={profile.cvData} download={profile.cvName || "cv.pdf"}>
                Télécharger le CV
              </a>
            ) : (
              <button className="primary-btn ghost" type="button" onClick={() => nav("/candidate/profil")}>
                Ajouter un CV
              </button>
            )}
            <span className="professional-profile__note">
              Ce profil est distinct de votre profil public et dédié aux candidatures.
            </span>
          </div>
        </div>
      </section>
    </CandidateLayout>
  );
}

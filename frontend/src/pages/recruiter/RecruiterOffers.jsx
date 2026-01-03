import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import useRecruiterDashboardData from "../../hooks/recruiter/useRecruiterDashboardData";
import { getMediaUrl } from "../../utils/mediaUtils";
import "../../styles/RecruiterDashboard.css";

const recruiterMenu = [
  { key: "create", label: "➕ Créer une nouvelle offre", path: "/recruiter/create-job" },
  { key: "dashboard", label: "Tableau de bord", path: "/recruiter/dashboard" },
  { key: "offers", label: "Mes offres", path: "/recruiter/offres" },
  { key: "candidatures", label: "Candidatures", path: "/recruiter/candidatures" },
  { key: "cv-theque", label: "CV thèque", path: "/recruiter/cv-theque" },
  { key: "messages", label: "Messages", path: "/recruiter/messages" },
  { key: "profil", label: "Entreprise", path: "/profil" },
  { key: "settings", label: "Paramètres", path: "/settings" },
];

export default function RecruiterOffers() {
  const nav = useNavigate();
  const data = useRecruiterDashboardData();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const sortedJobs = useMemo(() => {
    return [...data.jobs].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [data.jobs]);

  const openJob = (jobId) => {
    if (jobId) nav(`/recruiter/job/${jobId}`);
  };

  return (
    <RecruiterLayout
      user={data.user}
      onLogout={logout}
      eyebrow="Espace recruteur"
      titlePrefix="Mes offres"
      avatarFallback="R"
      menuItems={recruiterMenu}
    >
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Vos annonces</p>
            <h3>Mes offres publiées</h3>
          </div>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/recruiter/create-job")}>
              Créer une offre
            </button>
          </div>
        </div>

        {data.loadingJobs && <div className="loader">Chargement de vos offres…</div>}
        {data.error && <div className="error-message">{data.error}</div>}
        {!data.loadingJobs && sortedJobs.length === 0 && !data.error && (
          <div className="empty-state">Vous n'avez pas encore publié d'offre.</div>
        )}

        <div className="offers-grid">
          {sortedJobs.map((job) => (
            <article key={job._id} className="offer-card" onClick={() => openJob(job._id)}>
              {(job?.media?.images?.[0] || job?.media?.video) && (
                <div className="offer-media">
                  {job?.media?.images?.[0] ? (
                    <img
                      src={getMediaUrl(job.media.images[0])}
                      alt={`Aperçu ${job.title}`}
                    />
                  ) : (
                    <div className="offer-media__placeholder">Vidéo disponible</div>
                  )}
                  {job?.media?.video && <span className="media-badge">Vidéo</span>}
                </div>
              )}
              <div className="offer-card__head">
                <div>
                  <p className="offer-title">{job.title}</p>
                  <p className="offer-location">{job.location || "Localisation non précisée"}</p>
                </div>
                <span className={`status-pill ${job.isActive === false ? "status-amber" : "status-blue"}`}>
                  {job.isActive === false ? "Désactivée" : "Active"}
                </span>
              </div>

              <div className="offer-meta">
                <span>Publiée le {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}</span>
                <span>{job.contractType || "Type de contrat"}</span>
                <span>{job.salaryRange || "Salaire à définir"}</span>
              </div>

              <div className="offer-stats">
                <div className="offer-chip">{job.applications?.length || 0} candidature(s)</div>
                <div className="offer-chip">{job.experience || "Niveau d'expérience"}</div>
                <div className="offer-chip">{job.department || "Département"}</div>
              </div>

              <div className="offer-actions">
                <button
                  className="primary-btn ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openJob(job._id);
                  }}
                >
                  Voir les candidatures
                </button>
                <button
                  className="ghost-link subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(`/recruiter/create-job?from=${job._id}`);
                  }}
                >
                  Dupliquer l'offre
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </RecruiterLayout>
  );
}

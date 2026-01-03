import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import useRecruiterDashboardData from "../../hooks/recruiter/useRecruiterDashboardData";
import "../../styles/RecruiterDashboard.css";

const recruiterMenu = [
  { key: "create", label: "➕ Créer une nouvelle offre", path: "/recruiter/create-job" },
  { key: "dashboard", label: "Tableau de bord", path: "/recruiter/dashboard" },
  { key: "offers", label: "Mes offres", path: "/recruiter/offres" },
  { key: "applications", label: "Candidatures", path: "/recruiter/candidatures" },
  { key: "cv-theque", label: "CV thèque", path: "/recruiter/cv-theque" },
  { key: "messages", label: "Messages", path: "/recruiter/messages" },
  { key: "profil", label: "Entreprise", path: "/profil" },
  { key: "settings", label: "Paramètres", path: "/settings" },
];

export default function RecruiterCvTheque() {
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

  const groupedCvs = useMemo(() => {
    const map = new Map();

    const ensureGroup = (jobId, job) => {
      if (!map.has(jobId)) {
        map.set(jobId, {
          job,
          candidates: [],
          seen: new Set(),
        });
      }
      return map.get(jobId);
    };

    sortedJobs.forEach((job) => {
      if (job?._id) ensureGroup(String(job._id), job);
    });

    data.applications.forEach((app) => {
      const job = app.job || {};
      const jobId = job._id || app.jobId || app.job || "unknown";
      const candidate = app.candidate || {};

      if (!candidate || (!candidate.cvData && !candidate.cvName)) return;

      const group = ensureGroup(String(jobId), job);
      const candidateKey = candidate._id || candidate.email;
      if (!candidateKey || group.seen.has(candidateKey)) return;

      group.seen.add(candidateKey);
      group.candidates.push(candidate);
    });

    const result = [];
    sortedJobs.forEach((job) => {
      const jobId = String(job._id);
      if (map.has(jobId)) {
        result.push(map.get(jobId));
      }
    });

    for (const [jobId, group] of map.entries()) {
      if (!sortedJobs.some((job) => String(job._id) === jobId)) {
        result.push(group);
      }
    }

    return result;
  }, [data.applications, sortedJobs]);

  const cvCandidates = useMemo(() => {
    const seen = new Set();
    return data.applications
      .map((app) => app.candidate)
      .filter((candidate) => candidate && (candidate.cvData || candidate.cvName))
      .filter((candidate) => {
        const key = candidate._id || candidate.email;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [data.applications]);

  const downloadCv = (candidate) => {
    if (!candidate?.cvData) return;
    const link = document.createElement("a");
    const safeName = candidate.name
      ? candidate.name.replace(/\s+/g, "-").toLowerCase()
      : "candidat";
    link.href = candidate.cvData;
    link.download = candidate.cvName || `cv-${safeName}.pdf`;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadAllCvs = () => {
    cvCandidates.forEach((candidate, index) => {
      setTimeout(() => downloadCv(candidate), index * 250);
    });
  };

  return (
    <RecruiterLayout
      user={data.user}
      onLogout={logout}
      eyebrow="Espace recruteur"
      titlePrefix="CV thèque"
      avatarFallback="R"
      menuItems={recruiterMenu}
    >
      <section className="hero">
        <div className="hero__info">
          <div className="hero__badge">CV thèque</div>
          <h3>Centralisez les CV reçus par offre</h3>
          <p className="hero__subtitle">
            Retrouvez rapidement les CV des candidats classés selon les offres
            auxquelles ils ont postulé.
          </p>
          <p className="hero__hint">
            Téléchargez un CV ou exportez l'ensemble des profils disponibles.
          </p>
          <div className="hero__actions">
            <button
              className="primary-btn"
              onClick={downloadAllCvs}
              disabled={cvCandidates.length === 0}
            >
              Télécharger tous les CV
            </button>
            <button
              className="ghost-link subtle"
              onClick={() => nav("/recruiter/candidatures")}
            >
              Voir les candidatures
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Offres publiées</span>
            <strong>{data.jobs.length}</strong>
          </div>
          <div className="hero-chip">
            <span>CV disponibles</span>
            <strong>{cvCandidates.length}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures</span>
            <strong>{data.totalApplications}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>CV par offre</h3>
        </div>

        {data.loadingJobs && <div className="loader">Chargement des offres…</div>}
        {data.error && <div className="error-message">{data.error}</div>}

        {!data.loadingJobs && cvCandidates.length === 0 && !data.error && (
          <div className="empty-state">Aucun CV n'est encore disponible.</div>
        )}

        {!data.loadingJobs && cvCandidates.length > 0 && (
          <div className="applications-groups">
            {groupedCvs.map((group) => {
              const job = group.job || {};
              const isActive = job.isActive !== false;

              return (
                <div key={job._id || job.title} className="card nested-card">
                  <div className="card-header">
                    <div>
                      <h3 className="offer-title">{job.title || "Offre non renseignée"}</h3>
                      <p className="offer-location">{job.location || "Lieu non précisé"}</p>
                      <div className="offer-meta">
                        <span className={isActive ? "status-pill status-emerald" : "status-pill status-rose"}>
                          {isActive ? "Active" : "Désactivée"}
                        </span>
                      </div>
                    </div>
                    <button
                      className="ghost-btn"
                      onClick={() => job._id && nav(`/recruiter/job/${job._id}`)}
                    >
                      Voir les candidatures
                    </button>
                  </div>

                  {group.candidates.length === 0 ? (
                    <div className="empty-state small">Aucun CV reçu pour cette offre.</div>
                  ) : (
                    <div className="cv-list">
                      {group.candidates.map((candidate) => (
                        <div
                          key={candidate._id || candidate.email}
                          className="cv-item"
                        >
                          <div className="cv-info">
                            <p className="cv-name">{candidate.name || "Candidat"}</p>
                            <p className="cv-meta">{candidate.email || "Email non renseigné"}</p>
                            <p className="cv-file">{candidate.cvName || "CV disponible"}</p>
                          </div>
                          <button className="ghost-btn" onClick={() => downloadCv(candidate)}>
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </RecruiterLayout>
  );
}

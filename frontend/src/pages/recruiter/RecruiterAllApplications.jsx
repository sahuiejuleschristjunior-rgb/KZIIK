import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import { createJobConversation } from "../../api/jobChatApi";
import "../../styles/RecruiterDashboard.css";
import { API_URL } from "../../api/config";

export default function RecruiterAllApplications() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [user, setUser] = useState(null);

  const [selectedJobId, setSelectedJobId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) {
      nav("/login");
    }
  }, [token, nav]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Erreur lors du chargement de l'utilisateur", err);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAllApplications();
  }, [token]);

  const fetchAllApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/applications/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Impossible de charger les candidatures.");
      }

      const apps = Array.isArray(data) ? data : data.applications || [];
      const js = Array.isArray(data.jobs) ? data.jobs : [];

      setApplications(apps);
      setJobs(js);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setApplications([]);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      setError("");

      const res = await fetch(
        `${API_URL}/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du changement de statut.");
      }

      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    let label = status || "Inconnu";
    let className = "status-pill status-blue";

    switch (status) {
      case "Pending":
        label = "En attente";
        className = "status-pill status-amber";
        break;
      case "Reviewing":
        label = "En cours d'étude";
        className = "status-pill status-blue";
        break;
      case "Interview":
        label = "Entretien";
        className = "status-pill status-indigo";
        break;
      case "Accepted":
        label = "Accepté";
        className = "status-pill status-emerald";
        break;
      case "Rejected":
        label = "Rejeté";
        className = "status-pill status-rose";
        break;
      default:
        break;
    }

    return <span className={className}>{label}</span>;
  };

  const sortedJobs = useMemo(() => {
    const clone = [...jobs];
    clone.sort((a, b) => {
      const aActive = a.isActive ? 1 : 0;
      const bActive = b.isActive ? 1 : 0;

      if (aActive !== bActive) return bActive - aActive;

      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return clone;
  }, [jobs]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const app of applications) {
      const job = app.job || {};
      const jobId = job._id || "unknown";

      if (selectedJobId !== "all" && jobId !== selectedJobId) continue;
      if (selectedStatus !== "all" && app.status !== selectedStatus) continue;

      const candidate = app.candidate || {};
      const target =
        ((candidate.name || "") + " " + (candidate.email || "")).toLowerCase();

      if (search && !target.includes(search.toLowerCase())) continue;

      if (!map.has(jobId)) {
        map.set(jobId, {
          job,
          applications: [],
        });
      }
      map.get(jobId).applications.push(app);
    }

    const result = [];
    for (const job of sortedJobs) {
      const jobId = String(job._id);
      if (map.has(jobId)) {
        result.push(map.get(jobId));
      }
    }

    for (const [jobId, group] of map.entries()) {
      const exists = sortedJobs.some((j) => String(j._id) === jobId);
      if (!exists) result.push(group);
    }

    return result;
  }, [applications, sortedJobs, selectedJobId, selectedStatus, search]);

  const totalApplications = applications.length;
  const totalPending = applications.filter((a) => a.status === "Pending").length;
  const totalAccepted = applications.filter((a) => a.status === "Accepted").length;
  const totalRejected = applications.filter((a) => a.status === "Rejected").length;

  const renderApplicationItem = (app) => {
    const candidate = app.candidate || {};
    const job = app.job || {};

    return (
      <div key={app._id} className="application-card">
        <div className="application-card__header">
          <div className="application-card__profile">
            <div className="application-avatar">
            {candidate.avatar ? (
              <img src={candidate.avatar} alt={candidate.name} loading="lazy" />
            ) : (
              <div className="application-avatar__fallback">
                {(candidate.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            </div>

            <div className="application-details">
              <h4 className="application-title">{candidate.name || "Candidat"}</h4>
              <p className="application-sub">{candidate.email || "Email indisponible"}</p>

              <div className="application-meta">
                <span>
                  Candidature du{" "}
                  {app.createdAt
                    ? new Date(app.createdAt).toLocaleDateString()
                    : "—"}
                </span>
                <span>
                  Offre : <strong>{job.title || "Offre inconnue"}</strong>
                </span>
              </div>
            </div>
          </div>
          {renderStatusBadge(app.status)}
        </div>

        <div className="application-actions">
          <div className="status-controls">
            <select
              className="filter-select"
              value={app.status}
              disabled={updatingId === app._id}
              onChange={(e) => handleStatusChange(app._id, e.target.value)}
            >
              <option value="Pending">En attente</option>
              <option value="Reviewing">En cours d'étude</option>
              <option value="Interview">Entretien</option>
              <option value="Accepted">Accepté</option>
              <option value="Rejected">Rejeté</option>
            </select>
          </div>

          <button
            className="ghost-btn"
            onClick={async () => {
              if (!candidate?._id || !job?._id || !user?._id) return;
              try {
                const conversation = await createJobConversation({
                  participants: [user._id, candidate._id],
                  jobId: job._id,
                });
                nav(`/recruiter/messages/${conversation._id}`, {
                  state: {
                    jobId: job._id,
                    jobTitle: job.title,
                    otherParticipant: candidate,
                  },
                });
              } catch (err) {
                console.error("Erreur conversation", err);
              }
            }}
          >
            Contacter →
          </button>
        </div>
      </div>
    );
  };

  return (
    <RecruiterLayout user={user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <div className="hero__badge">Candidatures</div>
          <h3>Suivi centralisé des candidats</h3>
          <p className="hero__subtitle">
            Analysez l'ensemble des candidatures reçues et ajustez vos priorités en un
            coup d'œil.
          </p>
          <p className="hero__hint">Filtrez par offre, statut ou candidat.</p>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Total</span>
            <strong>{totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>En attente</span>
            <strong>{totalPending}</strong>
          </div>
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{applications.filter((a) => a.status === "Interview").length}</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total candidatures</p>
          <p className="stat-value text-indigo">{totalApplications}</p>
          <p className="stat-hint">Vue consolidée de toutes vos offres.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">En attente</p>
          <p className="stat-value text-orange">{totalPending}</p>
          <p className="stat-hint">À traiter rapidement pour répondre aux candidats.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Acceptées</p>
          <p className="stat-value text-emerald">{totalAccepted}</p>
          <p className="stat-hint">Candidats validés pour la suite.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Rejetées</p>
          <p className="stat-value text-purple">{totalRejected}</p>
          <p className="stat-hint">Décisions clôturées sur ces profils.</p>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Filtres rapides</h3>
          <button className="ghost-link subtle" onClick={() => nav("/recruiter/dashboard")}>
            Retour tableau de bord
          </button>
        </div>

        <div className="filters-bar">
          <select
            className="filter-select"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="all">Toutes les offres</option>
            {sortedJobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title} {job.isActive ? "" : " (désactivée)"}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="Pending">En attente</option>
            <option value="Reviewing">En cours d'étude</option>
            <option value="Interview">Entretien</option>
            <option value="Accepted">Accepté</option>
            <option value="Rejected">Rejeté</option>
          </select>

          <input
            className="filter-input"
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Candidatures par offre</h3>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loader">Chargement des candidatures…</div>}

        {!loading && grouped.length === 0 && !error && (
          <div className="empty-state">Aucune candidature ne correspond à ces filtres.</div>
        )}

        {!loading && grouped.length > 0 && (
          <div className="applications-groups">
            {grouped.map((group) => {
              const job = group.job || {};
              const isActive = job.isActive !== false;

              return (
                <div key={job._id} className="card nested-card">
                  <div className="card-header">
                    <div>
                      <h3 className="offer-title">{job.title || "Offre inconnue"}</h3>
                      <p className="offer-location">{job.location || "Lieu non précisé"}</p>
                      <div className="offer-meta">
                        <span className={isActive ? "status-pill status-emerald" : "status-pill status-rose"}>
                          {isActive ? "Active" : "Désactivée"}
                        </span>
                      </div>
                    </div>
                    <div className="status-pill status-blue">
                      {group.applications.length} candidatures
                    </div>
                  </div>

                  <div className="applications-list">
                    {group.applications.map(renderApplicationItem)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </RecruiterLayout>
  );
}

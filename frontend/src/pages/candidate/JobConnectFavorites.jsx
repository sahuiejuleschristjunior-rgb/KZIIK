import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { JobMiniCard } from "../../components/jobconnect/JobConnectWidgets";

export default function JobConnectFavorites() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  const toggleFavorite = (jobId, isFav) => {
    if (isFav) data.unsaveJob(jobId);
    else data.saveJob(jobId);
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero" id="favoris">
        <div className="hero__info">
          <p className="eyebrow">Favoris</p>
          <h3>Vos opportunités retenues</h3>
          <p className="hero__subtitle">
            Retrouvez toutes vos offres sauvegardées et vos recommandations dans un espace dédié.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/fb/dashboard")}>Explorer les offres</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Favoris</span>
            <strong>{data.savedJobs.length}</strong>
          </div>
          <div className="hero-chip">
            <span>Recommandations</span>
            <strong>{data.recommendedJobs.length}</strong>
          </div>
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Favoris">
        <div className="card-header">
          <div>
            <p className="eyebrow">Opportunités</p>
            <h3>Vos favoris</h3>
          </div>
        </div>
        {data.loadingSaved && <div className="loader">Chargement…</div>}
        {!data.loadingSaved && data.savedJobs.length === 0 && (
          <div className="empty-state">Aucun favori pour le moment.</div>
        )}
        <div className="mini-grid">
          {data.savedJobs.map((fav) => (
            <JobMiniCard
              key={fav._id}
              job={fav.job}
              isFavorite
              onOpen={goToJob}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      <section className="card" aria-label="Recommandations">
        <div className="card-header">
          <div>
            <p className="eyebrow">Pour vous</p>
            <h3>Recommandé</h3>
          </div>
        </div>
        {data.loadingReco && <div className="loader">Chargement des recommandations…</div>}
        {!data.loadingReco && data.recommendedJobs.length === 0 && (
          <div className="empty-state">Aucune recommandation pour le moment.</div>
        )}
        <div className="mini-grid">
          {data.recommendedJobs.map((job) => (
            <JobMiniCard
              key={job._id}
              job={job}
              isFavorite={data.savedJobs.some((s) => s.job?._id === job._id)}
              onOpen={goToJob}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>
    </CandidateLayout>
  );
}

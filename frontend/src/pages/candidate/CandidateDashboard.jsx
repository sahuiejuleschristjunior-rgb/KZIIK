import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/CandidateDashboard.css";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { createJobConversation } from "../../api/jobChatApi";
import {
  ApplicationCard,
  ApplicationPipeline,
  JobMiniCard,
} from "../../components/jobconnect/JobConnectWidgets";

export default function CandidateDashboard() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  const contactRecruiter = async (recruiter, job) => {
    if (!recruiter?._id || !job?._id || !data.user?._id) return;
    try {
      const conversation = await createJobConversation({
        participants: [data.user._id, recruiter._id],
        jobId: job._id,
      });
      nav(`/candidate/messages/${conversation._id}`, {
        state: {
          jobId: job._id,
          jobTitle: job.title,
          otherParticipant: recruiter,
        },
      });
    } catch (err) {
      console.error("Erreur conversation", err);
    }
  };

  const callRecruiter = (recruiter) => {
    nav("/video-call", {
      state: {
        userId: recruiter._id,
        name: recruiter.name || recruiter.companyName,
        avatar: recruiter.avatar,
        role: "candidate",
      },
    });
  };

  const nextAction = useMemo(() => {
    if (data.upcomingInterviews > 0) {
      const soonestInterview = data.groupedApps.interview
        .map((app) => new Date(app.interviewDate || app.updatedAt || app.createdAt))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      return {
        title: "Préparez votre prochain entretien",
        subtitle: soonestInterview
          ? `Planifié le ${soonestInterview.toLocaleDateString()} à ${soonestInterview.toLocaleTimeString()}`
          : "Consolidez vos notes et relisez l'offre",
        ctaLabel: "Ouvrir l'agenda",
        ctaAction: () => nav("/candidate/agenda"),
        hint: "Révisez la fiche de poste et notez 3 questions à poser.",
      };
    }

    if (data.recommendedJobs.length > 0) {
      return {
        title: "Postulez à une offre recommandée",
        subtitle: data.recommendedJobs[0].title,
        ctaLabel: "Voir l'offre",
        ctaAction: () => goToJob(data.recommendedJobs[0]._id),
        hint: "Personnalisez votre note d'intention avant d'envoyer.",
      };
    }

    if (data.savedJobs.length > 0) {
      return {
        title: "Finalisez vos favoris",
        subtitle: `${data.savedJobs.length} offre(s) en attente dans vos favoris`,
        ctaLabel: "Ouvrir les favoris",
        ctaAction: () => nav("/candidate/favoris"),
        hint: "Priorisez 2 offres et préparez un message rapide.",
      };
    }

    return {
      title: "Explorez les offres",
      subtitle: "Découvrez de nouvelles opportunités aujourd'hui",
      ctaLabel: "Accéder au flux",
      ctaAction: () => nav("/fb/dashboard"),
      hint: "Filtrez par rôle ou niveau d'expérience pour gagner du temps.",
    };
  }, [data.upcomingInterviews, data.groupedApps.interview, data.recommendedJobs, data.savedJobs, nav]);

  const upcomingAgenda = useMemo(() => {
    return data.groupedApps.interview.slice(0, 3).map((app) => ({
      title: app.job?.title || "Entretien prévu",
      company: app.job?.recruiter?.companyName || app.job?.recruiter?.name,
      when: app.interviewDate || app.updatedAt || app.createdAt,
      recruiter: app.job?.recruiter,
      job: app.job,
    }));
  }, [data.groupedApps.interview]);

  return (
    <CandidateLayout user={data.user} onLogout={logout}>
      <section className="hero" id="recent">
        <div className="hero__info">
          <div className="hero__badge">Action prioritaire</div>
          <h3>{nextAction.title}</h3>
          <p className="hero__subtitle">{nextAction.subtitle}</p>
          <p className="hero__hint">{nextAction.hint}</p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={nextAction.ctaAction}>
              {nextAction.ctaLabel}
            </button>
            <button className="ghost-link subtle" onClick={() => nav("/fb/dashboard")}>
              Parcourir les offres
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Profil</span>
            <strong>{data.profileCompletion}%</strong>
          </div>
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
          <div className="hero-chip">
            <span>Favoris</span>
            <strong>{data.savedJobs.length}</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Candidatures envoyées</p>
          <p className="stat-value text-indigo">{data.totalApplications}</p>
          <p className="stat-hint">Continuez à postuler régulièrement pour rester visible.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Entretiens prévus</p>
          <p className="stat-value text-orange">{data.upcomingInterviews}</p>
          <p className="stat-hint">Préparez vos réponses et consultez le profil du recruteur.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Vues du profil</p>
          <p className="stat-value text-emerald">{data.profileViews}</p>
          <p className="stat-hint">Ajoutez des projets pour augmenter l'intérêt.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Messages reçus</p>
          <p className="stat-value text-purple">{data.messagesCount}</p>
          <p className="stat-hint">Répondez rapidement pour ne rien manquer.</p>
        </div>
      </section>

      <div className="grid-two">
        <section className="card pipeline" aria-label="Pipeline de candidatures">
          <div className="card-header">
            <h3>Suivi des candidatures</h3>
            <button className="ghost-link" onClick={() => nav("/candidate/candidatures")}>Voir tout</button>
          </div>

          <ApplicationPipeline
            groupedApps={{
              applied: data.groupedApps.applied.slice(0, 3),
              inReview: data.groupedApps.inReview.slice(0, 3),
              interview: data.groupedApps.interview.slice(0, 3),
              offer: data.groupedApps.offer.slice(0, 3),
              rejected: data.groupedApps.rejected.slice(0, 3),
            }}
            onOpen={goToJob}
          />
        </section>

        <section className="card agenda-card" id="agenda">
          <div className="card-header">
            <h3>Agenda à venir</h3>
            <button className="ghost-link" onClick={() => nav("/candidate/agenda")}>Voir l'agenda</button>
          </div>

          <div className="agenda-list">
            {upcomingAgenda.length === 0 && (
              <p className="empty-state small">Aucun entretien programmé pour le moment.</p>
            )}

            {upcomingAgenda.map((event, idx) => (
              <div key={`${event.title}-${idx}`} className="agenda-item">
                <div>
                  <p className="agenda-title">{event.title}</p>
                  {event.company && <p className="agenda-sub">{event.company}</p>}
                  {event.when && <p className="agenda-date">{new Date(event.when).toLocaleString()}</p>}
                </div>
                <div className="agenda-actions">
                  <button
                    className="ghost-btn"
                    onClick={() => contactRecruiter(event.recruiter || {}, event.job)}
                  >
                    Contacter
                  </button>
                  <button className="ghost-btn" onClick={() => callRecruiter(event.recruiter || {})}>
                    Appel vidéo
                  </button>
                </div>
              </div>
            ))}
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

          <div className="quick-actions">
            <button className="primary-btn ghost" onClick={() => nav("/candidate/profil")}>Mettre à jour mon profil</button>
          </div>
        </section>
      </div>

      <div className="grid-two">
        <section className="card" aria-label="Candidatures récentes">
          <div className="card-header">
            <div>
              <p className="eyebrow">Chronologie</p>
              <h3>Vos dernières activités</h3>
            </div>
            <button className="ghost-link" onClick={() => nav("/candidate/candidatures")}>
              Tout voir
            </button>
          </div>

          {data.loadingApps && <div className="loader">Chargement de vos candidatures…</div>}
          {data.error && <div className="error-message">{data.error}</div>}
          {!data.loadingApps && data.recentApplications.length === 0 && !data.error && (
            <div className="empty-state">Aucune candidature pour le moment.</div>
          )}

          <div className="applications-list">
            {data.recentApplications.map((app) => (
              <ApplicationCard
                key={app._id}
                app={app}
                onOpen={goToJob}
                onContact={contactRecruiter}
                onCall={callRecruiter}
              />
            ))}
          </div>
        </section>

        <section className="card" id="favoris">
          <div className="card-header">
            <div>
              <p className="eyebrow">Opportunités</p>
              <h3>Favoris & Recommandations</h3>
            </div>
            <button className="ghost-link" onClick={() => nav("/candidate/favoris")}>
              Voir tout
            </button>
          </div>

          <div className="mini-section">
            <div className="mini-section-header">
              <h4>Vos favoris</h4>
              <span className="mini-count">{data.savedJobs.length}</span>
            </div>
            {data.loadingSaved && <div className="loader">Chargement…</div>}
            {!data.loadingSaved && data.savedJobs.length === 0 && (
              <div className="empty-state small">Aucun favori pour le moment.</div>
            )}
            <div className="mini-grid">
              {data.savedJobs.slice(0, 4).map((fav) => (
                <JobMiniCard
                  key={fav._id}
                  job={fav.job}
                  isFavorite
                  onOpen={goToJob}
                  onToggleFavorite={(jobId, isFav) =>
                    isFav ? data.unsaveJob(jobId) : data.saveJob(jobId)
                  }
                />
              ))}
            </div>
          </div>

          <div className="mini-section">
            <div className="mini-section-header">
              <h4>Recommandé pour vous</h4>
              <span className="mini-count">{data.recommendedJobs.length}</span>
            </div>
            {data.loadingReco && <div className="loader">Chargement des recommandations…</div>}
            {!data.loadingReco && data.recommendedJobs.length === 0 && (
              <div className="empty-state small">Aucune recommandation pour le moment.</div>
            )}
            <div className="mini-grid">
              {data.recommendedJobs.slice(0, 4).map((job) => (
                <JobMiniCard
                  key={job._id}
                  job={job}
                  isFavorite={data.savedJobs.some((s) => s.job?._id === job._id)}
                  onOpen={goToJob}
                  onToggleFavorite={(jobId, isFav) =>
                    isFav ? data.unsaveJob(jobId) : data.saveJob(jobId)
                  }
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </CandidateLayout>
  );
}

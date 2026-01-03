import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { createJobConversation } from "../../api/jobChatApi";

export default function JobConnectAgenda() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
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
        userId: recruiter?._id,
        name: recruiter?.name || recruiter?.companyName,
        avatar: recruiter?.avatar,
        role: "candidate",
      },
    });
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero" id="agenda">
        <div className="hero__info">
          <p className="eyebrow">Agenda</p>
          <h3>Vos prochains rendez-vous</h3>
          <p className="hero__subtitle">
            Visualisez vos entretiens à venir et préparez vos échanges avec les recruteurs.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/candidate/entretiens")}>
              Voir les entretiens
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures</span>
            <strong>{data.totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>Recommandations</span>
            <strong>{data.recommendedJobs.length}</strong>
          </div>
        </div>
      </section>

      <section className="card agenda-card">
        <div className="card-header">
          <h3>Agenda à venir</h3>
          <button className="ghost-link" onClick={() => nav("/candidate/favoris")}>Préparer</button>
        </div>

        <div className="agenda-list">
          {data.upcomingAgenda.length === 0 && (
            <p className="empty-state small">Aucun entretien programmé pour le moment.</p>
          )}

          {data.upcomingAgenda.map((event, idx) => (
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
      </section>
    </CandidateLayout>
  );
}

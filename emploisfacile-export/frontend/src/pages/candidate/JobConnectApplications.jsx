import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { ApplicationCard, ApplicationPipeline } from "../../components/jobconnect/JobConnectWidgets";
import { createJobConversation } from "../../api/jobChatApi";

export default function JobConnectApplications() {
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
      <section className="hero" id="recent">
        <div className="hero__info">
          <p className="eyebrow">Mes candidatures</p>
          <h3>Suivez vos candidatures</h3>
          <p className="hero__subtitle">
            Consultez l'ensemble de vos candidatures, leur statut et accédez rapidement aux fiches
            de poste.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/fb/dashboard")}>Continuer à postuler</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Total</span>
            <strong>{data.totalApplications}</strong>
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

      <section className="card pipeline" aria-label="Pipeline de candidatures">
        <div className="card-header">
          <h3>Suivi complet</h3>
        </div>
        <ApplicationPipeline groupedApps={data.groupedApps} onOpen={goToJob} />
      </section>

      <section className="card" aria-label="Candidatures récentes">
        <div className="card-header">
          <div>
            <p className="eyebrow">Chronologie</p>
            <h3>Dernières activités</h3>
          </div>
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
    </CandidateLayout>
  );
}

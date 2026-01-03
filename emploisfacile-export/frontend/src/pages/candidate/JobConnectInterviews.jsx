import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";
import { ApplicationCard } from "../../components/jobconnect/JobConnectWidgets";
import { createJobConversation } from "../../api/jobChatApi";

export default function JobConnectInterviews() {
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

  const interviewApps = data.groupedApps.interview;

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Entretiens</p>
          <h3>Préparez vos entretiens</h3>
          <p className="hero__subtitle">
            Retrouvez vos entretiens planifiés, contactez les recruteurs et relisez les offres avant
            le jour J.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/fb/dashboard")}>Découvrir d'autres offres</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures actives</span>
            <strong>{data.totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>Favoris</span>
            <strong>{data.savedJobs.length}</strong>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Entretiens planifiés">
        <div className="card-header">
          <h3>Vos entretiens à venir</h3>
          <button className="ghost-link" onClick={() => nav("/candidate/agenda")}>Voir l'agenda</button>
        </div>

        {data.loadingApps && <div className="loader">Chargement…</div>}
        {!data.loadingApps && interviewApps.length === 0 && (
          <div className="empty-state">Aucun entretien prévu pour l'instant.</div>
        )}

        <div className="applications-list">
          {interviewApps.map((app) => (
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

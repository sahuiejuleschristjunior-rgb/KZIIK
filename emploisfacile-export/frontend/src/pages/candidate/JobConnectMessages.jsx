import React from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";

export default function JobConnectMessages() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Messages</p>
          <h3>Vos échanges avec les recruteurs</h3>
          <p className="hero__subtitle">
            Accédez directement à votre messagerie pour poursuivre vos conversations en cours.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/candidate/messages")}>Ouvrir la messagerie</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Messages non lus</span>
            <strong>{data.messagesCount}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures</span>
            <strong>{data.totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Guides</p>
            <h3>Actions rapides</h3>
          </div>
        </div>
        <div className="mini-grid">
          <div className="mini-card" onClick={() => nav("/candidate/messages")}>
            <p className="mini-title">Poursuivre une conversation</p>
            <p className="mini-sub">Ouvrir votre boîte de réception.</p>
          </div>
          <div className="mini-card" onClick={() => nav("/candidate/entretiens")}>
            <p className="mini-title">Préparer un entretien</p>
            <p className="mini-sub">Relisez les notes et messages échangés.</p>
          </div>
          <div className="mini-card" onClick={() => nav("/fb/dashboard")}>
            <p className="mini-title">Contacter un nouveau recruteur</p>
            <p className="mini-sub">Identifiez des offres et envoyez un message.</p>
          </div>
        </div>
      </section>
    </CandidateLayout>
  );
}

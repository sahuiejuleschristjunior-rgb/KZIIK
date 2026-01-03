import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostJobForm from "../../components/PostJobForm";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import "../../styles/RecruiterDashboard.css";
import "../../styles/CreateJobPage.css";

const parseUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch (err) {
    console.warn("USER PARSE ERROR", err);
    return {};
  }
};

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [lastJob, setLastJob] = useState(null);

  const currentUser = useMemo(() => parseUser(), []);
  const isRecruiter = ["recruiter", "recruteur"].includes(
    (currentUser.role || "").toLowerCase()
  );

  const shortText = (text = "", max = 180) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return "Aucune description fournie";
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <RecruiterLayout user={currentUser} onLogout={handleLogout} eyebrow="Espace recruteur">
      <div className="create-job-page">
        <header className="create-job-hero">
          <div>
            <p className="create-job-kicker">Publication d'offres</p>
            <h1>Créez une nouvelle opportunité</h1>
            <p className="create-job-subtitle">
              Les offres validées sont directement visibles dans le JobFeed des
              candidats.
            </p>
            <div className="create-job-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => navigate("/fb/emplois")}
              >
                Voir le JobFeed
              </button>
              <button
                type="button"
                className="ghost-button secondary"
                onClick={() => navigate(-1)}
              >
                Retour
              </button>
            </div>
          </div>
          <div className="create-job-highlight">
            <p>Recruteur connecté</p>
            <strong>{currentUser.name || currentUser.companyName || "Vous"}</strong>
            <span>Votre offre apparaîtra sous ce profil</span>
          </div>
        </header>

        <div className="create-job-grid">
          <section className="create-job-main">
            {!isRecruiter && (
              <div className="job-alert warning">
                Seuls les recruteurs peuvent publier des offres. Connectez-vous
                avec un compte recruteur pour continuer.
              </div>
            )}
            <PostJobForm onJobPosted={setLastJob} />
          </section>

          <aside className="create-job-aside">
            <div className="aside-card">
              <p className="aside-title">Conseils rapides</p>
              <ul>
                <li>Précisez le lieu exact ou le télétravail.</li>
                <li>Ajoutez une fourchette salariale pour attirer plus vite.</li>
                <li>Utilisez un titre clair et actionnable.</li>
              </ul>
            </div>

            {lastJob && (
              <div className="aside-card preview-card">
                <p className="aside-title">Dernière offre publiée</p>
                <p className="preview-role">{lastJob.title}</p>
                <p className="preview-meta">
                  {lastJob.location || "Lieu non précisé"} •
                  {" "}
                  {lastJob.contractType || "Contrat"}
                </p>
                <p className="preview-description">{shortText(lastJob.description)}</p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate("/fb/emplois")}
                >
                  Ouvrir le JobFeed
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </RecruiterLayout>
  );
}

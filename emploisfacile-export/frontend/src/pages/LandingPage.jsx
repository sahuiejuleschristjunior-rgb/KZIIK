import "../styles/auth.css";
import "../styles/LandingPage.css";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="lp-container">

      <header className="lp-header">
        <Link to="/" className="lp-logo">EmploisFacile</Link>
        <div className="lp-nav">
          <Link to="/login" className="lp-btn-small">Connexion</Link>
          <Link to="/register" className="lp-btn-small white">Inscription</Link>
        </div>
      </header>

      <h1 className="lp-title">
        Trouver un emploi n'a jamais été aussi simple
      </h1>

      <p className="lp-sub-top">
        Publiez, postulez, recrutez rapidement | inscription gratuite.
      </p>

      <div className="lp-buttons">
        <Link to="/register" className="lp-btn lp-btn-white">Inscription</Link>
        <Link to="/login" className="lp-btn lp-btn-outline">Connexion</Link>
      </div>

      <div className="lp-stats">
        <div className="lp-card">
          <div className="lp-value">10 500+</div>
          <div className="lp-label">Candidats</div>
        </div>
        <div className="lp-card">
          <div className="lp-value">1 800+</div>
          <div className="lp-label">Recruteurs</div>
        </div>
        <div className="lp-card">
          <div className="lp-value">750+</div>
          <div className="lp-label">Offres</div>
        </div>
      </div>

      <div className="lp-footer-box">
        <p className="lp-sub-bottom">Le talent rencontre l'opportunité</p>

        <div className="lp-separator"></div>

        <footer className="lp-footer">
          Groupe Stargate © EmploisFacile 2025
        </footer>
      </div>

    </div>
  );
}

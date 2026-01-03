import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/settings.css";

export default function SettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const goToProfile = () => {
    nav("/profil");
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <p className="settings-kicker">Paramètres</p>
          <h1>Gérer votre compte</h1>
          <p className="settings-subtitle">
            Configurez vos préférences et mettez à jour vos informations
            personnelles.
          </p>
        </div>
        {user?.name && <div className="settings-user">{user.name}</div>}
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">⚙️</div>
            <div>
              <p className="settings-card-kicker">Paramètres généraux</p>
              <h2>Gestion du profil</h2>
              <p className="settings-card-subtitle">
                Accédez rapidement aux informations clés de votre compte.
              </p>
            </div>
          </div>

          <div className="settings-actions">
            <button className="settings-action" onClick={goToProfile}>
              <div>
                <p className="settings-action-title">
                  Modifier les informations du profil
                </p>
                <p className="settings-action-text">
                  Mettez à jour votre nom, votre avatar ou votre biographie.
                </p>
              </div>
              <span className="settings-action-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

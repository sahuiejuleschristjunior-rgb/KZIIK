import "../styles/menuLeft.css";

export default function LeftMenu() {
  const items = [
    { icon: "🏠", label: "Accueil" },
    { icon: "🔍", label: "Trouver un emploi" },
    { icon: "📄", label: "Mon CV" },
    { icon: "✉️", label: "Lettres de motivation" },
    { icon: "📤", label: "Candidatures envoyées" },
    { icon: "🔔", label: "Notifications" },
    { icon: "💬", label: "Messages" },
    { icon: "📊", label: "Statistiques" },
    { icon: "🎥", label: "Présentation vidéo" },
    { icon: "⚙️", label: "Paramètres" },
    { icon: "👤", label: "Profil" },
  ];

  return (
    <aside className="left-menu-box">
      {items.map((item, index) => (
        <div key={index} className="left-item">
          <span className="left-icon">{item.icon}</span>
          <span className="left-text">{item.label}</span>
        </div>
      ))}
    </aside>
  );
}

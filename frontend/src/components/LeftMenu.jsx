import "../styles/menuLeft.css";

export default function LeftMenu() {
  const items = [
    { icon: "🏠", label: "Accueil" },
    { icon: "🧑‍🤝‍🧑", label: "Relations" },
    { icon: "🔔", label: "Notifications" },
    { icon: "💬", label: "Messages" },
    { icon: "🎬", label: "Reels" },
    { icon: "📄", label: "Pages" },
    { icon: "📣", label: "Publicités" },
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

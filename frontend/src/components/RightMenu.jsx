import "../styles/RightMenu.css";

export default function RightMenu() {
  const suggestions = [
    {
      name: "Orange Côte d'Ivoire",
      role: "Entreprise vérifiée",
      avatar: "https://i.pravatar.cc/150?img=12"
    },
    {
      name: "Talent CI",
      role: "Recrutement",
      avatar: "https://i.pravatar.cc/150?img=8"
    },
    {
      name: "Candidat Pro",
      role: "En recherche active",
      avatar: "https://i.pravatar.cc/150?img=20"
    },
  ];

  return (
    <aside className="right-menu-container">

      {/* Titre du bloc */}
      <h3 className="right-title">À découvrir</h3>

      {/* Liste */}
      <div className="right-suggestions">
        {suggestions.map((item, i) => (
          <div key={i} className="right-item">
            <img src={item.avatar} className="right-avatar" alt="" loading="lazy" />

            <div className="right-info">
              <p className="right-name">{item.name}</p>
              <span className="right-meta">{item.role}</span>
            </div>

            <button className="right-follow-btn">Suivre</button>
          </div>
        ))}
      </div>

      {/* Zone pub */}
      <div className="right-ads-box">
        <p className="right-ads-title">Publicités</p>
        <div className="right-ad">Votre annonce ici</div>
      </div>

    </aside>
  );
}

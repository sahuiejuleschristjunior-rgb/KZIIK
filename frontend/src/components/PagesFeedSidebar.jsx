import "../styles/pages-feed.css";
import FBIcon from "./FBIcon";

const sponsors = [
  {
    title: "Campagne sponsorisée",
    subtitle: "Boostez vos annonces",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "Gérez vos pages",
    subtitle: "Programmez vos posts",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=400&q=80",
  },
];

const contacts = [
  { name: "Abdou Karim", status: "En ligne" },
  { name: "Mélanie", status: "En ligne" },
  { name: "Equipe Support", status: "Hors ligne" },
  { name: "Marketing", status: "En ligne" },
];

export default function PagesFeedSidebar() {
  return (
    <div className="pages-feed-sidebar">
      <div className="pages-feed-card">
        <div className="pages-feed-card-header">
          <span>Sponsorisé</span>
        </div>
        <div className="pages-feed-sponsors">
          {sponsors.map((item, idx) => (
            <article key={idx} className="pages-feed-sponsor-item">
              <img src={item.image} alt="Sponsor" loading="lazy" />
              <div>
                <div className="pages-feed-sponsor-title">{item.title}</div>
                <div className="pages-feed-sponsor-sub">{item.subtitle}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="pages-feed-card">
        <div className="pages-feed-card-header">
          <span>Contacts</span>
          <div className="pages-feed-inline-actions">
            <FBIcon name="search" size={18} />
          </div>
        </div>

        <div className="pages-feed-contacts">
          {contacts.map((c) => (
            <div key={c.name} className="pages-feed-contact">
              <div className="pages-feed-contact-avatar" aria-hidden />
              <div className="pages-feed-contact-meta">
                <span className="pages-feed-contact-name">{c.name}</span>
                <span className="pages-feed-contact-status">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

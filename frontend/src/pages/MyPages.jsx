import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyPages } from "../api/pagesApi";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/page.css";

export default function MyPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyPages();
        if (Array.isArray(res)) setPages(res);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-shell-header">
        <h1>Mes Pages</h1>
        <Link className="btn-primary" to="/pages/create">
          Nouvelle page
        </Link>
      </div>

      {loading && <div>Chargement...</div>}

      {!loading && pages.length === 0 && (
        <div className="empty">Vous n'avez pas encore de page.</div>
      )}

      <div className="page-grid">
        {pages.map((p) => (
          <Link key={p._id} to={`/pages/${p.slug}`} className="page-card">
            <div
              className="page-avatar"
              style={{
                backgroundImage: `url(${getImageUrl(p.avatar)})`,
              }}
            />
            <div className="page-card-body">
              <div className="page-card-title">{p.name}</div>
              <div className="page-card-sub">
                {(p.categories && p.categories.length > 0
                  ? p.categories
                  : [p.category]
                )
                  .filter(Boolean)
                  .join(" • ")}
              </div>
              <div className="page-card-followers">
                {p.followersCount || 0} abonnés
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

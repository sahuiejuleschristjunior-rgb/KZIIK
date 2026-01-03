import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ads.css";
import { buildPaymentLink, loadLocalCampaigns, upsertLocalCampaign } from "../utils/adsStorage";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadCampaign = async () => {
    try {
      let payload = null;
      if (token) {
        const res = await fetch(`${API_URL}/ads/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) payload = data?.data || data;
      }

      if (!payload) {
        const local = loadLocalCampaigns();
        payload = local.find((c) => c._id === id || c.id === id) || null;
      }

      if (payload) {
        const paymentLink = payload.payment?.link || buildPaymentLink(payload._id || payload.id);
        setCampaign({
          ...payload,
          payment: { ...payload.payment, link: paymentLink },
        });
      }
    } catch (err) {
      console.error("AD DETAILS ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const changeStatus = async (status) => {
    if (!status) return;
    if (!token || campaign?.localOnly) {
      const updated = { ...campaign, status };
      upsertLocalCampaign(updated);
      setCampaign(updated);
      return;
    }
    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/ads/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) loadCampaign();
    } catch (err) {
      console.error("AD STATUS ERROR", err);
    } finally {
      setUpdating(false);
    }
  };

  const renderStats = () => {
    const impressions = campaign?.stats?.impressions || 0;
    const clicks = campaign?.stats?.clicks || 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
    const budgetTotal = campaign?.budget?.total ?? campaign?.budgetTotal ?? campaign?.payment?.amount ?? 0;
    const budgetDaily = campaign?.budget?.daily ?? campaign?.budgetDaily ?? null;
    const duration = campaign?.budget?.durationDays ?? campaign?.durationDays;

    return (
      <div className="ads-detail-grid">
        <div className="ads-detail-item">
          <strong>Statut</strong>
          <span className={`ads-status-badge status-${campaign?.status}`}>{campaign?.status}</span>
        </div>
        <div className="ads-detail-item">
          <strong>Impressions</strong>
          <div>{impressions}</div>
        </div>
        <div className="ads-detail-item">
          <strong>Clics</strong>
          <div>{clicks}</div>
        </div>
        <div className="ads-detail-item">
          <strong>CTR</strong>
          <div>{ctr}%</div>
        </div>
        <div className="ads-detail-item">
          <strong>Budget total</strong>
          <div>{budgetTotal || 0} FCFA</div>
        </div>
        <div className="ads-detail-item">
          <strong>Budget quotidien</strong>
          <div>{budgetDaily || Math.ceil((budgetTotal || 0) / (duration || 1))} FCFA</div>
        </div>
      </div>
    );
  };

  const renderPostPreview = () => {
    if (!campaign?.post && !campaign?.creative) return null;
    const sourceName = campaign?.post?.user?.name || campaign?.post?.page?.name || "Votre publication";
    const text = campaign?.post?.text || campaign?.creative?.text || "(Aucun texte)";
    const link = campaign?.post?.link || campaign?.creative?.link;

    return (
      <div className="ads-post-preview">
        <h4>Publication sponsorisée</h4>
        <div className="ads-subtitle">{sourceName}</div>
        <p>{text}</p>
        {link && (
          <a className="ads-preview-link" href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        )}
      </div>
    );
  };

  const content = (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Détails de la campagne</div>
          <div className="ads-subtitle">Suivi des performances en temps réel.</div>
        </div>
        <button className="ads-btn" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>

      {loading || !campaign ? (
        <div className="ads-subtitle">Chargement…</div>
      ) : (
        <>
          <div className="ads-details-card">
            {renderStats()}
            <div className="ads-cta-row">
              {campaign.status === "awaiting_payment" && (
                <button
                  className="ads-btn primary"
                  onClick={() => navigate(`/ads/pay/${campaign._id || campaign.id}`)}
                >
                  Accéder au paiement
                </button>
              )}
              <button
                className="ads-btn primary"
                disabled={campaign.status === "active" || updating}
                onClick={() => changeStatus("active")}
              >
                Activer
              </button>
              <button
                className="ads-btn"
                disabled={campaign.status === "paused" || updating}
                onClick={() => changeStatus("paused")}
              >
                Pause
              </button>
              <button
                className="ads-btn"
                disabled={campaign.status === "ended" || updating}
                onClick={() => changeStatus("ended")}
              >
                Terminer
              </button>
            </div>
          </div>

          {renderPostPreview()}
        </>
      )}
    </div>
  );

  return content;
}

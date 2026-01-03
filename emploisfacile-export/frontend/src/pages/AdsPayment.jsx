import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ads.css";
import { buildPaymentLink, loadLocalCampaigns } from "../utils/adsStorage";
import apiFetch from "../utils/apiFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsPayment() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const local = loadLocalCampaigns();
        let payload =
          local.find((c) => String(c._id || c.id) === String(campaignId)) || null;

        if (!payload) {
          try {
            const data = await apiFetch(`${API_URL}/ads/${campaignId}`, {
              signal: controller.signal,
            });
            payload = data?.data || data || null;
          } catch (err) {
            if (err.name === "AbortError") return;
            console.error("ADS PAYMENT LOAD ERROR", err);
          }
        }

        if (!alive) return;

        if (payload) {
          const paymentLink = payload.payment?.link || buildPaymentLink(payload._id || payload.id);
          setCampaign({
            ...payload,
            payment: { ...payload.payment, link: paymentLink },
          });
        } else {
          setCampaign(null);
        }
      } catch (err) {
        console.error("ADS PAYMENT LOAD ERROR", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchCampaign();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [campaignId]);

  const budgetTotal = campaign?.budget?.total ?? campaign?.budgetTotal ?? campaign?.payment?.amount ?? 0;
  const budgetDaily = campaign?.budget?.daily ?? campaign?.budgetDaily ?? null;
  const duration = campaign?.budget?.durationDays ?? campaign?.durationDays;

  const renderRecap = () => (
    <div className="ads-payment-card">
      <div className="ads-panel-title">Récapitulatif campagne</div>
      <div className="ads-subtext">Vérifiez les informations avant de payer.</div>
      <div className="ads-payment-row">
        <span>Objectif</span>
        <strong>{campaign?.objective || "Non spécifié"}</strong>
      </div>
      <div className="ads-payment-row">
        <span>Audience</span>
        <strong>{campaign?.audience?.country || "Non définie"}</strong>
      </div>
      <div className="ads-payment-row">
        <span>Budget total</span>
        <strong>{budgetTotal || 0} FCFA</strong>
      </div>
      <div className="ads-payment-row">
        <span>Budget/jour</span>
        <strong>{budgetDaily || Math.ceil((budgetTotal || 0) / (duration || 1))} FCFA</strong>
      </div>
      <div className="ads-payment-row">
        <span>Dates</span>
        <strong>
          {campaign?.startDate && campaign?.endDate
            ? `${new Date(campaign.startDate).toLocaleDateString()} → ${new Date(
                campaign.endDate
              ).toLocaleDateString()}`
            : "À confirmer"}
        </strong>
      </div>
    </div>
  );

  const renderMethods = () => (
    <div className="ads-payment-card">
      <div className="ads-panel-title">Méthodes de paiement</div>
      <div className="ads-subtext">Choisissez votre méthode préférée (bientôt disponible).</div>
      <ul className="ads-payment-methods">
        <li>Mobile Money (Orange / MTN / Moov)</li>
        <li>Carte bancaire</li>
        <li>Virement bancaire</li>
      </ul>
      <button className="ads-btn primary" type="button" disabled>
        Payer maintenant (bientôt disponible)
      </button>
      <div className="ads-subtext" style={{ marginTop: 8 }}>
        Votre lien de paiement :{" "}
        <a className="ads-preview-link" href={campaign?.payment?.link} target="_blank" rel="noreferrer">
          {campaign?.payment?.link}
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="ads-shell">
        <div className="ads-header">
          <div className="ads-title">Paiement de la campagne</div>
        </div>
        <div className="ads-subtitle">Chargement…</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="ads-shell">
        <div className="ads-header">
          <div className="ads-title">Paiement de la campagne</div>
        </div>
        <div className="ads-subtitle">Campagne introuvable.</div>
        <button className="ads-btn" type="button" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Paiement requis</div>
          <div className="ads-subtitle">Finalisez votre commande pour activer la publicité.</div>
        </div>
        <div className="ads-meta-row">
          <span className="ads-status-badge status-awaiting_payment">Paiement requis</span>
          <button className="ads-btn" type="button" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>

      <div className="ads-payment-grid">
        {renderRecap()}
        {renderMethods()}
      </div>
    </div>
  );
}

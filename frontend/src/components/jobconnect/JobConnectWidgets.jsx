import React from "react";
import { getMediaUrl } from "../../utils/mediaUtils";

const statusConfig = {
  pending: { label: "Envoyée", color: "blue" },
  reviewing: { label: "En revue", color: "amber" },
  interview: { label: "Entretien", color: "indigo" },
  accepted: { label: "Offre reçue", color: "emerald" },
  rejected: { label: "Refusée", color: "rose" },
};

export function StatusPill({ status }) {
  const key = (status || "pending").toLowerCase();
  const cfg = statusConfig[key] || statusConfig.pending;
  return <span className={`status-pill status-${cfg.color}`}>{cfg.label}</span>;
}

export function ApplicationCard({ app, onOpen, onContact, onCall }) {
  const job = app.job || {};
  const recruiter = job.recruiter || {};
  const company = recruiter.companyName || recruiter.name || "Entreprise";
  const status = (app.status || "pending").toLowerCase();
  const previewImage = job?.media?.images?.[0];
  const previewUrl = getMediaUrl(previewImage);
  const hasVideo = Boolean(job?.media?.video);

  const actionConfig = {
    interview: {
      label: "Préparer l'entretien",
      hint: "Revoyez la fiche de poste avant l'échange.",
      action: () => onOpen(job._id),
    },
    inreview: {
      label: "Relancer le recruteur",
      hint: "Envoyez un message cordial pour demander un retour.",
      action: () => onContact(recruiter, job),
    },
    reviewing: {
      label: "Relancer le recruteur",
      hint: "Envoyez un message cordial pour demander un retour.",
      action: () => onContact(recruiter, job),
    },
    accepted: {
      label: "Répondre à l'offre",
      hint: "Clarifiez les détails avant d'accepter.",
      action: () => onCall(recruiter),
    },
    offer: {
      label: "Répondre à l'offre",
      hint: "Clarifiez les détails avant d'accepter.",
      action: () => onCall(recruiter),
    },
    rejected: {
      label: "Voir le feedback",
      hint: "Identifiez les points à améliorer pour la prochaine.",
      action: () => onOpen(job._id),
    },
    default: {
      label: "Relancer le recruteur",
      hint: "Un court message suffit pour se rappeler à lui.",
      action: () => onContact(recruiter, job),
    },
  };

  const { label, hint, action } =
    actionConfig[status] || actionConfig.default;

  return (
    <div key={app._id} className="application-card" onClick={() => onOpen(job._id)}>
      <div className="application-card__header">
        <div>
          <p className="application-title">{job.title || "Poste"}</p>
          <p className="application-sub">{company}</p>
        </div>
        <div className="application-status">
          {hasVideo && <span className="media-badge">Vidéo</span>}
          <StatusPill status={status} />
        </div>
      </div>

      {previewUrl && (
        <div className="application-media">
          <img src={previewUrl} alt={`Aperçu ${job.title || "poste"}`} />
        </div>
      )}

      <div className="application-meta">
        <span>
          Dernière mise à jour :
          {" "}
          {app.updatedAt || app.createdAt
            ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
            : "-"}
        </span>
        <span className="muted">{job.location || job.city || "Localisation non renseignée"}</span>
      </div>

      <div className="application-actions">
        <div className="application-hint">{hint}</div>
        <button
          className="primary-btn ghost"
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

export function JobMiniCard({ job, isFavorite, onToggleFavorite, onOpen }) {
  if (!job) return null;
  const recruiterName =
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise";

  return (
    <div key={job._id} className="mini-card" onClick={() => onOpen(job._id)}>
      <div className="mini-card-top">
        <div>
          <p className="mini-title">{job.title}</p>
          <p className="mini-sub">{recruiterName}</p>
        </div>
        <button
          className={`fav-toggle ${isFavorite ? "fav-active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(job._id, isFavorite);
          }}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>
      <p className="mini-meta">{job.location || "Localisation"}</p>
    </div>
  );
}

export function ApplicationPipeline({ groupedApps, onOpen }) {
  const lanes = [
    { key: "applied", label: "Envoyée", color: "blue" },
    { key: "inReview", label: "En revue", color: "amber" },
    { key: "interview", label: "Entretien", color: "indigo" },
    { key: "offer", label: "Offre", color: "emerald" },
    { key: "rejected", label: "Refusée", color: "rose" },
  ];

  return (
    <div className="lanes">
      {lanes.map((lane) => (
        <div key={lane.key} className="lane">
          <div className="lane-header">
            <span className={`lane-dot lane-${lane.color}`}></span>
            <div>
              <p className="lane-title">{lane.label}</p>
              <p className="lane-count">{groupedApps[lane.key].length} offre(s)</p>
            </div>
          </div>
          <div className="lane-body">
            {groupedApps[lane.key].length === 0 && (
              <p className="empty-state small">Aucune offre dans cette étape.</p>
            )}
            {groupedApps[lane.key].map((app) => (
              <div key={app._id} className="lane-card" onClick={() => onOpen(app.job?._id)}>
                <p className="lane-card__title">{app.job?.title || "Poste"}</p>
                <p className="lane-card__subtitle">
                  {app.job?.recruiter?.companyName || app.job?.recruiter?.name || "Entreprise"}
                </p>
                <div className="lane-card__footer">
                  <span>
                    {app.updatedAt || app.createdAt
                      ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                  <span className="ghost-link">Ouvrir</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecruiterPipeline({ groupedApps, onOpen }) {
  const lanes = [
    { key: "applied", label: "Nouvelles", color: "blue" },
    { key: "inReview", label: "En revue", color: "amber" },
    { key: "interview", label: "Entretiens", color: "indigo" },
    { key: "offer", label: "Offres", color: "emerald" },
    { key: "rejected", label: "Refusées", color: "rose" },
  ];

  return (
    <div className="lanes">
      {lanes.map((lane) => (
        <div key={lane.key} className="lane">
          <div className="lane-header">
            <span className={`lane-dot lane-${lane.color}`}></span>
            <div>
              <p className="lane-title">{lane.label}</p>
              <p className="lane-count">{groupedApps[lane.key].length} candidat(s)</p>
            </div>
          </div>
          <div className="lane-body">
            {groupedApps[lane.key].length === 0 && (
              <p className="empty-state small">Aucun candidat dans cette étape.</p>
            )}
            {groupedApps[lane.key].map((app) => (
              <div
                key={app._id}
                className="lane-card"
                onClick={() => onOpen?.(app.job?._id, app.candidate?._id)}
              >
                <p className="lane-card__title">{app.candidate?.name || "Candidat"}</p>
                <p className="lane-card__subtitle">{app.job?.title || "Poste"}</p>
                <div className="lane-card__footer">
                  <span>
                    {app.updatedAt || app.createdAt
                      ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                  <span className="ghost-link">Ouvrir</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

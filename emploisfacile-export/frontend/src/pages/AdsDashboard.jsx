import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ads.css";
import FBIcon from "../components/FBIcon";
import {
  addArchivedCampaign,
  buildPaymentLink,
  deleteLocalCampaign,
  loadArchivedCampaignIds,
  loadLocalCampaigns,
  removeArchivedCampaign,
  upsertLocalCampaign,
} from "../utils/adsStorage";
import apiFetch from "../utils/apiFetch";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

export default function AdsDashboard({ view = "campaigns" }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [devToast, setDevToast] = useState(null);
  const nav = useNavigate();
  const { logout } = useAuth();

  const getLocalCampaigns = () => {
    const campaigns = loadLocalCampaigns();
    return campaigns.map((c) => ({ ...c, localOnly: !c.ownerType }));
  };

  const showSessionExpired = () => {
    setDevToast("Session expirée");
    setTimeout(() => setDevToast(null), 2500);
    logout();
  };

  const getValidToken = () => {
    const token = localStorage.getItem("token");
    if (!token || token.split(".").length !== 3) {
      showSessionExpired();
      return null;
    }
    return token;
  };

  const logFetch = (payload) => {
    console.debug("[ADS ACTION]", {
      ...payload,
      tokenPreview: payload.token ? `${payload.token.slice(0, 6)}...${payload.token.slice(-6)}` : null,
    });
  };

  const loadCampaigns = async () => {
    try {
      const local = getLocalCampaigns();
      let backendCampaigns = [];
      const token = getValidToken();

      if (token) {
        try {
          const data = await apiFetch(`${API_URL}/ads/my`);
          backendCampaigns = Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
        } catch (err) {
          console.error("ADS LOAD ERROR", err);
          if (err.status === 401 || err.status === 403) {
            showSessionExpired();
          }
        }
      }

      const normalizedLocal = local.map((c) => ({
        ...c,
        _id: c._id || c.id || `local-${c.createdAt || Date.now()}`,
        id: c.id || c._id || `local-${c.createdAt || Date.now()}`,
        localOnly: !c.ownerType,
        payment: {
          ...c.payment,
          link: c.payment?.link || buildPaymentLink(c._id || c.id),
        },
      }));

      if (token) {
        const awaiting = normalizedLocal.filter(
          (c) => c._id && c.status === "awaiting_payment" && !c.payment?.emailSentAt
        );
        for (const camp of awaiting) {
          try {
            logFetch({ action: "awaiting_payment_sync", id: camp._id, token });
            const data = await apiFetch(`${API_URL}/ads/${camp._id}/status`, {
              method: "PUT",
              body: {
                status: "awaiting_payment",
                review: camp.review,
                payment: { amount: camp.payment?.amount || camp.budgetTotal, currency: "FCFA" },
              },
            });
            if (data?.data) {
              upsertLocalCampaign(data.data);
            }
          } catch (err) {
            console.error("ADS SYNC ERROR", err);
            if (err.status === 401 || err.status === 403) {
              showSessionExpired();
              break;
            }
          }
        }
      }

      const merged = new Map();
      backendCampaigns.forEach((c) => {
        const key = String(c._id);
        merged.set(key, c);
      });

      normalizedLocal.forEach((c) => {
        const key = String(c._id);
        if (merged.has(key)) {
          merged.set(key, { ...c, ...merged.get(key), localOnly: false });
        } else {
          merged.set(key, c);
        }
      });

      const archivedIds = loadArchivedCampaignIds();

      const mergedList = Array.from(merged.values()).sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

      const withArchives = mergedList.map((c) => {
        const id = String(c._id || c.id);
        const archived = Boolean(c.archived || archivedIds.includes(id) || c.status === "ended");
        const safeStatus = archived && c.status === "active" ? "paused" : c.status;
        return {
          ...c,
          status: safeStatus,
          archived,
        };
      });

      setCampaigns(withArchives);
    } catch (err) {
      console.error("ADS LOAD ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const pushDevToast = (payload) => {
    const text = `[DEV] ${payload.action} → ${payload.afterStatus || payload.status}`;
    setDevToast(`${text} (id=${payload.id || payload.campaignId})`);
    setTimeout(() => setDevToast(null), 2500);
  };

  const logAction = (payload) => {
    console.debug("ADS ACTION", payload);
    pushDevToast(payload);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".ads-card-menu")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const changeStatus = async (campaignId, status, e, isLocal = false) => {
    e?.stopPropagation();
    if (!campaignId || !status) return;

    if (isLocal) {
      try {
        const stored = loadLocalCampaigns();
        const existing = stored.find((c) => c.id === campaignId || c._id === campaignId) || { id: campaignId };
        upsertLocalCampaign({ ...existing, status });
        setCampaigns((prev) =>
          prev.map((c) => (c._id === campaignId || c.id === campaignId ? { ...c, status } : c))
        );
        logAction({
          action: "changeStatus",
          id: campaignId,
          backendId: existing._id,
          isLocal: true,
          beforeStatus: existing.status,
          afterStatus: status,
          archived: existing.archived,
        });
      } catch (err) {
        console.error("ADS LOCAL STATUS ERROR", err);
      }
      return;
    }

    const token = getValidToken();
    if (!token) {
      setOpenMenuId(null);
      return;
    }

    try {
      setUpdating(true);
      logFetch({ action: "changeStatus", id: campaignId, token });
      await apiFetch(`${API_URL}/ads/${campaignId}/status`, {
        method: "PUT",
        body: { status },
      });

      logAction({
        action: "changeStatus",
        id: campaignId,
        backendId: campaignId,
        isLocal: false,
        beforeStatus: null,
        afterStatus: status,
      });

      loadCampaigns();
    } catch (err) {
      console.error("ADS STATUS ERROR", err);
      if (err.status === 401 || err.status === 403) {
        showSessionExpired();
      }
    } finally {
      setUpdating(false);
    }
  };

  const archiveCampaign = async (campaign, isLocal = false, e) => {
    e?.stopPropagation();
    if (!campaign) return;
    const campaignId = campaign._id || campaign.id;
    const backendId = campaign._id && !campaign.localOnly ? campaign._id : null;
    const beforeStatus = campaign.status;
    const nextStatus = campaign.status === "active" ? "paused" : campaign.status;
    const payload = { archived: true, status: nextStatus };

    let token = null;
    if (!isLocal) {
      token = getValidToken();
      if (!token) {
        setOpenMenuId(null);
        return;
      }
    }

    if (isLocal) {
      upsertLocalCampaign({ ...campaign, ...payload });
      addArchivedCampaign(campaignId);
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId
            ? { ...c, ...payload, archived: true, status: nextStatus }
            : c
        )
      );
      logAction({
        action: "archive",
        id: campaignId,
        backendId,
        isLocal,
        beforeStatus,
        afterStatus: nextStatus,
        archived: true,
      });
      setOpenMenuId(null);
      return;
    }

    try {
      setUpdating(true);
      logFetch({ action: "archive", campaignId, token });
      const data = await apiFetch(`${API_URL}/ads/${campaignId}/status`, {
        method: "PUT",
        body: { ...payload, archived: true },
      });
      const updated = data?.data || {};
      const finalStatus = updated.status || nextStatus;
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId
            ? { ...c, ...updated, archived: true, status: finalStatus }
            : c
        )
      );
      addArchivedCampaign(campaignId);
      logAction({
        action: "archive",
        id: campaignId,
        backendId,
        isLocal,
        beforeStatus,
        afterStatus: finalStatus,
        archived: true,
      });
    } catch (err) {
      console.error("ADS ARCHIVE ERROR", err);
      if (err.status === 401 || err.status === 403) {
        showSessionExpired();
        setOpenMenuId(null);
        return;
      }
      pushDevToast({ action: "archive_error", id: campaignId, afterStatus: beforeStatus });
    } finally {
      setUpdating(false);
      setOpenMenuId(null);
    }
  };

  const handlePause = async (campaign, e) => {
    e?.stopPropagation();
    if (!campaign) return;
    const campaignId = campaign._id || campaign.id;
    const isLocal = Boolean(campaign.localOnly && !campaign.ownerType);
    const beforeStatus = campaign.status;
    const beforeArchived = campaign.archived;

    let token = null;
    if (!isLocal) {
      token = getValidToken();
      if (!token) {
        setOpenMenuId(null);
        return;
      }
    }

    if (isLocal) {
      upsertLocalCampaign({ ...campaign, status: "paused" });
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId ? { ...c, status: "paused" } : c
        )
      );
      logAction({
        action: "pause",
        id: campaignId,
        backendId: campaign._id,
        isLocal,
        beforeStatus,
        afterStatus: "paused",
        archived: beforeArchived,
      });
      setOpenMenuId(null);
      return;
    }

    try {
      setUpdating(true);
      logFetch({ action: "pause", campaignId, token });
      const data = await apiFetch(`${API_URL}/ads/${campaignId}/status`, {
        method: "PUT",
        body: { status: "paused" },
      });
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId
            ? { ...c, ...data?.data, status: "paused" }
            : c
        )
      );
      logAction({
        action: "pause",
        id: campaignId,
        backendId: campaign._id,
        isLocal,
        beforeStatus,
        afterStatus: "paused",
        archived: beforeArchived,
      });
    } catch (err) {
      console.error("ADS PAUSE ERROR", err);
      if (err.status === 401 || err.status === 403) {
        showSessionExpired();
        setOpenMenuId(null);
        return;
      }
      pushDevToast({ action: "pause_error", id: campaignId, afterStatus: beforeStatus });
    } finally {
      setUpdating(false);
      setOpenMenuId(null);
    }
  };

  const handleEnd = async (campaign, e) => {
    e?.stopPropagation();
    if (!campaign) return;
    const campaignId = campaign._id || campaign.id;
    const isLocal = Boolean(campaign.localOnly && !campaign.ownerType);
    const beforeStatus = campaign.status;
    const endedAt = new Date().toISOString();
    let token = null;

    if (!isLocal) {
      token = getValidToken();
      if (!token) {
        setOpenMenuId(null);
        return;
      }
    }

    if (isLocal) {
      upsertLocalCampaign({ ...campaign, status: "ended", archived: true, endedAt });
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId
            ? { ...c, status: "ended", archived: true, endedAt }
            : c
        )
      );
      addArchivedCampaign(campaignId);
      logAction({
        action: "end",
        id: campaignId,
        backendId: campaign._id,
        isLocal,
        beforeStatus,
        afterStatus: "ended",
        archived: true,
      });
      setOpenMenuId(null);
      return;
    }

    try {
      setUpdating(true);
      logFetch({ action: "end", campaignId, token });
      const data = await apiFetch(`${API_URL}/ads/${campaignId}/status`, {
        method: "PUT",
        body: { status: "ended", archived: true, endedAt },
      });
      const updated = data?.data || {};
      const finalEndedAt = updated.endedAt || endedAt;
      setCampaigns((prev) =>
        prev.map((c) =>
          c._id === campaignId || c.id === campaignId
            ? { ...c, ...updated, status: "ended", archived: true, endedAt: finalEndedAt }
            : c
        )
      );
      addArchivedCampaign(campaignId);
      logAction({
        action: "end",
        id: campaignId,
        backendId: campaign._id,
        isLocal,
        beforeStatus,
        afterStatus: "ended",
        archived: true,
      });
    } catch (err) {
      console.error("ADS END ERROR", err);
      if (err.status === 401 || err.status === 403) {
        showSessionExpired();
        setOpenMenuId(null);
        return;
      }
      pushDevToast({ action: "end_error", id: campaignId, afterStatus: beforeStatus });
    } finally {
      setUpdating(false);
      setOpenMenuId(null);
    }
  };

  const deleteArchived = (campaignId) => {
    if (!campaignId) return;
    setCampaigns((prev) => prev.filter((c) => c._id !== campaignId && c.id !== campaignId));
    deleteLocalCampaign(campaignId);
    removeArchivedCampaign(campaignId);
  };

  const isArchiveView = view === "archives";

  const filteredCampaigns = useMemo(() => {
    if (!Array.isArray(campaigns)) return [];
    return campaigns.filter((c) =>
      isArchiveView ? c.archived === true || c.status === "ended" : c.status !== "ended" && !c.archived
    );
  }, [campaigns, isArchiveView]);

  const renderCard = (camp) => {
    const rawStatus = camp.status || "draft";
    const status = camp.archived && rawStatus === "active" ? "paused" : rawStatus;
    const isLocal = Boolean(camp.localOnly && !camp.ownerType);
    const postTitle = camp.post?.text?.slice(0, 80) || "Publication sponsorisée";
    const impressions = camp.stats?.impressions || 0;
    const clicks = camp.stats?.clicks || 0;
    const budgetTotal = camp.budget?.total ?? camp.budgetTotal ?? camp.payment?.amount ?? 0;
    const budgetDaily = camp.budget?.daily ?? camp.budgetDaily ?? null;
    const audienceParts = [];
    const startDate = camp.budget?.startDate || camp.startDate;
    const endDate = camp.budget?.endDate || camp.endDate;

    if (camp.audience?.country) audienceParts.push(camp.audience.country);
    if (camp.audience?.city) audienceParts.push(camp.audience.city);
    if (camp.audience?.ageMin && camp.audience?.ageMax)
      audienceParts.push(`${camp.audience.ageMin}-${camp.audience.ageMax} ans`);

    const audienceText = audienceParts.join(", ") || "Audience non renseignée";
    const campaignId = camp._id || camp.id;
    const isArchived = camp.archived || status === "ended";
    const hasMenuActions = isArchiveView || ["awaiting_payment", "active", "paused"].includes(status);
    const statusLabel =
      {
        review: "En analyse",
        awaiting_payment: "Paiement requis",
        active: "Active",
        paused: "En pause",
        ended: "Terminée",
        draft: "Brouillon",
      }[status] || status;

    return (
      <div
        key={campaignId}
        className={`ads-card ${isArchived ? "archived" : ""}`}
        onClick={() => {
          if (isArchiveView || isArchived || isLocal) return;
          nav(`/ads/${campaignId}`);
        }}
      >
        <div className="ads-card-menu">
          <button
            type="button"
            className="ads-menu-trigger"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasMenuActions) return;
              setOpenMenuId(openMenuId === campaignId ? null : campaignId);
            }}
            disabled={!hasMenuActions}
          >
            ⋯
          </button>

          {openMenuId === campaignId && hasMenuActions && (
            <div className="ads-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              {!isArchiveView && status === "awaiting_payment" && (
                <button
                  type="button"
                  className="ads-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                    nav(`/ads/pay/${campaignId}`);
                  }}
                  >
                    💳 Payer
                  </button>
              )}

              {!isArchiveView && status === "active" && (
                <>
                  <button
                    type="button"
                    className="ads-menu-item"
                    disabled={updating}
                    onClick={(e) => {
                      handlePause(camp, e);
                      setOpenMenuId(null);
                    }}
                  >
                    ⏸️ Pause
                  </button>
                  <button
                    type="button"
                    className="ads-menu-item"
                    disabled={updating}
                    onClick={(e) => archiveCampaign(camp, isLocal, e)}
                  >
                    📦 Archiver
                  </button>
                  <button
                    type="button"
                    className="ads-menu-item danger"
                    disabled={updating}
                    onClick={(e) => handleEnd(camp, e)}
                  >
                    ⛔ Terminer
                  </button>
                </>
              )}

              {!isArchiveView && status === "paused" && (
                <>
                  <button
                    type="button"
                    className="ads-menu-item"
                    disabled={updating}
                    onClick={(e) => {
                      changeStatus(campaignId, "active", e, isLocal);
                      setOpenMenuId(null);
                    }}
                  >
                    ▶️ Activer
                  </button>
                  <button
                    type="button"
                    className="ads-menu-item"
                    disabled={updating}
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveCampaign(camp, isLocal, e);
                    }}
                  >
                    📦 Archiver
                  </button>
                  <button
                    type="button"
                    className="ads-menu-item danger"
                    disabled={updating}
                    onClick={(e) => handleEnd(camp, e)}
                  >
                    ⛔ Terminer
                  </button>
                </>
              )}

              {isArchiveView && (
                <button
                  type="button"
                  className="ads-menu-item danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Cette action est définitive")) {
                      deleteArchived(campaignId);
                      setOpenMenuId(null);
                    }
                  }}
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>
          )}
        </div>

        <div className="ads-meta-row">
          <span className={`ads-status-badge status-${status}`}>{statusLabel}</span>
          {isArchived && <span className="ads-status-badge archived">Archivée</span>}
          <span>{camp.ownerType === "page" ? "Page" : "Profil"}</span>
          <span>
            {startDate ? new Date(startDate).toLocaleDateString() : ""} →
            {" "}
            {endDate ? new Date(endDate).toLocaleDateString() : "Illimité"}
          </span>
        </div>

        <h3>{postTitle}</h3>

        <div className="ads-stats">
          <span>Budget total: {budgetTotal || 0} FCFA</span>
          <span>Quotidien: {budgetDaily || Math.ceil((budgetTotal || 0) / (camp.budget?.durationDays || 1))} FCFA</span>
          <span>Impressions: {impressions}</span>
          <span>Clics: {clicks}</span>
        </div>

        <div className="ads-subtext">Objectif : {camp.objective || "Non précisé"}</div>
        <div className="ads-subtext">Audience : {audienceText}</div>
        {isArchived && <div className="ads-subtext archived-note">Campagne archivée - actions limitées</div>}
      </div>
    );
  };

  const content = (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">{isArchiveView ? "Archives des campagnes" : "Centre de publicités"}</div>
          <div className="ads-subtitle">
            {isArchiveView
              ? "Retrouvez vos campagnes terminées ou archivées."
              : "Gérez vos campagnes sponsorisées façon Facebook Ads (sans paiement)."}
          </div>
        </div>
        <div className="ads-meta-row">
          <FBIcon name="ads" size={22} />
          <span>{filteredCampaigns.length} campagne(s)</span>
          {!isArchiveView && (
            <button className="ads-btn primary" onClick={() => nav("/ads/create")}>
              Créer une publicité
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ads-subtitle">Chargement des campagnes…</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="ads-subtitle">
          {isArchiveView
            ? "Aucune campagne terminée ou archivée pour le moment."
            : "Aucune campagne pour le moment. Sponsorisez une publication pour commencer."}
        </div>
      ) : (
        <div className="ads-grid">{filteredCampaigns.map((c) => renderCard(c))}</div>
      )}
      {devToast && <div className="ads-dev-toast">{devToast}</div>}
    </div>
  );

  return content;
}

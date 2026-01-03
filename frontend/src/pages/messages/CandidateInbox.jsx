import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import { fetchJobChatConversations } from "../../api/jobChatApi";
import "../../styles/job-chat.css";
import { useNotifications } from "../../context/NotificationContext";
import { API_URL } from "../../api/config";
const getId = (value) => (typeof value === "object" ? value?._id : value);
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

const resolveOtherParticipant = (participants, currentUserId) => {
  if (!Array.isArray(participants)) return null;
  return (
    participants.find((p) => getId(p) !== currentUserId) || participants[0] || null
  );
};

export default function CandidateInbox() {
  const nav = useNavigate();
  const { deleteByType } = useNotifications() || {};
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [conversations, setConversations] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [allowedJobIds, setAllowedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    deleteByType?.("job");
  }, [deleteByType]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchJobChatConversations();
        if (!active) return;
        setConversations(list);
      } catch (err) {
        if (!active) return;
        setError(loadErrorMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const fetchApplications = async () => {
      try {
        const res = await fetch(`${API_URL}/applications/my-applications`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) return;
        const data = await ensureJsonResponse(res);
        const apps = Array.isArray(data) ? data : data.applications || [];
        if (!active) return;
        setAllowedJobIds(new Set(apps.map((app) => String(app?.job?._id)).filter(Boolean)));
      } catch (err) {
        console.error("Erreur candidatures", err);
      }
    };

    fetchApplications();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const jobIds = conversations
      .map((conv) => conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job)
      .filter(Boolean)
      .map(String);

    const missing = jobIds.filter((id) => !jobsById[id]);
    if (!missing.length || !token) return;

    let active = true;

    const fetchJobs = async () => {
      try {
        const results = await Promise.all(
          missing.map((jobId) =>
            fetch(`${API_URL}/jobs/${jobId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
              .then((res) => ensureJsonResponse(res))
              .then((data) => ({
                id: jobId,
                job: data?.job || data?.data || data,
              }))
              .catch(() => ({ id: jobId, job: null }))
          )
        );

        if (!active) return;
        setJobsById((prev) => {
          const next = { ...prev };
          results.forEach(({ id, job }) => {
            next[id] = job;
          });
          return next;
        });
      } catch (err) {
        if (!active) return;
        console.error("Erreur chargement jobs", err);
      }
    };

    fetchJobs();

    return () => {
      active = false;
    };
  }, [conversations, jobsById, token]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const jobId = conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job;
      if (!jobId) return false;
      if (!allowedJobIds.size) return false;
      return allowedJobIds.has(String(jobId));
    });
  }, [conversations, allowedJobIds]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <CandidateLayout user={user} onLogout={handleLogout}>
      <section className="job-chat-hero">
        <div>
          <p className="eyebrow">JobChat</p>
          <h3>Vos échanges avec les recruteurs</h3>
          <p className="job-chat-subtitle">
            Discutez uniquement pour vos candidatures actives, offre par offre.
          </p>
        </div>
      </section>

      <section className="card job-chat-card">
        <div className="card-header">
          <div>
            <h3>Conversations</h3>
            <p className="job-chat-muted">Historique sauvegardé et disponible en temps réel.</p>
          </div>
        </div>

        {loading && <div className="loader">Chargement…</div>}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && filteredConversations.length === 0 && (
          <div className="empty-state">Aucune conversation pour vos candidatures.</div>
        )}

        <div className="job-chat-list">
          {filteredConversations.map((conv) => {
            const jobId =
              conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job;
            const job = jobsById[String(jobId)] || conv?.job;
            const other = resolveOtherParticipant(conv?.participants, user?._id);
            const otherName = other?.companyName || other?.name || "Recruteur";
            const lastMessage = conv?.lastMessage?.content || "Aucun message";
            const jobTitle = job?.title || conv?.jobTitle || "Offre";

            return (
              <button
                key={conv._id || jobId}
                type="button"
                className="job-chat-item"
                onClick={() =>
                  nav(`/candidate/messages/${conv._id}`, {
                    state: {
                      jobId,
                      jobTitle,
                      otherParticipant: other,
                    },
                  })
                }
              >
                <div>
                  <div className="job-chat-item-title">{jobTitle}</div>
                  <div className="job-chat-item-sub">
                    {otherName}
                    <span className="job-chat-role">Recruteur</span>
                  </div>
                </div>
                <div className="job-chat-item-preview">{lastMessage}</div>
              </button>
            );
          })}
        </div>
      </section>
    </CandidateLayout>
  );
}

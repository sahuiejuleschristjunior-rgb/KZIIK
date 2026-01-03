import { useCallback, useEffect, useMemo, useState } from "react";

const safeParseUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch (err) {
    console.warn("USER PARSE ERROR", err);
    return {};
  }
};

const getAppliedKey = (userId) => `appliedJobs:${userId}`;

const readApplied = (userId) => {
  if (!userId) return [];

  try {
    const raw = localStorage.getItem(getAppliedKey(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.warn("APPLIED PARSE ERROR", err);
    return [];
  }
};

const writeApplied = (userId, jobIds) => {
  if (!userId) return;
  localStorage.setItem(getAppliedKey(userId), JSON.stringify([...new Set(jobIds)]));
};

const markApplied = (userId, jobId) => {
  if (!userId || !jobId) return [];
  const current = readApplied(userId);
  if (!current.includes(jobId)) {
    current.push(jobId);
    writeApplied(userId, current);
  }
  return current;
};

export default function useJobApplication({ apiUrl, token, onFeedback }) {
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedSet, setAppliedSet] = useState(new Set());

  const currentUser = useMemo(() => safeParseUser(), []);
  const userId = currentUser?._id || currentUser?.id;
  const role = (currentUser.role || "").toLowerCase();
  const isRecruiter = role === "recruiter" || role === "recruteur";
  const isCandidate = role === "candidate" || role === "candidat";

  const openFeedback = useCallback(
    (message) => {
      if (!message) return;
      if (typeof onFeedback === "function") {
        onFeedback(message);
        return;
      }
      alert(message);
    },
    [onFeedback]
  );

  useEffect(() => {
    if (!userId) return;
    const ids = readApplied(userId);
    setAppliedSet(new Set(ids));
  }, [userId]);

  const registerAppliedFromJobs = useCallback(
    (jobs = []) => {
      if (!userId) return;

      const stored = new Set(readApplied(userId));

      // Persister uniquement côté front : on marque les offres présentes dans
      // le localStorage, sans dépendre d'un éventuel hasApplied envoyé par le backend.
      jobs.forEach((job) => {
        if (stored.has(job?._id)) return;
        if (appliedSet.has(job?._id)) stored.add(job._id);
      });

      setAppliedSet((prev) => {
        const sameSize = prev.size === stored.size;
        const unchanged = sameSize && [...prev].every((id) => stored.has(id));
        if (unchanged) return prev;
        return new Set(stored);
      });

      writeApplied(userId, [...stored]);
    },
    [appliedSet, userId]
  );

  const handleApply = useCallback(
    async (jobId, jobTitle) => {
      if (!jobId || !isCandidate) {
        return { status: "forbidden" };
      }

      const alreadyApplied = appliedSet.has(jobId);

      if (alreadyApplied) {
        openFeedback("Vous avez déjà postulé à cette offre");
        return { status: "already" };
      }

      if (!window.confirm(`Voulez-vous postuler pour "${jobTitle}" ?`)) {
        return { status: "cancel" };
      }

      setApplyingJobId(jobId);

      try {
        const res = await fetch(`${apiUrl}/applications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId }),
        });

        const data = await res.json();

        if (!res.ok) {
          const error = new Error(data?.message || "Échec de la candidature.");
          error.status = res.status;
          throw error;
        }

        const updated = markApplied(userId, jobId);
        setAppliedSet(new Set(updated));

        openFeedback("Votre candidature a bien été envoyée");
        return { status: "success" };
      } catch (err) {
        console.error("APPLY ERROR:", err);
        const alreadyDone =
          err.status === 400 || err.message?.toLowerCase().includes("déjà postulé");

        if (alreadyDone) {
          const updated = markApplied(userId, jobId);
          setAppliedSet(new Set(updated));
          openFeedback("Vous avez déjà postulé à cette offre");
          return { status: "already" };
        }

        openFeedback(err.message || "Erreur lors de l'envoi de la candidature.");
        return { status: "error" };
      } finally {
        setApplyingJobId(null);
      }
    },
    [apiUrl, appliedSet, isCandidate, openFeedback, token, userId]
  );

  return {
    appliedSet,
    applyingJobId,
    handleApply,
    registerAppliedFromJobs,
    isRecruiter,
    isCandidate,
    currentUser,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";

export default function useCandidateDashboardData() {
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingReco, setLoadingReco] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Erreur chargement user:", err);
      }
    }
  }, []);

  const commonHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Erreur chargement profil:", err);
    }
  }, [API_URL, token]);

  useEffect(() => {
    if (!token) return;
    fetchUserProfile();
    fetchApplications();
    fetchSavedJobs();
    fetchRecommended();
  }, [fetchUserProfile, token]);

  const fetchApplications = async () => {
    setLoadingApps(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/applications/my-applications`, {
        headers: commonHeaders,
      });

      if (!res.ok) throw new Error("Impossible de charger vos candidatures.");

      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data.applications || []);
    } catch (err) {
      setError(err.message || "Erreur réseau.");
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchSavedJobs = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch(`${API_URL}/saved-jobs`, {
        headers: commonHeaders,
      });

      const data = await res.json();
      setSavedJobs(Array.isArray(data) ? data : data.savedJobs || []);
    } catch (err) {
      setSavedJobs([]);
    }
    setLoadingSaved(false);
  };

  const saveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ jobId }),
    });
    fetchSavedJobs();
  };

  const unsaveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs/${jobId}`, {
      method: "DELETE",
      headers: commonHeaders,
    });
    fetchSavedJobs();
  };

  const fetchRecommended = async () => {
    setLoadingReco(true);
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: commonHeaders,
      });
      const data = await res.json();
      setRecommendedJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err) {
      setRecommendedJobs([]);
    }
    setLoadingReco(false);
  };

  const groupedApps = useMemo(() => {
    const groups = {
      applied: [],
      inReview: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    for (const app of applications) {
      const status = (app.status || "Pending").toLowerCase();
      if (status === "pending") groups.applied.push(app);
      else if (status === "reviewing") groups.inReview.push(app);
      else if (status === "interview") groups.interview.push(app);
      else if (status === "accepted") groups.offer.push(app);
      else if (status === "rejected") groups.rejected.push(app);
      else groups.applied.push(app);
    }
    return groups;
  }, [applications]);

  const totalApplications = applications.length;
  const upcomingInterviews = groupedApps.interview.length;

  const profileCompletion = Math.min(
    Math.max(Number(user?.profileCompletion || user?.completion || 0), 0),
    100,
  );

  const profileViews = user?.profileViews || 0;
  const messagesCount = user?.unreadMessages || 0;

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [applications]);

  const upcomingAgenda = useMemo(() => {
    return groupedApps.interview.slice(0, 3).map((app) => ({
      title: app.job?.title || "Entretien prévu",
      company: app.job?.recruiter?.companyName || app.job?.recruiter?.name,
      when: app.interviewDate || app.updatedAt || app.createdAt,
      recruiter: app.job?.recruiter,
      job: app.job,
    }));
  }, [groupedApps.interview]);

  return {
    user,
    applications,
    savedJobs,
    recommendedJobs,
    loadingApps,
    loadingSaved,
    loadingReco,
    error,
    groupedApps,
    totalApplications,
    upcomingInterviews,
    profileCompletion,
    profileViews,
    messagesCount,
    recentApplications,
    upcomingAgenda,
    refreshUser: fetchUserProfile,
    updateUser: setUser,
    saveJob,
    unsaveJob,
    contactError: error,
  };
}

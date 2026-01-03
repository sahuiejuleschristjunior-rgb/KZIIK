import { useEffect, useMemo, useState } from "react";

export default function useRecruiterDashboardData() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
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

  useEffect(() => {
    if (token) fetchMyJobs();
  }, [token]);

  const fetchMyJobs = async () => {
    setLoadingJobs(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/jobs/my-jobs`, {
        headers: commonHeaders,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Impossible de charger vos offres.");

      const jobsPayload = Array.isArray(data)
        ? data
        : data.jobs
        ? data.jobs
        : data.data || [];

      setJobs(jobsPayload);
    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const applications = useMemo(
    () => jobs.flatMap((job) => job.applications || []),
    [jobs],
  );

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

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [applications]);

  const upcomingInterviews = useMemo(() => {
    return groupedApps.interview
      .map((app) => ({
        ...app,
        when: app.interviewDate || app.updatedAt || app.createdAt,
      }))
      .sort((a, b) => new Date(a.when) - new Date(b.when))
      .slice(0, 3);
  }, [groupedApps.interview]);

  const activeJobs = jobs.length;
  const totalApplications = applications.length;
  const pendingReview = groupedApps.inReview.length + groupedApps.applied.length;
  const messagesCount = user?.unreadMessages || 0;

  return {
    user,
    jobs,
    applications,
    groupedApps,
    loadingJobs,
    error,
    activeJobs,
    totalApplications,
    pendingReview,
    messagesCount,
    recentApplications,
    upcomingInterviews,
    refreshJobs: fetchMyJobs,
  };
}

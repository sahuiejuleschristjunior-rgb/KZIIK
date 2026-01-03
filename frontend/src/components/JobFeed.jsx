import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/JobFeed.css";

const DEFAULT_CITY_OPTIONS = ["Abidjan", "Cocody", "Plateau"];
const DEFAULT_MODE_OPTIONS = ["Remote", "Hybride", "Présentiel"];
const DEFAULT_CONTRACT_OPTIONS = ["CDI", "CDD", "Stage", "Freelance", "Alternance", "Temps Partiel"];

export default function JobFeed({ jobsMenuOpen = false, setJobsMenuOpen }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL; // https://api.kziik.com/api
  const navigate = useNavigate();
  const searchAbortRef = useRef(null);

  const collectOptions = (items) => {
    const uniq = Array.from(new Set(items.map((value) => value?.trim()).filter(Boolean)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  };

  const getRecruiterName = (job) =>
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

  const getLocation = (job) => job.location || job.city || "Lieu non précisé";
  const getContract = (job) => job.contractType || "Contrat non précisé";
  const getMode = (job) => job.workMode || job.mode || "Mode non précisé";
  const getSalary = (job) => job.salaryRange || "Salaire non précisé";

  const getInitials = (name = "?") =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const tags = (job) => {
    const rawTags = [job.category, job.experienceLevel, job.contractType, job.workMode].filter(Boolean);
    return Array.from(new Set(rawTags)).slice(0, 4);
  };

  useEffect(() => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        if (cityFilter.trim()) params.append("city", cityFilter.trim());
        if (contractFilter.trim()) params.append("contract", contractFilter.trim());
        if (modeFilter.trim()) params.append("mode", modeFilter.trim());

        const queryString = params.toString();
        const url = `${API_URL}/jobs/search${queryString ? `?${queryString}` : ""}`;

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Échec de la récupération des offres.");

        const data = await res.json();

        let jobList = [];

        if (Array.isArray(data?.data)) jobList = data.data;
        else if (Array.isArray(data?.jobs)) jobList = data.jobs;
        else if (Array.isArray(data)) jobList = data;

        if (!controller.signal.aborted) {
          setJobs(jobList);
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("JOB FEED ERROR:", err);
        setError(err.message || "Erreur lors de la récupération des offres.");
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [API_URL, token, searchQuery, cityFilter, contractFilter, modeFilter]);

  const cityOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.location || job.city));
    return values.length ? values : DEFAULT_CITY_OPTIONS;
  }, [jobs]);

  const modeOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.workMode || job.mode));
    return values.length ? values : DEFAULT_MODE_OPTIONS;
  }, [jobs]);

  const contractOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.contractType));
    return values.length ? values : DEFAULT_CONTRACT_OPTIONS;
  }, [jobs]);

  const topTags = useMemo(() => {
    const counts = new Map();
    jobs.forEach((job) => {
      tags(job).forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);
  }, [jobs]);

  const handleReset = () => {
    setSearchQuery("");
    setCityFilter("");
    setContractFilter("");
    setModeFilter("");
  };

  const handleMenuClose = () => {
    if (setJobsMenuOpen) {
      setJobsMenuOpen(false);
    }
  };

  return (
    <div className={`job-feed-screen${jobsMenuOpen ? " job-feed-screen--menu-open" : ""}`}>
      <div className="jobs-shell">
        <aside className="jobs-panel jobs-left-menu">
          <h3>Menu</h3>
          <nav className="jobs-nav">
            <button type="button" className="jobs-nav-item" onClick={handleMenuClose}>
              <span>Accueil</span>
              <span className="jobs-pill">Home</span>
            </button>
            <button type="button" className="jobs-nav-item" onClick={handleMenuClose}>
              <span>Offres</span>
              <span className="jobs-pill">{jobs.length}</span>
            </button>
            <button type="button" className="jobs-nav-item" onClick={handleMenuClose}>
              <span>Entreprises</span>
              <span className="jobs-pill">24</span>
            </button>
            <button type="button" className="jobs-nav-item" onClick={handleMenuClose}>
              <span>Candidatures</span>
              <span className="jobs-pill">3</span>
            </button>
            <button type="button" className="jobs-nav-item" onClick={handleMenuClose}>
              <span>Paramètres</span>
              <span className="jobs-pill">⚙</span>
            </button>
          </nav>

          <div className="jobs-spacer" />
          <h3>Raccourcis</h3>
          <div className="jobs-box jobs-small">
            • Publier une offre<br />
            • Voir les favoris<br />
            • Alertes e-mail
          </div>
        </aside>

        <main className="jobs-main">
          <div className="jobs-main-header">
            <div className="jobs-topbar">
              <div className="jobs-brand">
                <img src="/vite.svg" alt="Logo entreprise" />
                <div>
                  <h1>Offres d’emploi</h1>
                  <div className="jobs-muted">
                    Recherche par mot-clé, ville, type et mode de travail.
                  </div>
                </div>
              </div>
              <div className="jobs-count">{jobs.length} offre(s)</div>
            </div>

            <div className="jobs-bar">
              <input
                id="q"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Titre, compétences, entreprise (ex: marketer, react…)"
              />
              <select
                id="city"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              >
                <option value="">Toutes villes</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                id="type"
                value={contractFilter}
                onChange={(event) => setContractFilter(event.target.value)}
              >
                <option value="">Tous contrats</option>
                {contractOptions.map((contract) => (
                  <option key={contract} value={contract}>
                    {contract}
                  </option>
                ))}
              </select>
              <select
                id="mode"
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
              >
                <option value="">Tous modes</option>
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <button type="button" id="reset" onClick={handleReset}>
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="jobs-main-scroll">
            {loading && <div className="jobs-loader">Chargement des offres...</div>}
            {error && <div className="jobs-error">{error}</div>}
            {!loading && !error && jobs.length === 0 && (
              <div className="jobs-empty">Aucune offre ne correspond à votre recherche.</div>
            )}

            <div className="jobs-list">
              {jobs.map((job) => {
                const companyName = getRecruiterName(job);
                const logoUrl = getImageUrl(job.recruiter?.avatar);
                const jobTags = tags(job);

                return (
                  <div key={job._id} className="jobs-item">
                    <div className="jobs-left">
                      {logoUrl ? (
                        <img className="jobs-mini-logo" src={logoUrl} alt={`Logo ${companyName}`} />
                      ) : (
                        <div className="jobs-mini-logo jobs-logo-fallback">{getInitials(companyName)}</div>
                      )}
                      <div className="jobs-info">
                        <div className="jobs-title">
                          {job.title} • {companyName}
                        </div>
                        <div className="jobs-meta">
                          <span>{getLocation(job)}</span> • <span>{getContract(job)}</span> •{" "}
                          <span>{getMode(job)}</span> • <span>{getSalary(job)}</span>
                        </div>
                        <div className="jobs-tags">
                          {jobTags.map((tag) => (
                            <span key={tag} className="jobs-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="jobs-link"
                      onClick={() => navigate(`/emplois/${job._id}`, { state: { job } })}
                    >
                      Voir
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <aside className="jobs-panel jobs-right-menu">
          <h3>Filtres rapides</h3>
          <div className="jobs-box jobs-small">
            <strong>Top tags</strong>
            <br />
            {topTags.length ? (
              topTags.map((tag) => (
                <div key={tag}>• {tag}</div>
              ))
            ) : (
              <>
                • React
                <br />
                • Marketing
                <br />
                • SQL / BI
                <br />
                • Remote
              </>
            )}
          </div>

          <div className="jobs-spacer" />
          <h3>Infos</h3>
          <div className="jobs-box jobs-small">
            <strong>Conseil</strong> : utilise la recherche pour filtrer vite, et clique sur “Voir”
            pour le détail.
          </div>

          <div className="jobs-spacer" />
          <h3>Publicité / Bannière</h3>
          <div className="jobs-box jobs-small">Espace sponsor / annonce RH</div>
        </aside>
      </div>
    </div>
  );
}

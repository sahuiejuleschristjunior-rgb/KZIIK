import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPages, getPagePosts } from "../api/pagesApi";
import "../styles/ads.css";
import { getImageUrl } from "../utils/imageUtils";
import { buildPaymentLink, loadLocalCampaigns, upsertLocalCampaign } from "../utils/adsStorage";
import TextClamp from "../components/TextClamp";

const API_URL = import.meta.env.VITE_API_URL || "https://api.kziik.com/api";
const POSTS_PER_PAGE = 5;
const AGE_MIN_LIMIT = 13;
const AGE_MAX_LIMIT = 65;
const COUNTRY_SUGGESTIONS = ["Côte d'Ivoire", "Sénégal", "Cameroun", "Bénin", "Burkina Faso"];
const AUDIENCE_CATEGORIES = [
  "Tout",
  "Emploi",
  "Services",
  "Immobilier",
  "Vente",
  "Formation",
  "Autre",
];

function decodeUserId(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id || payload.userId || null;
  } catch (err) {
    return null;
  }
}

function PostRow({ post, sourceLabel, onSelect, isSelected }) {
  const previewMedia = Array.isArray(post?.media) ? post.media[0] : null;
  const previewUrl = previewMedia ? getImageUrl(previewMedia.url) : null;

  return (
    <div className={`ads-post-row ${isSelected ? "selected" : ""}`}>
      <div className="ads-post-row-body">
        <div className="ads-post-meta">
          <span className="ads-source-pill">{sourceLabel}</span>
          <span className="ads-post-author">{post?.page?.name || post?.user?.name}</span>
          <span className="ads-post-date">
            {post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
          </span>
        </div>
        <div className="ads-post-text">
          <TextClamp
            text={post?.text || "(Texte vide)"}
            className="text-content"
          />
        </div>
        {previewUrl && (
          <div className="ads-post-thumb" style={{ backgroundImage: `url(${previewUrl})` }} />
        )}
      </div>
      <button type="button" className="ads-btn primary" onClick={() => onSelect(post)}>
        Sélectionner
      </button>
    </div>
  );
}

function PostRowSkeleton() {
  return (
    <div className="ads-post-row skeleton">
      <div className="ads-post-row-body">
        <div className="ads-post-meta">
          <span className="skeleton-bar small" />
          <span className="skeleton-bar small" />
          <span className="skeleton-bar small" />
        </div>
        <div className="ads-post-text">
          <span className="skeleton-bar" />
        </div>
      </div>
      <div className="ads-btn primary disabled" aria-hidden>
        Sélectionner
      </div>
    </div>
  );
}

function ObjectiveCard({ option, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`ads-objective-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(option.value)}
    >
      <div className="ads-objective-icon" aria-hidden>
        {option.icon}
      </div>
      <div className="ads-objective-content">
        <div className="ads-objective-title">{option.title}</div>
        <div className="ads-objective-desc">{option.description}</div>
      </div>
      <div className="ads-objective-radio" aria-hidden>
        <div className="radio-circle" />
      </div>
    </button>
  );
}

const OBJECTIVE_OPTIONS = [
  {
    value: "views",
    title: "Obtenir plus de vues",
    description: "Mettre en avant votre publication auprès d'un maximum de personnes.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    value: "messages",
    title: "Recevoir plus de messages",
    description: "Encourager les utilisateurs à vous écrire directement.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
    ),
  },
  {
    value: "link",
    title: "Promouvoir un lien",
    description: "Générer du trafic vers votre site ou landing page.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 13a5 5 0 0 0 7.54.54l1.66-1.68a5 5 0 0 0-7.07-7.07l-1.41 1.41" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-1.66 1.68a5 5 0 0 0 7.07 7.07l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: "followers",
    title: "Gagner des abonnés",
    description: "Attirer plus d'abonnés sur votre page ou profil.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="7" r="4" />
        <path d="M17 11v6" />
        <path d="m15 13 2-2 2 2" />
        <path d="M16 21H2v-2a6 6 0 0 1 6-6h1" />
      </svg>
    ),
  },
];

export default function AdsCreate() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("existing");
  const [currentStep, setCurrentStep] = useState(1);
  const [userPosts, setUserPosts] = useState([]);
  const [pagePosts, setPagePosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState({
    country: "",
    city: "",
    district: "",
    ageMin: "",
    ageMax: "",
    category: "",
  });
  const [budget, setBudget] = useState({
    budgetTotal: null,
    budgetDaily: null,
    startDate: "",
    endDate: "",
  });
  const [launching, setLaunching] = useState(false);
  const [launchToast, setLaunchToast] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [newText, setNewText] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newMedia, setNewMedia] = useState([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = useMemo(() => decodeUserId(token), [token]);

  useEffect(() => {
    const storedDraftRaw = typeof window !== "undefined" ? localStorage.getItem("adsDraftV1") : null;
    if (storedDraftRaw) {
      try {
        const storedDraft = JSON.parse(storedDraftRaw);
        if (storedDraft?.mode === "existing" || storedDraft?.mode === "new") {
          setActiveTab(storedDraft.mode);
        }

        if (storedDraft?.postId) {
          setSavedPostId(storedDraft.postId);
        }

        if (typeof storedDraft?.text === "string") {
          setNewText(storedDraft.text);
        }

        if (typeof storedDraft?.link === "string") {
          setNewLink(storedDraft.link);
        }

        if (typeof storedDraft?.objective === "string") {
          setObjective(storedDraft.objective);
        }

        if (storedDraft?.audience) {
          setAudience({
            country: storedDraft.audience.country || "",
            city: storedDraft.audience.city || "",
            district: storedDraft.audience.district || "",
            ageMin:
              typeof storedDraft.audience.ageMin === "number" && !Number.isNaN(storedDraft.audience.ageMin)
                ? String(storedDraft.audience.ageMin)
                : "",
            ageMax:
              typeof storedDraft.audience.ageMax === "number" && !Number.isNaN(storedDraft.audience.ageMax)
                ? String(storedDraft.audience.ageMax)
                : "",
            category: storedDraft.audience.category || "",
          });
        }

        if (storedDraft?.budget) {
          const storedBudgetTotalRaw =
            typeof storedDraft.budget.total === "number" ? storedDraft.budget.total : storedDraft.budget.budgetTotal;
          const storedBudgetDailyRaw =
            typeof storedDraft.budget.daily === "number" ? storedDraft.budget.daily : storedDraft.budget.budgetDaily;

          const storedBudgetTotal =
            typeof storedBudgetTotalRaw === "number" && !Number.isNaN(storedBudgetTotalRaw)
              ? storedBudgetTotalRaw
              : null;
          const storedBudgetDaily =
            typeof storedBudgetDailyRaw === "number" && !Number.isNaN(storedBudgetDailyRaw)
              ? storedBudgetDailyRaw
              : null;

          setBudget({
            budgetTotal: storedBudgetTotal,
            budgetDaily: storedBudgetDaily,
            startDate: storedDraft.budget.startDate || "",
            endDate: storedDraft.budget.endDate || "",
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.debug("ADS draft parse error", err);
      }
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      if (!token || !userId) {
        setError("Connexion requise pour charger vos publications.");
        setLoadingPosts(false);
        return;
      }

      setError("");
      setLoadingPosts(true);

      try {
        const postsEndpoint = `${API_URL}/posts/user/${userId}?includeAds=1`;
        const [userRes, pages] = await Promise.all([
          fetch(postsEndpoint, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          getMyPages(),
        ]);

        const postsData = await userRes.json();

        if (!userRes.ok) {
          const friendlyMessage =
            userRes.status === 401 || userRes.status === 403
              ? "Session expirée, reconnecte-toi"
              : userRes.status >= 500
                ? "Serveur indisponible"
                : "Impossible de charger les publications.";

          if (import.meta.env.DEV) {
            console.debug("ADS posts fetch error", userRes.status, postsEndpoint);
          }

          setError(friendlyMessage);
          setUserPosts([]);
          setPagePosts([]);
          return;
        }

        if (Array.isArray(postsData)) setUserPosts(postsData);

        const managedPages = Array.isArray(pages) ? pages : [];
        const pagesWithPosts = await Promise.all(
          managedPages.map(async (page) => {
            try {
              const res = await getPagePosts(page.slug, 1, POSTS_PER_PAGE);
              return { page, posts: Array.isArray(res.posts) ? res.posts : [] };
            } catch (err) {
              return { page, posts: [] };
            }
          })
        );

        setPagePosts(pagesWithPosts.filter((p) => p.posts.length > 0));
      } catch (err) {
        setError("Impossible de charger les publications.");
        if (import.meta.env.DEV) console.debug("ADS posts fetch exception", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [token, userId]);

  useEffect(() => {
    if (!savedPostId) return;
    const fromPages = pagePosts.flatMap((p) => p.posts || []);
    const allPosts = [...userPosts, ...fromPages];
    const found = allPosts.find((p) => p?._id === savedPostId);
    if (found) setSelectedPost(found);
  }, [pagePosts, savedPostId, userPosts]);

  useEffect(() => () => newMedia.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)), [newMedia]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const withPreview = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewMedia(withPreview);
  };

  const paginatedUserPosts = userPosts.slice(0, POSTS_PER_PAGE);
  const canProceedToStep2 =
    activeTab === "existing"
      ? Boolean(selectedPost)
      : Boolean(newText.trim() || newLink.trim() || newMedia.length > 0);
  const canProceedToStep3 = Boolean(objective);
  const ageMinNumber = audience.ageMin ? Number(audience.ageMin) : null;
  const ageMaxNumber = audience.ageMax ? Number(audience.ageMax) : null;
  const ageError = (() => {
    if (ageMinNumber !== null && ageMinNumber < AGE_MIN_LIMIT) return `Âge minimum ${AGE_MIN_LIMIT} ans minimum`;
    if (ageMaxNumber !== null && ageMaxNumber > AGE_MAX_LIMIT) return `Âge maximum ${AGE_MAX_LIMIT} ans`;
    if (ageMinNumber !== null && ageMaxNumber !== null && ageMinNumber > ageMaxNumber)
      return "L'âge minimum doit être inférieur ou égal à l'âge maximum";
    return "";
  })();
  const canContinueToStep4 = Boolean(audience.country.trim()) && !ageError;
  const audienceSummaryText = getAudienceSummaryText();

  const normalizeBudgetNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const cleaned = String(value)
      .replace(/\s+/g, "")
      .replace(/(fcfa|frs)/gi, "")
      .replace(/,/g, ".");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleBudgetNumberChange = (field, value) => {
    const normalized = normalizeBudgetNumber(value);
    setBudget((prev) => ({
      ...prev,
      [field]: normalized,
    }));
  };

  const budgetTotalNumber =
    typeof budget.budgetTotal === "number" && !Number.isNaN(budget.budgetTotal)
      ? budget.budgetTotal
      : normalizeBudgetNumber(budget.budgetTotal);
  const budgetDailyNumber =
    typeof budget.budgetDaily === "number" && !Number.isNaN(budget.budgetDaily)
      ? budget.budgetDaily
      : normalizeBudgetNumber(budget.budgetDaily);

  const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const startDateObj = normalizeDate(budget.startDate);
  const endDateObj = normalizeDate(budget.endDate);

  const budgetTotalError = (() => {
    if (budgetTotalNumber === null) return "Budget total requis";
    if (budgetTotalNumber < 1) return "Budget total minimal: 1";
    return "";
  })();
  const budgetDailyError = (() => {
    if (budgetDailyNumber !== null && budgetDailyNumber < 1) return "Budget quotidien minimal: 1";
    if (budgetDailyNumber !== null && budgetTotalNumber !== null && budgetDailyNumber > budgetTotalNumber)
      return "Le budget quotidien ne peut pas dépasser le budget total";
    return "";
  })();

  const startDateError = (() => {
    if (!budget.startDate) return "Date de début requise";
    if (!startDateObj) return "Date de début invalide";
    if (startDateObj < today) return "La date de début doit être aujourd'hui ou plus tard";
    return "";
  })();

  const endDateError = (() => {
    if (!budget.endDate) return "Date de fin requise";
    if (!endDateObj) return "Date de fin invalide";
    if (startDateObj && endDateObj < startDateObj) return "La date de fin doit être postérieure au début";
    return "";
  })();

  const durationDays = (() => {
    if (!startDateObj || !endDateObj) return 0;
    const diff = endDateObj.getTime() - startDateObj.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  })();

  const computedBudgetPerDay = (() => {
    if (budgetDailyNumber !== null && !budgetDailyError) return budgetDailyNumber;
    if (budgetTotalNumber !== null && durationDays > 0) return Math.max(1, Math.ceil(budgetTotalNumber / durationDays));
    return null;
  })();

  const budgetStepValid =
    budgetTotalNumber !== null &&
    budgetTotalNumber >= 1 &&
    durationDays > 0 &&
    !budgetTotalError &&
    !budgetDailyError &&
    !startDateError &&
    !endDateError &&
    Boolean(startDateObj) &&
    Boolean(endDateObj);

  const normalizeAudience = () => ({
    country: audience.country.trim(),
    city: audience.city.trim(),
    district: audience.district.trim(),
    ageMin: ageMinNumber !== null ? ageMinNumber : null,
    ageMax: ageMaxNumber !== null ? ageMaxNumber : null,
    category: audience.category ? audience.category : null,
  });

  const normalizeBudget = () => ({
    total: budgetTotalNumber !== null ? budgetTotalNumber : null,
    daily: budgetDailyNumber !== null ? budgetDailyNumber : null,
    startDate: budget.startDate || null,
    endDate: budget.endDate || null,
    durationDays: durationDays || null,
    budgetTotal: budgetTotalNumber !== null ? budgetTotalNumber : null,
    budgetDaily: budgetDailyNumber !== null ? budgetDailyNumber : null,
  });

  const persistDraft = (updater) => {
    if (typeof window === "undefined") return;
    try {
      const storedRaw = localStorage.getItem("adsDraftV1");
      const storedDraft = storedRaw ? JSON.parse(storedRaw) : {};
      const updatedDraft = typeof updater === "function" ? updater(storedDraft) : { ...storedDraft, ...updater };
      updatedDraft.savedAt = new Date().toISOString();
      localStorage.setItem("adsDraftV1", JSON.stringify(updatedDraft));
    } catch (err) {
      if (import.meta.env.DEV) console.debug("ADS draft persist error", err);
    }
  };

  const buildDraftPayload = () => {
    const baseDraft = {
      mode: activeTab,
      objective: objective || undefined,
      savedAt: new Date().toISOString(),
      audience: normalizeAudience(),
      budget: normalizeBudget(),
    };

    return activeTab === "existing"
      ? {
          ...baseDraft,
          postId: selectedPost?._id || savedPostId || null,
          source: selectedPost?.page ? "page" : "profil",
        }
      : {
          ...baseDraft,
          text: newText,
          link: newLink,
          media: newMedia.map((m) => ({
            name: m.file?.name,
            size: m.file?.size,
            type: m.file?.type,
          })),
        };
  };

  const handleContinueToStep2 = () => {
    if (!canProceedToStep2) return;
    setCurrentStep(2);
  };

  const handleContinueToStep3 = () => {
    if (!canProceedToStep3) return;
    persistDraft(buildDraftPayload());
    setCurrentStep(3);
  };

  const handleContinueToStep4 = () => {
    if (!canContinueToStep4) return;
    persistDraft(buildDraftPayload());
    setCurrentStep(4);
  };

  const handleBackToStep1 = () => setCurrentStep(1);
  const handleBackToStep2 = () => setCurrentStep(2);

  const saveDraft = () => {
    persistDraft(buildDraftPayload());
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  useEffect(() => {
    if (!draftLoaded) return;
    const timeout = setTimeout(() => {
      persistDraft((draft) => ({
        ...draft,
        ...buildDraftPayload(),
      }));
    }, 250);

    return () => clearTimeout(timeout);
  }, [audience, draftLoaded]);

  useEffect(() => {
    if (!draftLoaded) return;
    const timeout = setTimeout(() => {
      persistDraft((draft) => ({
        ...draft,
        ...buildDraftPayload(),
      }));
    }, 300);

    return () => clearTimeout(timeout);
  }, [budget, budgetTotalNumber, budgetDailyNumber, durationDays, startDateObj, endDateObj, draftLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    loadLocalCampaigns();
    return undefined;
  }, []);

  function getAudienceSummaryText() {
    const parts = [];
    if (audience.country) parts.push(audience.country);
    if (audience.city) parts.push(audience.city);
    if (audience.district) parts.push(audience.district);

    const agePart =
      ageMinNumber !== null && ageMaxNumber !== null
        ? `${ageMinNumber}-${ageMaxNumber}`
        : ageMinNumber !== null
          ? `${ageMinNumber}+`
          : ageMaxNumber !== null
            ? `≤${ageMaxNumber}`
            : "";
    if (agePart) parts.push(agePart);

    const categoryPart = audience.category && audience.category !== "Tout" ? `Catégorie: ${audience.category}` : "";
    if (categoryPart) parts.push(categoryPart);

    if (parts.length === 0) return "";
    return parts.join(", ");
  }

  const renderAudienceSummary = () => {
    const summary = getAudienceSummaryText();
    if (!summary) return null;
    return <div className="ads-audience-summary">Audience: {summary}</div>;
  };

  const handleLaunchCampaign = async () => {
    const finalAudience = normalizeAudience();
    const validationErrors = [];
    if (!objective) validationErrors.push("Choisissez un objectif.");
    if (!finalAudience.country) validationErrors.push("Pays requis pour l'audience.");
    if (!budgetStepValid) validationErrors.push("Complétez le budget et les dates.");
    if (durationDays <= 0) validationErrors.push("La durée doit être d'au moins un jour.");

    if (validationErrors.length > 0) {
      setLaunchToast(validationErrors[0]);
      setTimeout(() => setLaunchToast(""), 3000);
      return;
    }

    setLaunching(true);
    setLaunchToast("");

    const now = new Date();
    const isProd = import.meta.env.PROD;
    const minDelay = isProd ? 5 * 60 * 1000 : 10 * 1000;
    const maxDelay = isProd ? 10 * 60 * 1000 : 20 * 1000;
    const reviewDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    const analysisText = isProd ? "5-10 minutes" : "10-20 secondes";
    const reviewEndsAt = now.getTime() + reviewDelay;

    const creative =
      activeTab === "existing"
        ? {
            text: selectedPost?.text || "",
            link: selectedPost?.link || "",
            media: Array.isArray(selectedPost?.media)
              ? selectedPost.media.map((m) => ({ url: m.url, type: m.type }))
              : [],
          }
        : {
            text: newText,
            link: newLink,
            media: [],
          };

    const budgetPayload = normalizeBudget();
    const tempId = `${Date.now()}-${Math.floor(Math.random() * 99999)}`;

    const baseCampaign = {
      id: tempId,
      _id: tempId,
      ownerId: userId || null,
      postId: selectedPost?._id || savedPostId || null,
      creative,
      objective,
      audience: finalAudience,
      budget: budgetPayload,
      budgetTotal: budgetPayload.total,
      budgetDaily: budgetPayload.daily,
      startDate: budgetPayload.startDate,
      endDate: budgetPayload.endDate,
      durationDays: budgetPayload.durationDays,
      status: "review",
      createdAt: now.toISOString(),
      review: {
        startedAt: now.toISOString(),
        endsAt: new Date(reviewEndsAt).toISOString(),
      },
      payment: {
        amount: budgetPayload.total || 0,
        currency: "FCFA",
        status: "pending",
        link: buildPaymentLink(tempId),
        emailSentAt: null,
      },
      analysisEndsAt: reviewEndsAt,
      source: activeTab,
    };

    upsertLocalCampaign(baseCampaign);
    setLaunchToast(`Publicité en cours d'analyse (${analysisText})`);
    setTimeout(() => setLaunchToast(""), 4000);

    const finalizeAwaitingPayment = async (campaignId, backendId = null) => {
      const finalId = backendId || campaignId;
      const updatedCampaign = {
        ...baseCampaign,
        id: finalId,
        _id: finalId,
        status: "awaiting_payment",
        review: {
          ...baseCampaign.review,
          endsAt: baseCampaign.review.endsAt || new Date().toISOString(),
        },
        payment: {
          ...baseCampaign.payment,
          link: buildPaymentLink(finalId),
        },
        analysisFinishedAt: new Date().toISOString(),
      };

      upsertLocalCampaign(updatedCampaign);

      if (backendId && token) {
        try {
          const syncResponse = await fetch(`${API_URL}/ads/${backendId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: "awaiting_payment",
              review: updatedCampaign.review,
              payment: {
                amount: updatedCampaign.payment.amount,
                currency: updatedCampaign.payment.currency,
              },
            }),
          });

          if (!syncResponse.ok) {
            throw new Error(`Sync failed with status ${syncResponse.status}`);
          }
        } catch (err) {
          console.error("Failed to sync awaiting_payment", err);
          setLaunchToast("Synchronisation paiement impossible. Merci de réessayer.");
          setTimeout(() => setLaunchToast(""), 5000);
        }
      }

      setLaunchToast("Analyse terminée — Paiement requis");
      setTimeout(() => setLaunchToast(""), 5000);
    };

    const scheduleFinalization = (campaignId, backendId = null) => {
      setTimeout(() => finalizeAwaitingPayment(campaignId, backendId), reviewDelay);
    };

    if (selectedPost?._id && token) {
      try {
        const res = await fetch(`${API_URL}/ads/create/${selectedPost._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            budgetTotal: budgetPayload.total,
            budgetDaily: budgetPayload.daily,
            startDate: budgetPayload.startDate,
            endDate: budgetPayload.endDate,
            audience: finalAudience,
            objective,
            creative,
            review: baseCampaign.review,
            payment: baseCampaign.payment,
          }),
        });

        if (!res.ok) {
          scheduleFinalization(baseCampaign.id);
        } else {
          const data = await res.json().catch(() => ({}));
          const returnedId = data?.data?._id || data?._id || null;
          if (returnedId) {
            const backendCampaign = {
              ...baseCampaign,
              id: returnedId,
              _id: returnedId,
              payment: { ...baseCampaign.payment, link: buildPaymentLink(returnedId) },
            };
            upsertLocalCampaign(backendCampaign);
            scheduleFinalization(returnedId, returnedId);
          } else {
            scheduleFinalization(baseCampaign.id);
          }
        }
      } catch (err) {
        scheduleFinalization(baseCampaign.id);
      } finally {
        setLaunching(false);
      }
    } else {
      scheduleFinalization(baseCampaign.id);
      setLaunching(false);
    }
  };

  return (
    <div className="ads-shell">
      <div className="ads-header">
        <div>
          <div className="ads-title">Créer une publicité</div>
          <div className="ads-subtitle">
            {currentStep === 1 && "Étape 1 · Création ou sélection de la publication."}
            {currentStep === 2 && "Étape 2 · Choix de l'objectif de la campagne."}
            {currentStep === 3 && "Étape 3 · Audience et ciblage."}
            {currentStep === 4 && "Étape 4 · Budget & durée."}
          </div>
        </div>
        <div className="ads-meta-row">
          <button className="ads-btn" onClick={() => nav(-1)}>
            Retour
          </button>
        </div>
      </div>

      <div className="ads-stepper">
        <div className={`ads-step ${currentStep === 1 ? "active" : ""}`}>1. Publication</div>
        <div
          className={`ads-step ${currentStep === 2 ? "active" : canProceedToStep2 ? "" : "disabled"}`}
        >
          2. Objectif
        </div>
        <div className={`ads-step ${currentStep === 3 ? "active" : canProceedToStep3 ? "" : "disabled"}`}>
          3. Audience
        </div>
        <div className={`ads-step ${currentStep === 4 ? "active" : "disabled"}`}>4. Budget & durée</div>
      </div>

      {currentStep === 1 && (
        <>
          <div className="ads-tabs">
            <button
              type="button"
              className={`ads-tab ${activeTab === "existing" ? "active" : ""}`}
              onClick={() => setActiveTab("existing")}
            >
              Utiliser une publication existante
            </button>
            <button
              type="button"
              className={`ads-tab ${activeTab === "new" ? "active" : ""}`}
              onClick={() => setActiveTab("new")}
            >
              Créer une nouvelle publication
            </button>
          </div>

          {error && <div className="ads-error">{error}</div>}

          {activeTab === "existing" ? (
            <div className="ads-wizard-grid">
              <div className="ads-panel">
                <div className="ads-panel-head">
                  <div>
                    <div className="ads-panel-title">Vos publications</div>
                    <div className="ads-subtitle">Sélectionnez un post récent à sponsoriser.</div>
                  </div>
                  <span className="ads-count-pill">{userPosts.length}</span>
                </div>

                {loadingPosts && (
                  <div className="ads-skeleton-list">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <PostRowSkeleton key={idx} />
                    ))}
                  </div>
                )}

                {!loadingPosts && paginatedUserPosts.length === 0 && (
                  <div className="ads-empty">Aucune publication personnelle trouvée.</div>
                )}

                {!loadingPosts &&
                  paginatedUserPosts.map((post) => (
                    <PostRow
                      key={post._id}
                      post={post}
                      sourceLabel="Profil"
                      onSelect={(p) => setSelectedPost({ ...p, source: "profil" })}
                      isSelected={selectedPost?._id === post._id}
                    />
                  ))}

                {pagePosts.length > 0 && (
                  <div className="ads-panel-title" style={{ marginTop: 16 }}>
                    Publications de vos pages
                  </div>
                )}

                {pagePosts.map(({ page, posts }) => (
                  <div key={page._id} className="ads-page-block">
                    <div className="ads-subtitle">{page.name}</div>
                    {posts.map((post) => (
                      <PostRow
                        key={post._id}
                        post={post}
                        sourceLabel={page.name}
                        onSelect={(p) => setSelectedPost({ ...p, source: page.name })}
                        isSelected={selectedPost?._id === post._id}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="ads-panel">
                <div className="ads-panel-head">
                  <div className="ads-panel-title">Aperçu</div>
                  {selectedPost && <span className="ads-status-badge">Sponsorisé</span>}
                </div>
                {!selectedPost && (
                  <div className="ads-empty">Choisissez une publication pour voir l'aperçu.</div>
                )}

                {selectedPost && (
                  <div className="ads-preview-card">
                    <div className="ads-preview-header">
                      <div className="ads-avatar" />
                      <div>
                        <div className="ads-preview-author">
                          {selectedPost.page?.name || selectedPost.user?.name || "Profil"}
                        </div>
                        <div className="ads-subtitle">Sponsorisé</div>
                      </div>
                    </div>
                  <div className="ads-preview-text">{selectedPost.text}</div>
                  {selectedPost.media?.[0]?.url && (
                    <div
                      className="ads-preview-media"
                      style={{ backgroundImage: `url(${getImageUrl(selectedPost.media[0].url)})` }}
                    />
                  )}
                  {selectedPost.link && (
                    <a className="ads-preview-link" href={selectedPost.link} target="_blank" rel="noreferrer">
                      {selectedPost.link}
                    </a>
                  )}
                  {renderAudienceSummary()}
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="ads-wizard-grid">
              <div className="ads-panel">
                <div className="ads-panel-head">
                  <div className="ads-panel-title">Composer la publication</div>
                  <span className="ads-count-pill">Brouillon</span>
                </div>

                <label className="ads-label">Texte</label>
                <textarea
                  className="ads-textarea"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Rédigez le message de votre publicité"
                  rows={4}
                />

                <label className="ads-label">Lien (optionnel)</label>
                <input
                  className="ads-input"
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://exemple.com"
                />

                <label className="ads-label">Média</label>
                <input className="ads-input" type="file" accept="image/*,video/*" onChange={handleFileChange} multiple />
                {newMedia.length > 0 && (
                  <div className="ads-media-grid">
                    {newMedia.map((m, idx) => (
                      <div key={idx} className="ads-media-thumb" style={{ backgroundImage: `url(${m.preview})` }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="ads-panel">
                <div className="ads-panel-head">
                  <div className="ads-panel-title">Aperçu</div>
                  <span className="ads-status-badge">Brouillon</span>
                </div>
                <div className="ads-preview-card">
                  <div className="ads-preview-header">
                    <div className="ads-avatar" />
                    <div>
                      <div className="ads-preview-author">Vous</div>
                      <div className="ads-subtitle">Sponsorisé</div>
                    </div>
                  </div>
                  <div className="ads-preview-text">{newText || "Texte de votre publicité"}</div>
                {newMedia[0]?.preview && (
                  <div
                    className="ads-preview-media"
                    style={{ backgroundImage: `url(${newMedia[0].preview})` }}
                  />
                )}
                {newLink && (
                  <a className="ads-preview-link" href={newLink} target="_blank" rel="noreferrer">
                    {newLink}
                  </a>
                )}
                {renderAudienceSummary()}
              </div>
            </div>
          </div>
          )}

          <div className="ads-footer">
            <button className="ads-btn" type="button" onClick={saveDraft}>
              Enregistrer le brouillon
            </button>
            <button className="ads-btn primary" type="button" disabled={!canProceedToStep2} onClick={handleContinueToStep2}>
              Continuer
            </button>
            {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div>
                <div className="ads-panel-title">Objectif de la campagne</div>
                <div className="ads-subtitle">Choisissez un seul objectif à la fois.</div>
              </div>
            </div>

            <div className="ads-objectives-grid">
              {OBJECTIVE_OPTIONS.map((option) => (
                <ObjectiveCard
                  key={option.value}
                  option={option}
                  isSelected={objective === option.value}
                  onSelect={(value) => setObjective(value)}
                />
              ))}
            </div>
          </div>

          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Aperçu</div>
              <span className="ads-status-badge">Brouillon</span>
            </div>
            <div className="ads-preview-card">
              <div className="ads-preview-header">
                <div className="ads-avatar" />
                <div>
                  <div className="ads-preview-author">
                    {selectedPost?.page?.name || selectedPost?.user?.name || "Votre publication"}
                  </div>
                  <div className="ads-subtitle">Sponsorisé</div>
                </div>
              </div>
              <div className="ads-preview-text">
                {selectedPost?.text || newText || "Texte de votre publicité"}
              </div>
              {(selectedPost?.media?.[0]?.url || newMedia[0]?.preview) && (
                <div
                  className="ads-preview-media"
                  style={{
                    backgroundImage: `url(${selectedPost?.media?.[0]?.url
                      ? getImageUrl(selectedPost.media[0].url)
                      : newMedia[0]?.preview || ""})`,
                  }}
                />
              )}
              {(selectedPost?.link || newLink) && (
                <a
                  className="ads-preview-link"
                  href={selectedPost?.link || newLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedPost?.link || newLink}
                </a>
              )}

              <div className="ads-objective-summary">
                Objectif :
                <strong>
                  {objective
                    ? OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.title || "—"
                    : "À choisir"}
                </strong>
              </div>
              {renderAudienceSummary()}
            </div>
          </div>

          <div className="ads-footer">
            <button className="ads-btn" type="button" onClick={handleBackToStep1}>
              Retour
            </button>
            <button className="ads-btn primary" type="button" onClick={handleContinueToStep3} disabled={!objective}>
              Continuer
            </button>
            {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div>
                <div className="ads-panel-title">Audience</div>
                <div className="ads-subtitle">Définissez qui verra votre publicité.</div>
              </div>
            </div>

            <div className="ads-audience-grid">
              <div className="ads-field">
                <label className="ads-label" htmlFor="audience-country">
                  Pays <span className="ads-required">*</span>
                </label>
                <input
                  id="audience-country"
                  className="ads-input"
                  type="text"
                  list="ads-country-suggestions"
                  placeholder="Ex: Côte d'Ivoire"
                  value={audience.country}
                  onChange={(e) => setAudience((prev) => ({ ...prev, country: e.target.value }))}
                  required
                />
                <datalist id="ads-country-suggestions">
                  {COUNTRY_SUGGESTIONS.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="audience-city">
                  Commune
                </label>
                <input
                  id="audience-city"
                  className="ads-input"
                  type="text"
                  placeholder="Ex: Abidjan"
                  value={audience.city}
                  onChange={(e) => setAudience((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="audience-district">
                  Quartier
                </label>
                <input
                  id="audience-district"
                  className="ads-input"
                  type="text"
                  placeholder="Ex: Cocody"
                  value={audience.district}
                  onChange={(e) => setAudience((prev) => ({ ...prev, district: e.target.value }))}
                />
              </div>

              <div className="ads-field">
                <label className="ads-label">Âge</label>
                <div className="ads-field-row">
                  <input
                    className="ads-input"
                    type="number"
                    min={AGE_MIN_LIMIT}
                    max={AGE_MAX_LIMIT}
                    placeholder="Min"
                    value={audience.ageMin}
                    onChange={(e) => setAudience((prev) => ({ ...prev, ageMin: e.target.value }))}
                  />
                  <span className="ads-separator">—</span>
                  <input
                    className="ads-input"
                    type="number"
                    min={AGE_MIN_LIMIT}
                    max={AGE_MAX_LIMIT}
                    placeholder="Max"
                    value={audience.ageMax}
                    onChange={(e) => setAudience((prev) => ({ ...prev, ageMax: e.target.value }))}
                  />
                </div>
                <div className="ads-subtext">Laisser vide si vous ne souhaitez pas filtrer l'âge.</div>
                {ageError && <div className="ads-error small">{ageError}</div>}
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="audience-category">
                  Catégorie
                </label>
                <select
                  id="audience-category"
                  className="ads-input"
                  value={audience.category}
                  onChange={(e) => setAudience((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Sélectionner</option>
                  {AUDIENCE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Aperçu</div>
              <span className="ads-status-badge">Brouillon</span>
            </div>
            <div className="ads-preview-card">
              <div className="ads-preview-header">
                <div className="ads-avatar" />
                <div>
                  <div className="ads-preview-author">
                    {selectedPost?.page?.name || selectedPost?.user?.name || "Votre publication"}
                  </div>
                  <div className="ads-subtitle">Sponsorisé</div>
                </div>
              </div>
              <div className="ads-preview-text">
                {selectedPost?.text || newText || "Texte de votre publicité"}
              </div>
              {(selectedPost?.media?.[0]?.url || newMedia[0]?.preview) && (
                <div
                  className="ads-preview-media"
                  style={{
                    backgroundImage: `url(${selectedPost?.media?.[0]?.url
                      ? getImageUrl(selectedPost.media[0].url)
                      : newMedia[0]?.preview || ""})`,
                  }}
                />
              )}
              {(selectedPost?.link || newLink) && (
                <a
                  className="ads-preview-link"
                  href={selectedPost?.link || newLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedPost?.link || newLink}
                </a>
              )}

              <div className="ads-objective-summary">
                Audience : <strong>{audienceSummaryText || "À compléter"}</strong>
              </div>
            </div>
          </div>

          <div className="ads-footer">
            <button className="ads-btn" type="button" onClick={handleBackToStep2}>
              Retour
            </button>
            <button className="ads-btn primary" type="button" onClick={handleContinueToStep4} disabled={!canContinueToStep4}>
              Continuer
            </button>
            {!canContinueToStep4 && <span className="ads-subtext">Renseignez au moins le pays.</span>}
            {draftSaved && <span className="ads-success">Brouillon enregistré</span>}
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="ads-wizard-grid">
          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Budget & durée</div>
              <span className="ads-status-badge">Étape finale</span>
            </div>

            <div className="ads-budget-grid">
              <div className="ads-field">
                <label className="ads-label" htmlFor="budget-total">
                  Budget total (FCFA) <span className="ads-required">*</span>
                </label>
                <input
                  id="budget-total"
                  className="ads-input"
                  type="number"
                  min={1}
                  value={budget.budgetTotal ?? ""}
                  onChange={(e) => handleBudgetNumberChange("budgetTotal", e.target.value)}
                  required
                />
                {budgetTotalError && <div className="ads-error small">{budgetTotalError}</div>}
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="budget-daily">Budget quotidien (FCFA)</label>
                <input
                  id="budget-daily"
                  className="ads-input"
                  type="number"
                  min={1}
                  value={budget.budgetDaily ?? ""}
                  onChange={(e) => handleBudgetNumberChange("budgetDaily", e.target.value)}
                />
                {budgetDailyError && <div className="ads-error small">{budgetDailyError}</div>}
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="start-date">
                  Date de début <span className="ads-required">*</span>
                </label>
                <input
                  id="start-date"
                  className="ads-input"
                  type="date"
                  value={budget.startDate}
                  onChange={(e) => setBudget((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
                {startDateError && <div className="ads-error small">{startDateError}</div>}
              </div>

              <div className="ads-field">
                <label className="ads-label" htmlFor="end-date">
                  Date de fin <span className="ads-required">*</span>
                </label>
                <input
                  id="end-date"
                  className="ads-input"
                  type="date"
                  value={budget.endDate}
                  onChange={(e) => setBudget((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
                {endDateError && <div className="ads-error small">{endDateError}</div>}
              </div>
            </div>

            <div className="ads-budget-summary">
              <div className="ads-budget-row">
                <div>
                  <div className="ads-panel-title">Récapitulatif</div>
                  <div className="ads-subtext">Inspiré de Facebook Ads</div>
                </div>
                <span className="ads-status-badge">{budgetStepValid ? "Prêt" : "À compléter"}</span>
              </div>
              <div className="ads-budget-stats">
                <div>
                  <div className="ads-subtext">Durée</div>
                  <div className="ads-budget-strong">{durationDays || "—"} jour(s)</div>
                </div>
                <div>
                  <div className="ads-subtext">Budget total</div>
                  <div className="ads-budget-strong">{budgetTotalNumber || 0} FCFA</div>
                </div>
                <div>
                  <div className="ads-subtext">Budget/jour</div>
                  <div className="ads-budget-strong">
                    {computedBudgetPerDay ? `${computedBudgetPerDay} FCFA` : "À calculer"}
                  </div>
                </div>
              </div>
              <div className="ads-subtext">{renderAudienceSummary()}</div>
            </div>
          </div>

          <div className="ads-panel">
            <div className="ads-panel-head">
              <div className="ads-panel-title">Aperçu final</div>
              <span className="ads-status-badge">Brouillon</span>
            </div>
            <div className="ads-preview-card">
              <div className="ads-preview-header">
                <div className="ads-avatar" />
                <div>
                  <div className="ads-preview-author">
                    {selectedPost?.page?.name || selectedPost?.user?.name || "Votre publication"}
                  </div>
                  <div className="ads-subtitle">Sponsorisé</div>
                </div>
              </div>
              <div className="ads-preview-text">
                {selectedPost?.text || newText || "Texte de votre publicité"}
              </div>
              {(selectedPost?.media?.[0]?.url || newMedia[0]?.preview) && (
                <div
                  className="ads-preview-media"
                  style={{
                    backgroundImage: `url(${selectedPost?.media?.[0]?.url
                      ? getImageUrl(selectedPost.media[0].url)
                      : newMedia[0]?.preview || ""})`,
                  }}
                />
              )}
              {(selectedPost?.link || newLink) && (
                <a className="ads-preview-link" href={selectedPost?.link || newLink} target="_blank" rel="noreferrer">
                  {selectedPost?.link || newLink}
                </a>
              )}

              <div className="ads-objective-summary">
                Budget : <strong>{budgetTotalNumber ? `${budgetTotalNumber} FCFA` : "À définir"}</strong>
              </div>
              <div className="ads-objective-summary">
                Période :
                <strong>
                  {budget.startDate && budget.endDate
                    ? `${new Date(budget.startDate).toLocaleDateString()} → ${new Date(budget.endDate).toLocaleDateString()}`
                    : "À renseigner"}
                </strong>
              </div>
              {renderAudienceSummary()}
            </div>
          </div>

          <div className="ads-footer">
            <button className="ads-btn" type="button" onClick={handleBackToStep2}>
              Retour
            </button>
            <button
              className="ads-btn primary"
              type="button"
              onClick={handleLaunchCampaign}
              disabled={!budgetStepValid || launching}
            >
              {launching ? "Lancement..." : "Lancer la publicité"}
            </button>
            {!budgetStepValid && <span className="ads-subtext">Complétez les champs obligatoires.</span>}
            {launchToast && <span className="ads-success">{launchToast}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

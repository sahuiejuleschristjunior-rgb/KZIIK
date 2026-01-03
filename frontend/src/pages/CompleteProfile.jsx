import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/complete-profile.css";
import { API_URL } from "../api/config";

const getLocationParts = (location) => {
  if (!location) return { city: "", country: "" };
  const [city = "", country = ""] = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return { city, country };
};

export default function CompleteProfile() {
  const nav = useNavigate();
  const { user, token, updateUser, profileCompleted } = useAuth();

  const initialLocation = getLocationParts(user?.professionalProfile?.location);

  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    city: initialLocation.city,
    country: initialLocation.country,
    phone: user?.professionalProfile?.phone || "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(() => getImageUrl(user?.avatar));
  const [coverPreview, setCoverPreview] = useState(() => getImageUrl(user?.coverPhoto));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profileCompleted) {
      nav("/fb", { replace: true });
    }
  }, [profileCompleted, nav]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(getImageUrl(user?.avatar));
    }
  }, [avatarFile, user?.avatar]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(getImageUrl(user?.coverPhoto));
    }
  }, [coverFile, user?.coverPhoto]);

  useEffect(() => {
    if (!avatarFile) return;
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFile) return;
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

  useEffect(() => {
    if (!user) return;
    const location = getLocationParts(user?.professionalProfile?.location);
    setForm((prev) => ({
      ...prev,
      name: user?.name || "",
      bio: user?.bio || "",
      phone: user?.professionalProfile?.phone || "",
      city: prev.city || location.city,
      country: prev.country || location.country,
    }));
  }, [user]);

  const hasCustomAvatar = useMemo(() => {
    if (avatarFile) return true;
    if (!user?.avatar) return false;
    return !user.avatar.includes("default-avatar");
  }, [avatarFile, user?.avatar]);

  const hasCustomCover = useMemo(() => {
    if (coverFile) return true;
    if (!user?.coverPhoto) return false;
    return !user.coverPhoto.includes("default-cover");
  }, [coverFile, user?.coverPhoto]);

  const completionStats = useMemo(() => {
    const requiredFields = [
      hasCustomAvatar,
      hasCustomCover,
      Boolean(form.name.trim()),
      Boolean(form.bio.trim()),
      Boolean(form.city.trim()),
      Boolean(form.country.trim()),
    ];

    const completed = requiredFields.filter(Boolean).length;
    const total = requiredFields.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [form, hasCustomAvatar, hasCustomCover]);

  const isFormValid =
    hasCustomAvatar &&
    hasCustomCover &&
    Boolean(form.name.trim()) &&
    Boolean(form.bio.trim()) &&
    Boolean(form.city.trim()) &&
    Boolean(form.country.trim());

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
  };

  const uploadImage = async (file, endpoint, field) => {
    if (!file) return null;

    const body = new FormData();
    body.append(field, file);

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Impossible d'envoyer l'image.");
    }

    return data;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid || loading) return;

    setError("");
    setLoading(true);

    try {
      let updatedUser = user;

      if (avatarFile) {
        const avatarPayload = await uploadImage(
          avatarFile,
          "/auth/profile/avatar",
          "avatar"
        );
        updatedUser = { ...updatedUser, avatar: avatarPayload.avatar };
      }

      if (coverFile) {
        const coverPayload = await uploadImage(
          coverFile,
          "/auth/profile/cover",
          "cover"
        );
        updatedUser = { ...updatedUser, coverPhoto: coverPayload.coverPhoto };
      }

      const location = [form.city.trim(), form.country.trim()]
        .filter(Boolean)
        .join(", ");
      const phone = form.phone.trim();

      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
      };

      if (user?.role === "candidate") {
        payload.professionalProfile = {
          ...(user?.professionalProfile || {}),
          location,
          phone,
        };
      }

      if (user?.role === "recruiter") {
        payload.companyInfo = [location, phone].filter(Boolean).join(" • ");
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible de mettre à jour le profil.");
      }

      const nextUser = { ...updatedUser, ...(data.user || {}) };
      updateUser(nextUser);
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour du profil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="complete-profile">
      <div className="complete-profile__hero">
        <div>
          <h1>Complétez votre profil</h1>
          <p>
            Ajoutez vos informations essentielles pour accéder au fil d'actualité et
            profiter pleinement d'KZIIK.
          </p>
        </div>
        <div className="complete-profile__progress">
          <span>Progression</span>
          <strong>{completionStats.percent}%</strong>
          <div className="complete-profile__progress-bar">
            <div
              className="complete-profile__progress-fill"
              style={{ width: `${completionStats.percent}%` }}
            />
          </div>
          <small>
            {completionStats.completed}/{completionStats.total} étapes complétées
          </small>
        </div>
      </div>

      <form className="complete-profile__card" onSubmit={handleSubmit}>
        {error && <div className="complete-profile__error">{error}</div>}

        <div className="complete-profile__media">
          <div className="complete-profile__cover">
            {coverPreview ? (
              <img src={coverPreview} alt="Aperçu couverture" />
            ) : (
              <div className="complete-profile__cover-placeholder">
                Ajoutez une photo de couverture
              </div>
            )}
            <label className="complete-profile__upload">
              Photo de couverture
              <input type="file" accept="image/*" onChange={handleCoverChange} />
            </label>
          </div>

          <div className="complete-profile__avatar">
            <div className="complete-profile__avatar-frame">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Aperçu avatar" />
              ) : (
                <span>🙂</span>
              )}
            </div>
            <label className="complete-profile__upload">
              Photo de profil
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        <div className="complete-profile__fields">
          <label>
            Nom complet
            <input
              name="name"
              type="text"
              placeholder="Votre prénom et nom"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Bio / Description
            <textarea
              name="bio"
              placeholder="Quelques mots pour vous présenter"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              required
            />
          </label>

          <div className="complete-profile__grid">
            <label>
              Ville
              <input
                name="city"
                type="text"
                placeholder="Votre ville"
                value={form.city}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Pays
              <input
                name="country"
                type="text"
                placeholder="Votre pays"
                value={form.country}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label>
            Téléphone (optionnel)
            <input
              name="phone"
              type="tel"
              placeholder="+33 6 00 00 00 00"
              value={form.phone}
              onChange={handleChange}
            />
          </label>
        </div>

        <button
          className="complete-profile__submit"
          type="submit"
          disabled={!isFormValid || loading}
        >
          {loading ? "Enregistrement..." : "Continuer"}
        </button>
      </form>
    </div>
  );
}

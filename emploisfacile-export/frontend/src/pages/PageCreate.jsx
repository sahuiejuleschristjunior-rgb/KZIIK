import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPage,
  updatePage,
  uploadPageAvatar,
  uploadPageCover,
} from "../api/pagesApi";
import "../styles/page.css";
import { COUNTRY_CALLING_CODES, COUNTRY_LIST } from "../utils/countries";
import { PAGE_CATEGORY_GROUPS } from "../utils/pageCategories";
import { validatePageName } from "../utils/pageNameRules";

export default function PageCreate() {
  const [form, setForm] = useState({ name: "", categories: [], bio: "", contact: "" });
  const [locationForm, setLocationForm] = useState({ country: "", city: "", commune: "" });
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photoForm, setPhotoForm] = useState({ avatar: null, cover: null });
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdPageName, setCreatedPageName] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const nav = useNavigate();

  const countryCodeMap = useMemo(() => {
    const map = new Map();
    COUNTRY_CALLING_CODES.forEach(({ country, code }) => map.set(country, code));
    return map;
  }, []);

  useEffect(() => {
    if (!locationForm.country) return;
    const code = countryCodeMap.get(locationForm.country);
    setPhoneCode(code || "");
  }, [countryCodeMap, locationForm.country]);

  const allCategories = useMemo(
    () =>
      PAGE_CATEGORY_GROUPS.flatMap((group) =>
        group.options.map((option) => ({ option, group: group.label }))
      ),
    []
  );

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return allCategories;
    return allCategories.filter(
      (item) =>
        item.option.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query)
    );
  }, [allCategories, categoryQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleCategory = (category) => {
    setForm((prev) => {
      const alreadySelected = prev.categories.includes(category);
      if (alreadySelected) {
        setError("");
        return { ...prev, categories: prev.categories.filter((c) => c !== category) };
      }

      if (prev.categories.length >= 3) {
        setError("Maximum 3 catégories");
        return prev;
      }

      setError("");
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const nameValidation = validatePageName(form.name);
    if (!nameValidation.valid) {
      setError(nameValidation.error);
      return;
    }
    if (!form.categories.length) {
      setError("Sélectionnez au moins une catégorie");
      return;
    }
    setLoading(true);

    try {
      const phone = phoneNumber.trim()
        ? `${phoneCode || ""} ${phoneNumber.trim()}`.trim()
        : "";

      const res = await createPage({ ...form, name: nameValidation.value, phone });
      if (res?.slug) {
        setCreatedSlug(res.slug);
        setCreatedPageName(res.name || nameValidation.value);
        setCurrentStep(2);
      } else {
        setError(res?.error || "Impossible de créer la page");
      }
    } catch (err) {
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!createdSlug) return;
    setLocationError("");
    setLocationLoading(true);

    try {
      const location = [locationForm.city, locationForm.commune, locationForm.country]
        .filter(Boolean)
        .join(", ");
      const res = await updatePage(createdSlug, { location });
      if (res?.error) {
        setLocationError(res.error || "Impossible d'enregistrer la localisation");
        return;
      }
      setCurrentStep(3);
    } catch (err) {
      setLocationError("Erreur lors de l'enregistrement de la localisation");
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    if (!createdSlug) return;

    setPhotoError("");
    setPhotoLoading(true);

    try {
      if (photoForm.avatar) {
        const avatarRes = await uploadPageAvatar(createdSlug, photoForm.avatar);
        if (avatarRes?.error) throw new Error(avatarRes.error);
      }
      if (photoForm.cover) {
        const coverRes = await uploadPageCover(createdSlug, photoForm.cover);
        if (coverRes?.error) throw new Error(coverRes.error);
      }
      nav(`/pages/${createdSlug}`);
    } catch (err) {
      setPhotoError(err?.message || "Impossible d'uploader les photos");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setPhotoForm((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const renderStepIndicator = () => (
    <div className="page-steps">
      {[1, 2, 3].map((step) => (
        <div key={step} className={`page-step ${currentStep === step ? "active" : ""} ${currentStep > step ? "done" : ""}`}>
          <div className="step-index">{step}</div>
          <div className="step-label">
            {step === 1 && "Informations principales"}
            {step === 2 && "Localisation"}
            {step === 3 && "Photos"}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-shell">
      <h1>Créer une Page</h1>
      <p>Nom, catégorie, localisation et photos en trois étapes.</p>

      {renderStepIndicator()}

      {currentStep === 1 && (
        <form className="page-form" onSubmit={handleSubmit}>
          <label>
            Nom de la page
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </label>

          <div
            className="category-selector"
            tabIndex={-1}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
          >
            <div className="selector-label">Catégories (max 3)</div>
            <div className="selector-input" onClick={() => setShowDropdown(true)}>
              <div className="selected-chips">
                {form.categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className="chip"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat} <span className="chip-remove">×</span>
                  </button>
                ))}
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  placeholder={
                    form.categories.length
                      ? "Ajouter une catégorie"
                      : "Rechercher une catégorie"
                  }
                  disabled={loading}
                />
              </div>
            </div>

            {showDropdown && (
              <div className="selector-dropdown">
                {filteredCategories.length === 0 && (
                  <div className="dropdown-empty">Aucune catégorie trouvée</div>
                )}
                {PAGE_CATEGORY_GROUPS.map((group) => {
                  const options = group.options.filter((opt) =>
                    filteredCategories.some((c) => c.option === opt)
                  );
                  if (!options.length) return null;
                  return (
                    <div className="dropdown-group" key={group.label}>
                      <div className="group-title">{group.label}</div>
                      <div className="group-options">
                        {options.map((opt) => {
                          const active = form.categories.includes(opt);
                          return (
                            <button
                              type="button"
                              key={opt}
                              className={`option ${active ? "active" : ""}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => toggleCategory(opt)}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label>
            Bio
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              disabled={loading}
            />
          </label>

          <label>
            Téléphone (optionnel)
            <div className="phone-field">
              <div className="phone-code">
                <input
                  list="phone-codes"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.trim())}
                  placeholder="+237"
                  disabled={loading}
                />
                <datalist id="phone-codes">
                  {COUNTRY_CALLING_CODES.map((entry) => (
                    <option key={entry.country} value={entry.code}>
                      {`${entry.country} (${entry.code})`}
                    </option>
                  ))}
                </datalist>
              </div>
              <input
                name="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Numéro de téléphone"
                disabled={loading}
              />
            </div>
          </label>

          <label>
            Email
            <input
              type="email"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="Adresse email"
              disabled={loading}
            />
          </label>

          {error && <div className="error-text">{error}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer et continuer"}
          </button>
        </form>
      )}

      {currentStep === 2 && (
        <form className="page-form" onSubmit={handleLocationSubmit}>
          <div className="step-header">
            <h2>Localiser la page</h2>
            <p>Ajoutez le pays, la ville et la commune associée.</p>
          </div>

          <label>
            Pays
            <select
              name="country"
              value={locationForm.country}
              onChange={(e) =>
                setLocationForm((prev) => ({ ...prev, country: e.target.value }))
              }
              required
              disabled={locationLoading}
            >
              <option value="" disabled>
                Sélectionnez un pays
              </option>
              {COUNTRY_LIST.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ville
            <input
              name="city"
              value={locationForm.city}
              onChange={(e) =>
                setLocationForm((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="Ex: Douala"
              required
              disabled={locationLoading}
            />
          </label>

          <label>
            Commune
            <input
              name="commune"
              value={locationForm.commune}
              onChange={(e) =>
                setLocationForm((prev) => ({ ...prev, commune: e.target.value }))
              }
              placeholder="Ex: Bonapriso"
              required
              disabled={locationLoading}
            />
          </label>

          {locationError && <div className="error-text">{locationError}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentStep(1)}
              disabled={locationLoading}
            >
              Retour
            </button>
            <button className="btn-primary" type="submit" disabled={locationLoading}>
              {locationLoading ? "Enregistrement..." : "Suivant"}
            </button>
          </div>
        </form>
      )}

      {currentStep === 3 && (
        <form className="page-form" onSubmit={handlePhotoSubmit}>
          <div className="step-header">
            <h2>Ajouter les photos de la page</h2>
            <p>Ajoutez une photo de profil et une photo de couverture.</p>
          </div>

          <label>
            Photo de profil
            <input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={handleFileChange}
              disabled={photoLoading}
            />
          </label>

          <label>
            Photo de couverture
            <input
              type="file"
              name="cover"
              accept="image/*"
              onChange={handleFileChange}
              disabled={photoLoading}
            />
          </label>

          {photoError && <div className="error-text">{photoError}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentStep(2)}
              disabled={photoLoading}
            >
              Retour
            </button>
            <button className="btn-primary" type="submit" disabled={photoLoading}>
              {photoLoading ? "Envoi..." : "Terminer et afficher la page"}
            </button>
          </div>

          <div className="created-page-reminder">
            <div className="badge">Page créée</div>
            <div>
              <div className="reminder-title">{createdPageName}</div>
              <div className="reminder-subtitle">Ajoutez vos visuels avant d'ouvrir la page.</div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

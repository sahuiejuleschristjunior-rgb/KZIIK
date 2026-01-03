import React, { useMemo, useState } from "react";
import { API_URL } from "../api/config";
import "../styles/JobForm.css";

export default function PostJobForm({ onJobPosted }) {
    const maxImages = 5;
    const maxVideoSeconds = 300;
    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        contractType: 'CDI',
        salaryRange: '',
        workMode: '',
        experienceLevel: '',
        responsibilities: '',
        profile: '',
        benefits: '',
        recruitmentProcess: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mediaError, setMediaError] = useState('');
    const [images, setImages] = useState([]);
    const [video, setVideo] = useState(null);

    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user"));

    const imageCount = useMemo(() => images.length, [images]);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    }

    const listFromText = (value) =>
        (value || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

    const buildPreview = (file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
    });

    const cleanupPreview = (preview) => {
        if (preview?.preview) URL.revokeObjectURL(preview.preview);
    };

    const handleImageSelection = (files) => {
        setMediaError('');
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        const selected = Array.from(files || []).filter((file) => allowed.includes(file.type));
        const remaining = Math.max(0, maxImages - images.length);

        if (selected.length > remaining) {
            setMediaError(`Maximum ${maxImages} images autorisées.`);
        }

        const accepted = selected.slice(0, remaining).map(buildPreview);
        if (accepted.length) {
            setImages((prev) => [...prev, ...accepted]);
        }
    };

    const handleVideoSelection = async (file) => {
        if (!file) return;
        setMediaError('');
        if (file.type !== "video/mp4") {
            setMediaError("Format vidéo non autorisé (mp4 uniquement).");
            return;
        }

        try {
            const duration = await new Promise((resolve, reject) => {
                const videoElement = document.createElement("video");
                videoElement.preload = "metadata";
                videoElement.onloadedmetadata = () => {
                    URL.revokeObjectURL(videoElement.src);
                    resolve(videoElement.duration || 0);
                };
                videoElement.onerror = () => {
                    reject(new Error("Impossible de lire la vidéo."));
                };
                videoElement.src = URL.createObjectURL(file);
            });

            if (duration > maxVideoSeconds) {
                setMediaError("La vidéo dépasse 5 minutes.");
                return;
            }

            if (video?.preview) URL.revokeObjectURL(video.preview);
            setVideo(buildPreview(file));
        } catch (err) {
            console.error("Erreur durée vidéo:", err);
            setMediaError("Impossible de vérifier la durée de la vidéo.");
        }
    };

    const removeImage = (id) => {
        setImages((prev) => {
            const next = prev.filter((img) => img.id !== id);
            const removed = prev.find((img) => img.id === id);
            cleanupPreview(removed);
            return next;
        });
    };

    const removeVideo = () => {
        if (video?.preview) URL.revokeObjectURL(video.preview);
        setVideo(null);
    };

    const handleDropImages = (event) => {
        event.preventDefault();
        handleImageSelection(event.dataTransfer.files);
    };

    const handleDropVideo = (event) => {
        event.preventDefault();
        handleVideoSelection(event.dataTransfer.files?.[0]);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!form.title || !form.description || !form.location) {
            setError("Veuillez remplir tous les champs obligatoires.");
            setLoading(false);
            return;
        }

        if (!currentUser || currentUser.role !== "recruiter") {
            setError("Seul un recruteur peut publier une offre.");
            setLoading(false);
            return;
        }

        try {
            let mediaPayload = null;

            if (images.length || video) {
                const formData = new FormData();
                const uploadItems = [
                    ...images.map((img) => ({ type: "image", file: img.file })),
                    ...(video ? [{ type: "video", file: video.file }] : []),
                ];

                uploadItems.forEach((item) => formData.append("files", item.file));

                const uploadRes = await fetch(`${API_URL}/upload/job-media`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const uploadData = await uploadRes.json();

                if (!uploadRes.ok || !uploadData?.success) {
                    setError(uploadData?.error || "Erreur lors de l'upload des médias.");
                    setLoading(false);
                    return;
                }

                const urls = Array.isArray(uploadData.urls) ? uploadData.urls : [];
                if (urls.length !== uploadItems.length) {
                    setError("Erreur lors de la récupération des URLs médias.");
                    setLoading(false);
                    return;
                }

                const imageUrls = [];
                let videoUrl = "";

                uploadItems.forEach((item, index) => {
                    const url = urls[index];
                    if (!url) return;
                    if (item.type === "image") imageUrls.push(url);
                    if (item.type === "video") videoUrl = url;
                });

                if (imageUrls.length || videoUrl) {
                    mediaPayload = {
                        images: imageUrls,
                        video: videoUrl,
                    };
                }
            }

            const payload = {
                title: form.title,
                description: form.description,
                location: form.location,
                contractType: form.contractType,
                salaryRange: form.salaryRange,
                workMode: form.workMode,
                experienceLevel: form.experienceLevel,
                recruitmentProcess: form.recruitmentProcess,
                responsibilities: listFromText(form.responsibilities),
                profile: listFromText(form.profile),
                benefits: listFromText(form.benefits),
                ...(mediaPayload ? { media: mediaPayload } : {}),
            };

            const res = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || data.error || "Erreur de publication.");
                setLoading(false);
                return;
            }

            setSuccess("Offre publiée avec succès !");
            setForm({
                title: '',
                description: '',
                location: '',
                contractType: 'CDI',
                salaryRange: '',
                workMode: '',
                experienceLevel: '',
                responsibilities: '',
                profile: '',
                benefits: '',
                recruitmentProcess: '',
            });
            images.forEach(cleanupPreview);
            if (video?.preview) URL.revokeObjectURL(video.preview);
            setImages([]);
            setVideo(null);

            if (onJobPosted) onJobPosted(data.job);

        } catch (err) {
            console.error("Erreur réseau:", err);
            setError("Erreur lors de la publication.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="job-form-wrapper">
            <h2 className="section-title">Publier une offre d'emploi</h2>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            {mediaError && <div className="alert alert-error">{mediaError}</div>}

            <div className="job-form-card">
                <form onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label>Titre du poste</label>
                        <input
                            name="title"
                            type="text"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="Ex: Développeur Full-Stack"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            rows="6"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Détaillez les missions, compétences..."
                            required
                        />
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Localisation</label>
                            <input
                                name="location"
                                type="text"
                                value={form.location}
                                onChange={handleChange}
                                placeholder="Ex: Abidjan, Télétravail"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Contrat</label>
                            <select
                                name="contractType"
                                value={form.contractType}
                                onChange={handleChange}
                                required
                            >
                                <option value="CDI">CDI</option>
                                <option value="CDD">CDD</option>
                                <option value="Alternance">Alternance</option>
                                <option value="Stage">Stage</option>
                                <option value="Freelance">Freelance</option>
                                <option value="Temps Partiel">Temps Partiel</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Mode de travail</label>
                            <select
                                name="workMode"
                                value={form.workMode}
                                onChange={handleChange}
                            >
                                <option value="">Sélectionnez un mode</option>
                                <option value="Sur site">Sur site</option>
                                <option value="Hybride">Hybride</option>
                                <option value="Télétravail">Télétravail</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Niveau d'expérience</label>
                            <select
                                name="experienceLevel"
                                value={form.experienceLevel}
                                onChange={handleChange}
                            >
                                <option value="">Sélectionnez un niveau</option>
                                <option value="Débutant">Débutant</option>
                                <option value="Junior">Junior</option>
                                <option value="Confirmé">Confirmé</option>
                                <option value="Senior">Senior</option>
                                <option value="Expert">Expert</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Salaire (optionnel)</label>
                        <input
                            name="salaryRange"
                            type="text"
                            value={form.salaryRange}
                            onChange={handleChange}
                            placeholder="Ex: 400k - 600k / mois"
                        />
                    </div>

                    <div className="input-group">
                        <label>Responsabilités (une par ligne)</label>
                        <textarea
                            name="responsibilities"
                            rows="4"
                            value={form.responsibilities}
                            onChange={handleChange}
                            placeholder="Ex: Concevoir l'architecture\nCollaborer avec l'équipe produit"
                        />
                    </div>

                    <div className="input-group">
                        <label>Profil recherché (une compétence par ligne)</label>
                        <textarea
                            name="profile"
                            rows="4"
                            value={form.profile}
                            onChange={handleChange}
                            placeholder="Ex: 3 ans d'expérience\nMaîtrise de React"
                        />
                    </div>

                    <div className="input-group">
                        <label>Avantages (un par ligne)</label>
                        <textarea
                            name="benefits"
                            rows="3"
                            value={form.benefits}
                            onChange={handleChange}
                            placeholder="Ex: Mutuelle\nTélétravail partiel"
                        />
                    </div>

                    <div className="input-group">
                        <label>Process de recrutement</label>
                        <textarea
                            name="recruitmentProcess"
                            rows="3"
                            value={form.recruitmentProcess}
                            onChange={handleChange}
                            placeholder="Ex: Entretien RH, test technique, entretien final"
                        />
                    </div>

                    <div className="input-group">
                        <label>Images (max {maxImages})</label>
                        <div
                            className="media-dropzone"
                            onDrop={handleDropImages}
                            onDragOver={(event) => event.preventDefault()}
                        >
                            <p>Glissez-déposez vos images ou sélectionnez un fichier</p>
                            <span>{imageCount}/{maxImages} sélectionnée(s)</span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={(event) => handleImageSelection(event.target.files)}
                            />
                        </div>
                        {images.length > 0 && (
                            <div className="media-grid">
                                {images.map((img) => (
                                    <div key={img.id} className="media-item">
                                        <img src={img.preview} alt="Aperçu image" />
                                        <button
                                            type="button"
                                            className="media-remove"
                                            onClick={() => removeImage(img.id)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label>Vidéo (optionnelle, max 5 min)</label>
                        <div
                            className="media-dropzone"
                            onDrop={handleDropVideo}
                            onDragOver={(event) => event.preventDefault()}
                        >
                            <p>Glissez-déposez une vidéo mp4 ou sélectionnez un fichier</p>
                            <span>{video ? "1 vidéo sélectionnée" : "Aucune vidéo"}</span>
                            <input
                                type="file"
                                accept="video/mp4"
                                onChange={(event) => handleVideoSelection(event.target.files?.[0])}
                            />
                        </div>
                        {video && (
                            <div className="media-video-preview">
                                <video controls preload="metadata" src={video.preview} />
                                <button
                                    type="button"
                                    className="media-remove"
                                    onClick={removeVideo}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    <button className="btn-primary" disabled={loading}>
                        {loading ? "Publication..." : "Publier l'offre"}
                    </button>
                </form>
            </div>
        </div>
    );
}

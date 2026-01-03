// src/components/PostEditModal.jsx
import React, { useState } from "react";
import "../styles/post-edit-modal.css";

const API_URL = import.meta.env.VITE_API_URL;

/* Fonction pour corriger les URL */
const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
};

export default function PostEditModal({ post, onClose, onPostUpdated }) {
  const token = localStorage.getItem("token");

  /* ============== STATES ============== */
  const [text, setText] = useState(post.text || "");
  const [existingMedia, setExistingMedia] = useState(post.media || []);
  const [newMedia, setNewMedia] = useState([]);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* LIMITE DE FICHIERS = 10 */
  const MAX_FILES = 10;

  const totalFiles = existingMedia.length + newMedia.length;

  /* ============== AJOUT NOUVEAUX MEDIAS ============== */
  const handleAddMedia = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (totalFiles + files.length > MAX_FILES) {
      setError(`Limite de ${MAX_FILES} fichiers atteinte.`);
      return;
    }

    setNewMedia((prev) => [...prev, ...files]);
    setError("");
  };

  /* ============== SUPPRESSION DES ANCIENS MEDIAS ============== */
  const handleRemoveExisting = (index) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  /* ============== SUPPRESSION DES NOUVEAUX MEDIAS AJOUTÉS ============== */
  const handleRemoveNew = (index) => {
    setNewMedia((prev) => prev.filter((_, i) => i !== index));
  };

  /* ============== ENREGISTRER LES MODIFICATIONS ============== */
  const handleSave = async () => {
    try {
      setError("");
      setStatusMessage("Votre publication est en cours de modification...");
      setIsSaving(true);

      const form = new FormData();
      form.append("text", text);

      /* Médias déjà présents dans le post */
      form.append(
        "existingMedia",
        JSON.stringify(existingMedia.map((m) => ({ url: m.url, type: m.type })))
      );

      /* Nouveaux fichiers ajoutés */
      newMedia.forEach((file) => {
        form.append("newMedia", file);
      });

      const res = await fetch(`${API_URL}/posts/${post._id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const updated = await res.json();

      if (!res.ok) {
        setError("Erreur lors de la mise à jour.");
        setStatusMessage("");
        setIsSaving(false);
        return;
      }

      onPostUpdated(updated);
      setStatusMessage("Modification enregistrée. Rafraîchissement de la page...");

      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.log("UPDATE ERROR:", err);
      setError("Impossible de modifier le post.");
      setStatusMessage("");
      setIsSaving(false);
    }
  };

  return (
    <div className="post-edit-modal-backdrop">
      <div className="post-edit-modal">

        {/* HEADER */}
        <div className="pem-header">
          <h3>Modifier la publication</h3>
          <button className="pem-close" onClick={onClose}>✕</button>
        </div>

        {/* ERREUR */}
        {error && <div className="pem-error">{error}</div>}
        {statusMessage && <div className="pem-status">{statusMessage}</div>}

        {/* INPUT TEXTE */}
        <textarea
          className="pem-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Exprimez-vous..."
        />

        {/* ======================= MEDIAS EXISTANTS ======================= */}
        {existingMedia.length > 0 && (
          <div className="pem-media-group">
            {existingMedia.map((m, index) => (
              <div key={index} className="pem-media-item">
                {m.type === "image" ? (
                  <img className="pem-img" src={fixUrl(m.url)} loading="lazy" />
                ) : (
                  <video className="pem-video" controls src={fixUrl(m.url)} />
                )}

                <button
                  className="pem-remove"
                  onClick={() => handleRemoveExisting(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ======================= PREVIEW NOUVEAUX MEDIAS ======================= */}
        {newMedia.length > 0 && (
          <div className="pem-media-group">
            {newMedia.map((file, index) => (
              <div key={index} className="pem-media-item">
                {file.type.startsWith("image") ? (
                  <img
                    className="pem-img"
                    src={URL.createObjectURL(file)}
                    loading="lazy"
                  />
                ) : (
                  <video
                    className="pem-video"
                    controls
                    src={URL.createObjectURL(file)}
                  />
                )}

                <button
                  className="pem-remove"
                  onClick={() => handleRemoveNew(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* BOUTON D'AJOUT MEDIA */}
        <label className="pem-add-media">
          Ajouter des médias
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: "none" }}
            onChange={handleAddMedia}
          />
        </label>

        <div className="pem-counter">
          {totalFiles} / {MAX_FILES} fichiers
        </div>

        {/* SAVE BUTTON */}
        <button className="pem-save" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Publication..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
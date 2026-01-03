import { useState, useEffect } from "react";
import "../styles/create-post.css";

const MAX_FILES = 10;
const API = "https://emploisfacile.org";

export default function CreatePostModal({ initialFiles = [], onClose, onPosted }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState(initialFiles);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");

  /* Génère les previews */
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreview(urls);
  }, [files]);

  /* ================================
        AJOUT DE NOUVEAUX FICHIERS
  ================================= */
  const appendMoreFiles = (incoming) => {
    if (files.length + incoming.length > MAX_FILES) {
      setErrorMsg(`Maximum ${MAX_FILES} fichiers.`);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }
    const allowed = ["image/", "video/"];
    const filtered = incoming.filter((f) =>
      allowed.some((t) => f.type.startsWith(t))
    );
    setFiles((prev) => [...prev, ...filtered]);
  };

  const handleAddFiles = (e) => {
    appendMoreFiles(Array.from(e.target.files || []));
  };

  /* ================================
        PUBLICATION
  ================================= */
  const handleCreate = async () => {
    if (!text.trim() && files.length === 0) return;
    setLoading(true);

    const fd = new FormData();
    fd.append("text", text);
    files.forEach((f) => fd.append("files", f));

    const res = await fetch(`${API}/api/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const data = await res.json();

    if (res.ok) {
      setText("");
      setFiles([]);
      onPosted();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fb-modal-overlay">
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fb-modal-header">
          Créer une publication
          <button className="fb-modal-close" onClick={onClose}>✖</button>
        </div>

        {errorMsg && <div className="fb-create-error">{errorMsg}</div>}

        <textarea
          className="fb-modal-textarea"
          placeholder="Quoi de neuf ?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {preview.length > 0 && (
          <div className="fb-preview-zone">
            {preview.map((src, i) => (
              <div key={i} className="fb-preview-item">
                {files[i].type.startsWith("video/") ? (
                  <video src={src} controls className="fb-preview-img" />
                ) : (
                  <img src={src} className="fb-preview-img" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        )}

        <label className="fb-modal-file-btn">
          Ajouter ( {files.length} / {MAX_FILES} )
          <input type="file" hidden multiple onChange={handleAddFiles} />
        </label>

        <button
          className="fb-modal-submit"
          disabled={loading}
          onClick={handleCreate}
        >
          {loading ? "Publication..." : "Publier"}
        </button>
      </div>
    </div>
  );
}
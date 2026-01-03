import { useCallback, useEffect } from "react";
import "../styles/profile-photo-viewer.css";

export default function ProfilePhotoViewer({ items = [], index = 0, onClose, onChangeIndex }) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const safeIndex = hasItems ? Math.max(0, Math.min(index, items.length - 1)) : 0;
  const currentItem = hasItems ? items[safeIndex] : null;

  const goPrev = useCallback(() => {
    if (!hasItems) return;
    const nextIndex = (safeIndex - 1 + items.length) % items.length;
    onChangeIndex?.(nextIndex);
  }, [hasItems, items.length, onChangeIndex, safeIndex]);

  const goNext = useCallback(() => {
    if (!hasItems) return;
    const nextIndex = (safeIndex + 1) % items.length;
    onChangeIndex?.(nextIndex);
  }, [hasItems, items.length, onChangeIndex, safeIndex]);

  useEffect(() => {
    if (!hasItems) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, hasItems, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!hasItems || !currentItem) return null;

  return (
    <div className="ppv-overlay" role="dialog" aria-modal="true">
      <button className="ppv-close" onClick={onClose} aria-label="Fermer la visionneuse">
        ✕
      </button>

      <div className="ppv-main">
        {items.length > 1 && (
          <button className="ppv-nav ppv-prev" onClick={goPrev} aria-label="Photo précédente">
            ‹
          </button>
        )}

        <div className="ppv-stage">
          <img src={currentItem.url} alt="Photo de profil" loading="lazy" />
        </div>

        {items.length > 1 && (
          <button className="ppv-nav ppv-next" onClick={goNext} aria-label="Photo suivante">
            ›
          </button>
        )}
      </div>

      <div className="ppv-footer">
        <div className="ppv-counter">
          {safeIndex + 1} / {items.length}
        </div>
        {items.length > 1 && (
          <div className="ppv-thumbs" role="list">
            {items.map((item, i) => (
              <button
                key={item.key || i}
                className={`ppv-thumb ${i === safeIndex ? "ppv-thumb--active" : ""}`}
                onClick={() => onChangeIndex?.(i)}
                role="listitem"
                aria-label={`Aller à la photo ${i + 1}`}
              >
                <img src={item.url} alt="Miniature de la photo" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

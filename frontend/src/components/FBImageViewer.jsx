import { useEffect } from "react";
import "../styles/fb-image-viewer.css";

export default function FBImageViewer({ images, startIndex = 0, onClose }) {
  const [current, setCurrent] = React.useState(startIndex);

  const prev = () => {
    setCurrent((c) => (c > 0 ? c - 1 : images.length - 1));
  };

  const next = () => {
    setCurrent((c) => (c < images.length - 1 ? c + 1 : 0));
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="fb-viewer-overlay" onClick={onClose}>
      <div className="fb-viewer-content" onClick={(e) => e.stopPropagation()}>

        {/* Image */}
        <img src={images[current]} className="fb-viewer-img" loading="lazy" />

        {/* Buttons */}
        <button className="fb-viewer-close" onClick={onClose}>✕</button>
        {images.length > 1 && (
          <>
            <button className="fb-viewer-prev" onClick={prev}>❮</button>
            <button className="fb-viewer-next" onClick={next}>❯</button>
          </>
        )}

        {/* Index */}
        <div className="fb-viewer-index">
          {current + 1} / {images.length}
        </div>

      </div>
    </div>
  );
}
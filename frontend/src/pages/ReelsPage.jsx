import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../styles/reels.css";
import { getImageUrl } from "../utils/imageUtils";

export default function ReelsPage() {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const location = useLocation();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const hasUnlockedSound = useRef(false);
  const activeIndexRef = useRef(0);
  const isScrollingRef = useRef(false);

  const selectedVideoId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("videoId");
  }, [location.search]);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/posts/videos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setError("Impossible de charger les vidéos pour le moment.");
        setVideos([]);
        return;
      }

      setVideos(data);
    } catch (err) {
      console.error("Erreur chargement vidéos:", err);
      setError("Une erreur est survenue lors du chargement des vidéos.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      videoRefs.current.forEach((v) => v?.pause());
    };
  }, []);

  useEffect(() => {
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoEl = entry.target;
          const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= 0.7;

          if (isVisibleEnough) {
            videoRefs.current.forEach((v) => {
              if (v && v !== videoEl) v.pause();
            });

            const index = Number(videoEl.dataset.index || 0);
            activeIndexRef.current = index;

            videoEl.muted = !soundEnabled;
            videoEl.defaultMuted = !soundEnabled;
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        });
      },
      {
        threshold: 0.7,
        root: containerRef.current,
      }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [soundEnabled, videos]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = !soundEnabled;
        video.defaultMuted = !soundEnabled;
      }
    });
  }, [soundEnabled]);

  useEffect(() => {
    if (!videos.length) return;

    const targetIndex = selectedVideoId
      ? videos.findIndex((v) => String(v._id) === String(selectedVideoId))
      : 0;

    if (targetIndex < 0) return;

    const el = videoRefs.current[targetIndex];
    if (el) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
      el.play().catch(() => {});
      activeIndexRef.current = targetIndex;
    }
  }, [selectedVideoId, videos]);

  const scrollToVideo = useCallback(
    (index) => {
      const target = videoRefs.current[index];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.play().catch(() => {});
      }
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (videos.length === 0) return;
      e.preventDefault();

      if (isScrollingRef.current) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.min(
        Math.max(activeIndexRef.current + direction, 0),
        videos.length - 1
      );

      if (nextIndex === activeIndexRef.current) return;

      isScrollingRef.current = true;
      scrollToVideo(nextIndex);

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 550);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => container.removeEventListener("wheel", handleWheel);
  }, [scrollToVideo, videos.length]);

  const handleEnableSound = useCallback(
    (videoEl) => {
      if (hasUnlockedSound.current) return;

      hasUnlockedSound.current = true;
      setSoundEnabled(true);

      if (videoEl) {
        videoEl.muted = false;
        videoEl.defaultMuted = false;
        videoEl.play().catch(() => {});
      }
    },
    []
  );

  return (
    <div className="reels-page">
      <div className="reels-container" ref={containerRef}>
        {loading && <div className="reels-status">Chargement…</div>}
        {error && !loading && <div className="reels-status">{error}</div>}

        {!loading && !error && videos.length === 0 && (
          <div className="reels-status">Aucune vidéo disponible pour le moment.</div>
        )}

        {videos.map((video, index) => (
          <section key={video._id} className="reels-item">
            <video
              data-index={index}
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              className="reels-video"
              muted={!soundEnabled}
              loop
              playsInline
              preload="metadata"
              src={getImageUrl(video.media)}
              onClick={() => handleEnableSound(videoRefs.current[index])}
            />

            <div className="reels-overlay">
              <div className="reels-user">{video.user?.name || "Utilisateur"}</div>
              <div className="reels-meta">
                <span>{video.likesCount ?? 0} j’aime</span>
                <span>{video.commentsCount ?? 0} commentaires</span>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

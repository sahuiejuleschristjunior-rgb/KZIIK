// src/components/StoriesViewer.jsx (CORRIGÉ INTÉGRAL)

import { useEffect, useRef, useState } from "react";
import "../styles/stories-viewer.css"; 
// 💥 IMPORT CORRIGÉ
import { getImageUrl } from "../utils/imageUtils"; // Import de la fonction utilitaire

export default function StoriesViewer({ stories, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);

  const intervalRef = useRef(null);
  
  // --- VARIABLES CLÉS ---
  const current = stories[index];
  const API = "https://emploisfacile.org"; // Assurez-vous que cette URL est correcte
  const token = localStorage.getItem("token");
  // ----------------------


  /* NOUVELLE FONCTION : Gestionnaire de clic pour retirer le focus et le contour bleu */
  function handleTouchZoneClick(action) {
    action(); // Exécute goNext ou goPrev
    /* Retire manuellement l'état de focus de l'élément cliqué */
    if (document.activeElement) {
        document.activeElement.blur(); 
    }
  }

  /* LOGIQUE DE NAVIGATION */
  function goNext() {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      onClose(); /* Ferme si c'est la dernière story */
    }
  }

  function goPrev() {
    if (index > 0) {
      setIndex(index - 1);
    }
  }

  /* TIMER DE PROGRESSION (INTÉGRANT LE FALLBACK DE CHARGEMENT) */
  useEffect(() => {
    setProgress(0);
    setMediaLoading(true); /* Réinitialisation pour la nouvelle story */

    if (!current) {
        clearInterval(intervalRef.current);
        return;
    }
    
    /* Définir une temporisation de sécurité (5 secondes) */
    const fallbackTimeout = setTimeout(() => {
        if (mediaLoading) {
            console.warn("Délai de chargement du média dépassé, forçage du démarrage.");
            setMediaLoading(false);
        }
    }, 5000); 

    /* Démarrer le timer de progression */
    intervalRef.current = setInterval(() => {
      if (!paused && !mediaLoading) {
        setProgress((p) => {
          if (p >= 100) {
            goNext();
            return 0;
          }
          return p + 1;
        });
      }
    }, 60);

    /* Nettoyage : arrêter le timer de progression ET le fallback timeout */
    return () => {
        clearInterval(intervalRef.current);
        clearTimeout(fallbackTimeout);
    };
  }, [index, paused, current]); 


  // ===============================================
  // 💥 LOGIQUE DE RÉACTION (MISE À JOUR)
  // ===============================================

  const sendReaction = async (storyId, reactionType, userName) => {
      if (!token || !storyId) return;

      try {
          const res = await fetch(`${API}/api/stories/${storyId}/react`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ reaction: reactionType }),
          });

          const data = await res.json();
          
          if (res.ok) {
              // Feedback utilisateur basé sur la réponse du backend
              alert(`${data.message} pour la story de ${userName || "cet utilisateur"} !`);
              console.log("Réaction réussie:", data.message);
          } else {
              // Gère les erreurs 400, 500, etc.
              console.error("Échec de l'enregistrement de la réaction:", data.message || "Erreur inconnue");
              alert(`Erreur: ${data.message || "Impossible d'envoyer la réaction."}`);
          }
      } catch (err) {
          console.error("Erreur réseau lors de l'envoi de la réaction:", err);
          alert("Erreur de connexion au serveur.");
      }
  };

  function react(type) {
    const storyId = current._id;
    const userName = current.user?.name;
    if (!storyId) return;

    // Appel de la fonction asynchrone pour l'API
    sendReaction(storyId, type, userName);
  }
  // ===============================================

  /* Accès aux données du média */
  const mediaPath = current.media?.url || current.media; 
  
  // 💥 CORRECTION URL : Utiliser getImageUrl
  const fullMediaUrl = getImageUrl(mediaPath); 

  // Détermination du type de média
  const mediaType = current.media?.type || (mediaPath?.endsWith('.mp4') ? 'video' : 'image');

  if (!current) return null;


  return (
    <div className="story-viewer">
      
      {/* AFFICHAGE DU MESSAGE DE CHARGEMENT */}
      {mediaLoading && <div className="media-loader">Chargement du média...</div>}

      <div className="story-progress">
        {stories.map((s, i) => (
          <div
            key={i}
            className="story-progress-segment"
          >
            <div
              className="story-progress-fill"
              style={{
                width:
                  i < index
                    ? "100%"
                    : i === index
                    /* La progression est à 0 si le média charge */
                    ? (mediaLoading ? "0%" : `${progress}%`)
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>
      
      {/* HEADER : Nom de l'utilisateur et heure */}
      <div className="story-header">
          <span className="story-author">{current.user?.name || "Utilisateur"}</span>
      </div>

      {/* ZONE CLIC/TOUCH GAUCHE */}
      <div
        className="story-touch-zone left"
        onClick={() => handleTouchZoneClick(goPrev)} 
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      />

      {/* ZONE CLIC/TOUCH DROITE */}
      <div
        className="story-touch-zone right"
        onClick={() => handleTouchZoneClick(goNext)} 
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      />

      {/* RENDU DU MEDIA */}
      {mediaType === 'image' && (
        <img
            src={fullMediaUrl} // 👈 URL CORRIGÉE
            alt="Story Media"
            className="story-media"
            style={{ display: mediaLoading ? 'none' : 'block' }}
            onLoad={() => setMediaLoading(false)}
            onError={() => setMediaLoading(false)}
            loading="lazy"
        />
      )}
      {mediaType === 'video' && (
        <video 
            src={fullMediaUrl} // 👈 URL CORRIGÉE
            controls 
            autoPlay
            muted 
            playsInline 
            className="story-media" 
            style={{ display: mediaLoading ? 'none' : 'block' }}
            onLoadedData={(e) => {
                setMediaLoading(false);
                e.currentTarget.play().catch(error => {
                    console.warn("Lecture automatique bloquée par le navigateur.");
                });
            }}
        />
      )}
      
      <button className="story-close" onClick={onClose}>×</button>

      {/* Les boutons appellent maintenant la fonction `react` qui appelle l'API */}
      <div className="story-reactions">
        <button onClick={() => react("❤️")}>❤️</button>
        <button onClick={() => react("😂")}>😂</button>
        <button onClick={() => react("👍")}>👍</button>
        <button onClick={() => react("🔥")}>🔥</button>
      </div>
    </div>
  );
}
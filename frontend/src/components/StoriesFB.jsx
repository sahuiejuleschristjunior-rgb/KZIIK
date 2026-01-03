// src/components/StoriesFB.jsx (VERSION INTÉGRALE ET CORRIGÉE)

import { useState, useRef, useEffect } from "react";
import StoriesViewer from "./StoriesViewer";
import "./../styles/stories.css";
// 💥 NOUVEL IMPORT : La fonction pour générer l'URL complète
import { getImageUrl } from "../utils/imageUtils";
import { API_URL } from "../api/config";

export default function StoriesFB() {
  const [isUploading, setIsUploading] = useState(false);
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (e) {
      console.warn("Impossible de parser l'utilisateur depuis le localStorage", e);
      return {};
    }
  })();
  
  const fileInputRef = useRef(null); 

  const token = localStorage.getItem("token");
  /* =======================================
     FONCTIONS DE GESTION DE LA MODALE (StoriesViewer)
     ======================================= */
  
  // NOUVEAU : Ouvre le viewer et retire le focus
  const openStory = (index, event) => {
    setStartIndex(index);
    setIsViewerOpen(true);
    
    // CORRECTION JS : Retire le focus de l'élément cliqué
    if (event && event.currentTarget) {
        event.currentTarget.blur();
    } else if (document.activeElement) {
        document.activeElement.blur();
    }
  };

  // Ferme le viewer
  const closeStory = () => {
    setIsViewerOpen(false);
    setStartIndex(0); 
  };
  
  /* =======================================
     CHARGEMENT DES STORIES
     ======================================= */
  // ... (Code de useEffect et loadStories inchangé) ...
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setStoriesLoading(true);
    try {
      const res = await fetch(`${API_URL}/stories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStories(Array.isArray(data) ? data : []);
      } else {
        console.error("Échec du chargement des stories:", res.status);
      }
    } catch (error) {
      console.error("Erreur réseau/serveur lors du chargement des stories:", error);
    }
    setStoriesLoading(false);
  };
  
  /* =======================================
     LOGIQUE D'UPLOAD
     ======================================= */
  
  const handleCreateStoryClick = (event) => { 
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
    // CORRECTION JS pour la carte Créer
    if (event && event.currentTarget) {
        event.currentTarget.blur();
    } else if (document.activeElement) {
        document.activeElement.blur();
    }
  };
  
  // ... (Code de handleFileChange et uploadStory inchangé) ...
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      uploadStory(selectedFile); 
    }
  };

  const uploadStory = async (storyFile) => {
    setIsUploading(true);
    
    const fd = new FormData();
    fd.append("file", storyFile); 

    try {
      const res = await fetch(`${API_URL}/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        alert("Story publiée avec succès !");
        loadStories(); // Recharge les stories après un succès
      } else {
        console.error("Échec de la publication:", res.status);
        alert(`Échec de la publication (Statut: ${res.status})`);
      }
    } catch (error) {
      console.error("Erreur réseau/serveur:", error);
      alert("Erreur de connexion au serveur.");
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = null; 
    }
  };


  /* =======================================
     RENDU
     ======================================= */
  
  return (
    <>
      <div className="fb-stories-container">

        {/* 1. INPUT DE FICHIER (CACHÉ) */}
        <input
          type="file"
          ref={fileInputRef} 
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }} 
          disabled={isUploading}
        />
        
        {/* 2. CARTE CRÉATRICE */}
        <div
          className={`fb-story fb-story-create ${isUploading ? 'is-uploading' : ''}`}
          onClick={handleCreateStoryClick}
        >
          <div className="story-circle create-story-circle">
            <img
              src={getImageUrl(currentUser?.avatar) || "/default-avatar.png"}
              alt="Votre avatar"
              loading="lazy"
            />
          </div>
          <div className="fb-story-create-btn">
            {isUploading ? "Envoi..." : "Créer"}
          </div>
        </div>

        {/* 3. STORIES EXISTANTES (Cliquables) */}
        {storiesLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={`story-skeleton-${index}`} className="fb-story fb-story-skeleton">
                <div className="fb-story-skeleton-avatar" />
                <div className="fb-story-skeleton-text" />
              </div>
            ))
          : stories.map((s, index) => {
              const mediaType = s?.media?.type;
              const mediaUrl =
                mediaType === "image"
                  ? s?.media?.url
                  : mediaType === "video"
                    ? s?.media?.thumbnail || s?.media?.url
                    : s?.media?.url;

              const avatarUrl = s?.user?.avatar;
              const hasStoryMedia = Boolean(mediaUrl);
              const circleImage = hasStoryMedia
                ? getImageUrl(mediaUrl)
                : getImageUrl(avatarUrl) || "/default-avatar.png";

              return (
                <div
                  key={s._id}
                  className="fb-story"
                  onClick={(e) => openStory(index, e)}
                >
                  <div
                    className={`story-circle ${hasStoryMedia ? "has-story" : "no-story"}`}
                  >
                    <img
                      src={circleImage}
                      alt={s?.user?.name || "Story"}
                      loading="lazy"
                    />
                  </div>
                  <div className="fb-story-user">{s.user.name || "Utilisateur"}</div>
                </div>
              );
            })}

      </div>
      
      {/* 4. AFFICHEUR DE STORY (Modale conditionnelle) */}
      {isViewerOpen && stories.length > 0 && (
          <StoriesViewer
            stories={stories}
            startIndex={startIndex}
            onClose={closeStory}
          />
      )}
    </>
  );
}

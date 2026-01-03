import { useState } from "react";
import useRelation from "../../hooks/useRelation";
import {
  AddFriendIcon,
  FriendsIcon,
  FollowIcon,
  BlockIcon,
} from "./RelationIcons";
import "../../styles/relation-button.css";

export default function RelationButton({ targetId }) {
  const {
    status,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    follow,
    unfollow,
    block,
    unblock,
  } = useRelation(targetId);

  const [open, setOpen] = useState(false);

  /* ======================================================
     🔒 Helper : fermer le menu + exécuter l’action
  ====================================================== */
  const closeAnd = async (fn) => {
    setOpen(false);
    await fn();
  };

  if (loading || !status) {
    return <button className="rb-btn rb-loading">...</button>;
  }

  const {
    isFriend,
    requestSent,
    requestReceived,
    isFollowing,
    isBlocked,
  } = status;

  /* ======================================================
     🔘 Bouton principal (état intelligent)
  ====================================================== */
  let label = "Ajouter";
  let icon = <AddFriendIcon />;
  let action = sendRequest;

  if (isBlocked) {
    label = "Bloqué";
    icon = <BlockIcon />;
    action = () => setOpen((o) => !o);
  } else if (isFriend) {
    label = "Amis";
    icon = <FriendsIcon />;
    action = () => setOpen((o) => !o);
  } else if (requestReceived) {
    label = "Répondre";
    icon = <AddFriendIcon />;
    action = () => setOpen((o) => !o);
  } else if (requestSent) {
    label = "Demande envoyée";
    icon = <AddFriendIcon />;
    action = () => setOpen((o) => !o);
  }

  return (
    <div className="rb-wrapper">
      {/* ===== Bouton principal ===== */}
      <button
        className="rb-btn"
        onClick={action}
        disabled={loading}
      >
        {icon}
        <span>{label}</span>
      </button>

      {/* ===== Menu contextuel ===== */}
      {open && (
        <div className="rb-menu">
          {/* Demande reçue */}
          {requestReceived && (
            <>
              <button
                disabled={loading}
                onClick={() => closeAnd(acceptRequest)}
              >
                ✅ Accepter
              </button>
              <button
                disabled={loading}
                className="danger"
                onClick={() => closeAnd(rejectRequest)}
              >
                ❌ Refuser
              </button>
            </>
          )}

          {/* Demande envoyée */}
          {requestSent && (
            <button
              disabled={loading}
              className="danger"
              onClick={() => closeAnd(cancelRequest)}
            >
              Annuler la demande
            </button>
          )}

          {/* Déjà amis */}
          {isFriend && (
            <>
              <button
                disabled={loading}
                onClick={() => closeAnd(removeFriend)}
              >
                Retirer des amis
              </button>

              <button
                disabled={loading}
                onClick={() =>
                  closeAnd(isFollowing ? unfollow : follow)
                }
              >
                <FollowIcon />
                {isFollowing ? "Se désabonner" : "S’abonner"}
              </button>

              <button
                disabled={loading}
                className="danger"
                onClick={() => closeAnd(block)}
              >
                <BlockIcon /> Bloquer
              </button>
            </>
          )}

          {/* Utilisateur bloqué */}
          {isBlocked && (
            <button
              disabled={loading}
              onClick={() => closeAnd(unblock)}
            >
              Débloquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
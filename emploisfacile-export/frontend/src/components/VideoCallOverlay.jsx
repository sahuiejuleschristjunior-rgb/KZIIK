// src/components/VideoCallOverlay.jsx
import { useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const Icon = ({ name, size = 22 }) => {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    width: size,
    height: size,
    "aria-hidden": true,
    focusable: false,
  };

  const paths = {
    micOn: (
      <g>
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
        <path d="M19 11a1 1 0 0 0-2 0 5 5 0 1 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20a1 1 0 0 0 2 0v-2.07A7 7 0 0 0 19 11Z" />
      </g>
    ),
    micOff: (
      <g>
        <path d="M15 11.95 9.41 6.36A3 3 0 0 1 15 5v6.95Zm3.72 8.43-2.77-2.77A6.93 6.93 0 0 1 12 20a7 7 0 0 1-7-7 1 1 0 0 1 2 0 5 5 0 0 0 5 5 4.93 4.93 0 0 0 2.12-.47l-2.04-2.04A3 3 0 0 1 9 13V9.41L5.05 5.37a1 1 0 0 1 1.4-1.44l12.67 12.67a1 1 0 1 1-1.4 1.38Z" />
      </g>
    ),
    videoOn: (
      <path d="M14.75 6h-7.5A2.25 2.25 0 0 0 5 8.25v7.5A2.25 2.25 0 0 0 7.25 18h7.5A2.25 2.25 0 0 0 17 15.75v-1.38l2.38 1.58a.75.75 0 0 0 1.17-.62V8.67a.75.75 0 0 0-1.17-.62L17 9.63V8.25A2.25 2.25 0 0 0 14.75 6Z" />
    ),
    videoOff: (
      <g>
        <path d="M7.25 6A2.25 2.25 0 0 0 5 8.25v6.19l-1.12-1.12a1 1 0 0 0-1.4 1.42L5.46 17.7A2.24 2.24 0 0 0 7.25 18h6.21a2.24 2.24 0 0 0 1.55-.61l1.93 1.93a1 1 0 0 0 1.4-1.42L7.67 6.42A2.23 2.23 0 0 0 7.25 6Zm9.5 2.22v1.41l1.42-1a.75.75 0 0 1 1.17.62v5.66a.75.75 0 0 1-1.17.62L16.75 14.7v1.05a.25.25 0 0 1-.42.18l-1.6-1.6a.75.75 0 0 0-.03-.97l-3.76-3.76a.74.74 0 0 0-.97-.03L8.42 8.74a.25.25 0 0 1 .18-.42h6.15a1 1 0 0 1 1 1Z" />
      </g>
    ),
    phone: (
      <path d="M5.54 4.47 7.7 3.64a2 2 0 0 1 2.42.9l1.16 2.1a2 2 0 0 1-.45 2.44l-.64.6a7.7 7.7 0 0 0 3.15 3.15l.61-.64a2 2 0 0 1 2.44-.45l2.09 1.16a2 2 0 0 1 .9 2.42l-.83 2.16a2 2 0 0 1-2.12 1.3 15.5 15.5 0 0 1-9.9-6.36 15.5 15.5 0 0 1-2.63-5.44 2 2 0 0 1 1.2-2.34Z" />
    ),
    phoneDown: (
      <path d="M5.05 14.34c3.96-3.77 9.94-3.77 13.9 0a1.25 1.25 0 0 1-.36 2.06l-2.27.98a1.25 1.25 0 0 1-1.4-.3l-1.24-1.4a6.02 6.02 0 0 0-2.36 0l-1.24 1.4a1.25 1.25 0 0 1-1.4.3l-2.27-.98a1.25 1.25 0 0 1-.36-2.06Z" />
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

export default function VideoCallOverlay({
  visible,
  mode,          // "caller" | "callee"
  socket,
  me,
  otherUser,
  incomingOffer,
  callType = "video", // "video" | "audio"
  onClose,
}) {
  /* ============================================================
     HOOKS
  ============================================================ */
  const isVideoCall = callType !== "audio";

  const [status, setStatus] = useState("idle");          // "idle" | "calling" | "in-call"
  const [accepted, setAccepted] = useState(mode === "caller");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(isVideoCall);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  /* ============================================================
     CLEANUP
  ============================================================ */
  const cleanUpCall = () => {
    try {
      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.close();
      }
    } catch (e) {}

    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleHangup = () => {
    if (socket && otherUser?._id) {
      socket.emit("call_hangup", { to: otherUser._id });
    }
    cleanUpCall();
    setStatus("idle");
    setAccepted(mode === "caller");
    onClose && onClose();
  };

  /* ============================================================
     SOCKET LISTENERS
  ============================================================ */
  useEffect(() => {
    if (!socket || !otherUser) return;

    const handleCallAnswer = ({ from, answer }) => {
      if (!pcRef.current) return;
      if (from !== otherUser._id) return;

      pcRef.current
        .setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => setStatus("in-call"))
        .catch((err) => console.error("Remote answer error:", err));
    };

    const handleIceCandidate = ({ from, candidate }) => {
      if (!pcRef.current) return;
      if (from !== otherUser._id) return;

      pcRef.current
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((err) => console.error("ICE error:", err));
    };

    const handleHangupRemote = ({ from }) => {
      if (from !== otherUser._id) return;

      cleanUpCall();
      setStatus("idle");
      setAccepted(mode === "caller");
      onClose && onClose();
    };

    socket.on("call_answer", handleCallAnswer);
    socket.on("call_ice_candidate", handleIceCandidate);
    socket.on("call_hangup", handleHangupRemote);

    return () => {
      socket.off("call_answer", handleCallAnswer);
      socket.off("call_ice_candidate", handleIceCandidate);
      socket.off("call_hangup", handleHangupRemote);
    };
  }, [socket, otherUser?._id]);

  /* ============================================================
     PEER CONNECTION
  ============================================================ */
  const startPeerConnection = async (withOffer = false) => {
    if (!socket || !otherUser?._id) return;
    if (pcRef.current) return;

    const hasLivePeer =
      pcRef.current &&
      !["failed", "disconnected", "closed"].includes(
        pcRef.current.connectionState
      ) &&
      !["failed", "disconnected", "closed"].includes(
        pcRef.current.iceConnectionState
      );

    if (hasLivePeer) return;

    if (pcRef.current) {
      cleanUpCall();
    }

    try {
      setStatus(mode === "caller" ? "calling" : "in-call");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

      localStreamRef.current = stream;
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call_ice_candidate", {
            to: otherUser._id,
            candidate: event.candidate,
          });
        }
      };

      if (withOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call_offer", {
          to: otherUser._id,
          offer,
          callType,
        });
      }
    } catch (err) {
      console.error("startPeerConnection error:", err);
      cleanUpCall();
      onClose && onClose();
    }
  };

  /* ============================================================
     MODE CALLER — AUTO START
  ============================================================ */
  useEffect(() => {
    if (visible && mode === "caller") {
      startPeerConnection(true);
    }

    // ⭐ AJOUT : receveur active sa caméra automatiquement
    if (visible && mode === "callee" && !accepted) {
      startPeerConnection(false);
    }

    return () => cleanUpCall();
  }, [visible, mode, otherUser?._id]);

  /* ============================================================
     MODE CALLEE — ACCEPT
  ============================================================ */
  const handleAccept = async () => {
    if (!incomingOffer || !socket || !otherUser?._id) return;

    setAccepted(true);
    setStatus("in-call");

    await startPeerConnection(false);

    try {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(incomingOffer)
      );

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("call_answer", {
        to: otherUser._id,
        answer,
      });
    } catch (err) {
      console.error("Accept error:", err);
      cleanUpCall();
      onClose && onClose();
    }
  };

  /* ============================================================
     CONTROLES LOCAUX (MIC / CAM)
  ============================================================ */
  const toggleMic = () => {
    const enabled = !isMicOn;
    setIsMicOn(enabled);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  };

  const toggleCamera = () => {
    if (!isVideoCall) return;

    const enabled = !isCamOn;
    setIsCamOn(enabled);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  if (!visible || !otherUser) return null;

  const title =
    mode === "caller"
      ? `${callType === "audio" ? "Appel audio" : "Appel vidéo"} avec ${
          otherUser.name
        }`
      : !accepted
      ? `${otherUser.name} vous appelle…`
      : `${callType === "audio" ? "Appel audio" : "Appel vidéo"} avec ${
          otherUser.name
        }`;

  return (
    <div className="vc-overlay">
      <div className="vc-call">
        {/* Vidéo distante en fond plein écran */}
        {isVideoCall ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vc-video-remote"
          />
        ) : (
          <audio
            ref={remoteVideoRef}
            autoPlay
            className="vc-audio-remote"
            controls={false}
          />
        )}

        {/* Barre haute */}
        <div className="vc-top-bar">
          <div className="vc-title">
            <div className="vc-title-name">{title}</div>
            <div className="vc-title-sub">
              {status === "calling" && "Appel en cours…"}
              {status === "in-call" && "Connecté"}
            </div>
          </div>
          <button className="vc-btn-top vc-btn-close" onClick={handleHangup} aria-label="Raccrocher">
            <Icon name="phoneDown" size={18} />
          </button>
        </div>

        {/* Votre vidéo en petit carré */}
        <div className="vc-local-wrapper">
          {isVideoCall ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-local"
            />
          ) : (
            <div className="vc-audio-local">🎧 Vous</div>
          )}
          <div className="vc-local-label">Vous</div>
        </div>

        <div className="vc-bottom-bar">
          <button
            className={`vc-round-btn ${isMicOn ? "" : "vc-btn-off"}`}
            onClick={toggleMic}
            aria-label={isMicOn ? "Couper le micro" : "Réactiver le micro"}
          >
            <Icon name={isMicOn ? "micOn" : "micOff"} />
          </button>
          {isVideoCall && (
            <button
              className={`vc-round-btn ${isCamOn ? "" : "vc-btn-off"}`}
              onClick={toggleCamera}
              aria-label={isCamOn ? "Couper la caméra" : "Réactiver la caméra"}
            >
              <Icon name={isCamOn ? "videoOn" : "videoOff"} />
            </button>
          )}
          <button
            className="vc-round-btn vc-btn-hangup"
            onClick={handleHangup}
            aria-label="Raccrocher"
          >
            <Icon name="phoneDown" />
          </button>
        </div>

        {mode === "callee" && !accepted && (
          <div className="vc-incoming-overlay">
            <div className="vc-incoming-text">
              {callType === "audio" ? "Appel audio" : "Appel vidéo"}
            </div>
            <div className="vc-incoming-actions">
              <button
                className="vc-round-btn vc-btn-hangup"
                onClick={handleHangup}
                aria-label="Refuser l'appel"
              >
                <Icon name="phoneDown" size={26} />
              </button>
              <button
                className="vc-round-btn vc-btn-accept"
                onClick={handleAccept}
                aria-label="Décrocher"
              >
                <Icon name="phone" size={26} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
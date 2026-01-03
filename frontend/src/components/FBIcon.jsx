import { useId } from "react";

export default function FBIcon({ name, size = 26 }) {
  const color = "#ffffff"; // Blanc pur visible comme Facebook
  const uniqueId = useId();
  const blueGradientId = `${uniqueId}-blueGrad`;
  const orangeGradientId = `${uniqueId}-orangeGrad`;
  const relationGradientId = `${uniqueId}-relationGrad`;
  const relationAccentId = `${uniqueId}-relationAccent`;

  switch (name) {

    /* ============================
       HOME — style Facebook Menu (bold)
    ============================ */
    case "home":
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill={color}>
          <path d="M25 12.5L14 4 3 12.5v11a2 2 0 0 0 2 2h6v-7h6v7h6a2 2 0 0 0 2-2z" />
        </svg>
      );

    /* ============================
       FRIENDS — style Facebook (bold)
    ============================ */
    case "friends":
      return (
        <svg width={size} height={size} fill={color} viewBox="0 0 28 28">
          <circle cx="9" cy="11" r="5" />
          <circle cx="19" cy="11" r="5" />
          <path d="M3 25c1-6 5-9 7-9h8c2 0 6 3 7 9H3z" />
        </svg>
      );

    /* ============================
       RELATION — Left menu icon
    ============================ */
    case "relation":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={relationGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id={relationAccentId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <circle cx="7" cy="7" r="3" fill={`url(#${relationGradientId})`} />
          <rect
            x="3.5"
            y="11"
            width="7"
            height="7"
            rx="3.5"
            fill={`url(#${relationGradientId})`}
          />
          <circle cx="17" cy="7" r="3" fill={`url(#${relationGradientId})`} />
          <rect
            x="13.5"
            y="11"
            width="7"
            height="7"
            rx="3.5"
            fill={`url(#${relationGradientId})`}
          />
          <path
            d="M9.5 12 C11 10.5, 13 10.5, 14.5 12"
            stroke={`url(#${relationAccentId})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    /* ============================
       PAGES FEED — Facebook style icon
    ============================ */
    case "pages-feed":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="4" fill="#1DA1F2" />
          <rect x="5" y="5" width="14" height="9" rx="1.5" fill="#EAF4FF" />
          <path
            d="M9.5 12C8.1 12 7 11.1 7 10C7 8.9 8 8 9.2 8C9.6 6.8 10.8 6 12 6C13.6 6 14.9 7.2 15 8.7C16.2 8.9 17 9.8 17 10.8C17 11.6 16.3 12 15.5 12Z"
            fill="#1DA1F2"
          />
          <rect x="6" y="16.5" width="7" height="1.5" rx="0.75" fill="#EAF4FF" />
          <rect x="15" y="16.5" width="3" height="1.5" rx="0.75" fill="#EAF4FF" />
        </svg>
      );

    /* ============================
       MESSAGES — Messenger Bold
    ============================ */
    case "messages":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          viewBox="0 0 28 28"
        >
          <path d="M4 6h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H10l-6 4V8a2 2 0 0 1 2-2z" />
        </svg>
      );

    /* ============================
       NOTIFICATIONS — Bell Bold
    ============================ */
    case "notif":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          viewBox="0 0 28 28"
        >
          <path d="M22 19H6c-1 0-2-1-2-2 2-2 3-5 3-9a7 7 0 0 1 14 0c0 4 1 7 3 9 0 1-1 2-2 2z" />
          <path d="M16 23a3 3 0 0 1-6 0" />
        </svg>
      );

    /* ============================
       JOBS — Facebook Market Bold
    ============================ */
    case "jobs":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`${uniqueId}-bagGrad`}
              x1="3"
              y1="6"
              x2="21"
              y2="20"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient
              id={`${uniqueId}-orangeGrad`}
              x1="8"
              y1="2"
              x2="16"
              y2="8"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>

          <rect
            x="3"
            y="6"
            width="18"
            height="14"
            rx="3"
            fill={`url(#${uniqueId}-bagGrad)`}
            stroke="#F97316"
            strokeWidth="1.2"
          />
          <path
            d="M6 10.2h12c.9 0 1.6.7 1.6 1.6v5.8c0 1.2-1 2.2-2.2 2.2H6.6C5.2 19.8 4 18.6 4 17.2v-5.4c0-.9.7-1.6 1.6-1.6z"
            fill="rgba(255,255,255,0.10)"
            stroke="#F97316"
            strokeWidth="0.9"
          />
          <path
            d="M9 6V5.2C9 4 10 3 11.2 3h1.6C14 3 15 4 15 5.2V6"
            stroke={`url(#${uniqueId}-orangeGrad)`}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="8.2" cy="13" r="1.8" fill="#E0F2FE" stroke="#F97316" strokeWidth="0.8" />
          <path
            d="M7.6 13l.4.4 1-1"
            stroke="#2563EB"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="11.3" y="12.2" width="7" height="1.6" rx="0.8" fill="#F8FAFC" opacity="0.95" />
          <rect x="11.3" y="14.9" width="5.8" height="1.6" rx="0.8" fill="#F8FAFC" opacity="0.95" />
        </svg>
      );

    /* ============================
       PROFILE — Bold Avatar
    ============================ */
    case "profile":
      return (
        <svg width={size} height={size} fill={color} viewBox="0 0 28 28">
          <circle cx="14" cy="9" r="6" />
          <path d="M5 25c1-7 8-9 9-9s8 2 9 9" />
        </svg>
      );

    /* ============================
       PAGES — Bookmark flag icon
    ============================ */
    case "pages":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 128 128"
          role="img"
          aria-label="Bookmark flag icon"
        >
          <defs>
            <linearGradient id={blueGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2EE6FF" />
              <stop offset="100%" stopColor="#0AB3E6" />
            </linearGradient>
            <linearGradient id={orangeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB38A" />
              <stop offset="100%" stopColor="#FF8A4C" />
            </linearGradient>
          </defs>
          <rect
            x="18"
            y="20"
            width="16"
            height="88"
            rx="8"
            fill={`url(#${blueGradientId})`}
          />
          <path
            d="
              M 34 24
              H 92
              C 98 24 102 28 102 34
              V 52
              H 86
              C 82 52 80 54 80 58
              C 80 62 82 64 86 64
              H 102
              V 94
              C 102 100 98 104 92 104
              H 34
              Z
            "
            fill={`url(#${orangeGradientId})`}
          />
        </svg>
      );

    /* ============================
       REELS — Bookmark flag icon
    ============================ */
    case "reels":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          role="img"
          aria-label="Reels icon"
        >
          <defs>
            <linearGradient id={blueGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id={orangeGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="4"
            fill={`url(#${blueGradientId})`}
          />
          <rect
            x="2"
            y="3"
            width="20"
            height="5"
            rx="4"
            fill={`url(#${orangeGradientId})`}
          />
          <rect x="5" y="4.2" width="3" height="1.2" rx="0.6" fill="#FFFFFF" />
          <rect x="9.5" y="4.2" width="3" height="1.2" rx="0.6" fill="#FFFFFF" />
          <rect x="14" y="4.2" width="3" height="1.2" rx="0.6" fill="#FFFFFF" />
          <polygon points="10,9 16,12 10,15" fill="#FFFFFF" />
        </svg>
      );

    /* ============================
       SETTINGS — Boulon complet FB
    ============================ */
    case "settings":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <circle cx="14" cy="14" r="4" fill={color} />
          <path
            d="M4 14l2-2m2-6l1 3m11-3l1 3m2 6l2 2m-4 6l-1-3m-11 3l-1-3m-2-6l-2-2"
            strokeLinecap="round"
          />
        </svg>
      );

    /* ============================
       MENU — Hamburger Bold
    ============================ */
    case "menu":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="3"
          fill="none"
          viewBox="0 0 28 28"
        >
          <path d="M5 8h18" />
          <path d="M5 14h18" />
          <path d="M5 20h18" />
        </svg>
      );

    /* ============================
       SEARCH — Bold FB
    ============================ */
    case "search":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <circle cx="13" cy="13" r="8" />
          <path d="M19 19l6 6" strokeLinecap="round" />
        </svg>
      );

    /* ============================
       LOGOUT — Bold
    ============================ */
    case "logout":
      return (
        <svg
          width={size}
          height={size}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          viewBox="0 0 28 28"
        >
          <path d="M10 26H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h4" />
          <path d="M18 20l6-6-6-6" />
          <path d="M24 14H10" />
        </svg>
      );

    /* ============================
       LIKE — Facebook STYLE (Outline)
    ============================ */
    case "like":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          viewBox="0 0 28 28"
        >
          <path d="M7 25H5a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3h2v14z" />
          <path d="M11 11l2-7c0-.6.4-1 1-1s1 .4 1 1v6h7a3 3 0 0 1 3 3v1l-3 9H11V11z" />
        </svg>
      );

    /* ============================
       COMMENT — Facebook STYLE (Outline)
    ============================ */
    case "comment":
      return (
        <svg
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2"
          viewBox="0 0 28 28"
        >
          <path d="M4 6h20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10l-6 4V8a2 2 0 0 1 2-2z" />
        </svg>
      );

    /* ============================
       SHARE — Facebook STYLE (Outline)
    ============================ */
    case "share":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 5L18 12L10 19V14C6 14 3.5 15.5 2 19C2.5 13 5.5 9 10 8V5Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "ads":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`ads-circle-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id={`ads-megaphone-${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          <circle
            cx="12"
            cy="12"
            r="11.5"
            fill={`url(#ads-circle-${uniqueId})`}
            stroke="#F97316"
            strokeWidth="1.5"
          />
          <path d="M6.4 10.5v3h2.1l3.5 2.8V7.7L8.5 10.5H6.4z" fill={`url(#ads-megaphone-${uniqueId})`} />
          <path
            d="M14.6 9.8c1 1 1 4.4 0 5.4"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M16.8 8.6c1.8 1.8 1.8 6 0 7.8"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <rect x="12.8" y="14.2" width="5.2" height="3.4" rx="1" fill="#22C55E" />
          <text
            x="15.4"
            y="16"
            fill="#FFFFFF"
            fontSize="2.6"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ADS
          </text>
        </svg>
      );
    case "dashboard":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 256 256"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <filter id={`glow-${uniqueId}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.65 0"
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id={`cyan-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#39F3FF" />
              <stop offset="1" stopColor="#00C8FF" />
            </linearGradient>

            <filter id={`inner-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feOffset dx="0" dy="1" />
              <feGaussianBlur stdDeviation="1.2" result="offBlur" />
              <feComposite
                in="offBlur"
                in2="SourceAlpha"
                operator="arithmetic"
                k2="-1"
                k3="1"
                result="innerShadow"
              />
              <feColorMatrix
                in="innerShadow"
                type="matrix"
                values="0 0 0 0 0
                0 0 0 0 0.25
                0 0 0 0 0.35
                0 0 0 0.35 0"
              />
              <feComposite in2="SourceGraphic" operator="over" />
            </filter>
          </defs>

          <g filter={`url(#glow-${uniqueId})`}>
            <rect
              x="28"
              y="152"
              width="44"
              height="76"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="84"
              y="88"
              width="44"
              height="140"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="140"
              y="116"
              width="44"
              height="112"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
            <rect
              x="196"
              y="44"
              width="44"
              height="184"
              rx="14"
              fill={`url(#cyan-${uniqueId})`}
              filter={`url(#inner-${uniqueId})`}
            />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

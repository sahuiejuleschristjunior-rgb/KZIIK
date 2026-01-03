import React from "react";

export const IconPlay = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10-6.86a1 1 0 0 0 0-1.72l-10-6.86A1 1 0 0 0 8 5.14Z" />
  </svg>
);

export const IconPause = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M7 5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Zm7 0a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2Z" />
  </svg>
);

export const IconVolumeOn = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M14.5 3.09a1 1 0 0 1 .5.86v15.1a1 1 0 0 1-1.6.8L8.76 16H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3.76l4.64-3.85a1 1 0 0 1 1.1-.16Zm3.4 2.3a1 1 0 0 1 1.4.13 9 9 0 0 1 0 12.96 1 1 0 0 1-1.54-1.26 7 7 0 0 0 0-10.08 1 1 0 0 1 .14-1.4Z" />
  </svg>
);

export const IconVolumeOff = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M4.21 3.08a1 1 0 0 1 1.41.13l13.86 17.7a1 1 0 0 1-1.55 1.26l-3.18-4.06-2.19 1.81a1 1 0 0 1-1.6-.8v-4.77L8.76 12H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h1.38l-2-2.54a1 1 0 0 1 .17-1.38ZM19 4a1 1 0 0 1 1 1v2.64a1 1 0 0 1-1.78.63L14.5 4.79a1 1 0 0 1 1-.7Z" />
  </svg>
);

export const IconFullscreen = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M4 4a2 2 0 0 1 2-2h3a1 1 0 0 1 0 2H6v3a1 1 0 0 1-2 0Zm14-2a2 2 0 0 1 2 2v3a1 1 0 1 1-2 0V4h-3a1 1 0 1 1 0-2Zm2 16a2 2 0 0 1-2 2h-3a1 1 0 1 1 0-2h3v-3a1 1 0 1 1 2 0Zm-14 2a2 2 0 0 1-2-2v-3a1 1 0 1 1 2 0v3h3a1 1 0 0 1 0 2Z" />
  </svg>
);

export default {
  IconPlay,
  IconPause,
  IconVolumeOn,
  IconVolumeOff,
  IconFullscreen,
};

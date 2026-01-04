import { useEffect } from "react";

const CSS_VAR_NAME = "--messages-viewport-height";

export default function useKeyboardViewport(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const root = document.documentElement;
    const viewport = window.visualViewport;
    let raf = null;

    const updateViewportHeight = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const height = viewport?.height || window.innerHeight;
        root.style.setProperty(CSS_VAR_NAME, `${Math.round(height)}px`);
      });
    };

    updateViewportHeight();

    if (!viewport) {
      return () => {
        if (raf) cancelAnimationFrame(raf);
        root.style.removeProperty(CSS_VAR_NAME);
      };
    }

    viewport.addEventListener("resize", updateViewportHeight);
    viewport.addEventListener("scroll", updateViewportHeight);

    return () => {
      viewport.removeEventListener("resize", updateViewportHeight);
      viewport.removeEventListener("scroll", updateViewportHeight);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty(CSS_VAR_NAME);
    };
  }, [enabled]);
}

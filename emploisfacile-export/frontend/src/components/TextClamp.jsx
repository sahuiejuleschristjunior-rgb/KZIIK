import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export default function TextClamp({ text, className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const textRef = useRef(null);

  const measureOverflow = useCallback(() => {
    const element = textRef.current;
    if (!element) return;
    const hasOverflow = element.scrollHeight > element.clientHeight + 1;
    setShowToggle(hasOverflow);
  }, []);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    if (!text) {
      setShowToggle(false);
      return;
    }
    if (!expanded) {
      measureOverflow();
    }
  }, [expanded, measureOverflow, text]);

  useEffect(() => {
    const handleResize = () => {
      if (!expanded) {
        measureOverflow();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expanded, measureOverflow]);

  if (!text) return null;

  return (
    <div className="text-clamp">
      <div
        ref={textRef}
        className={`clamp-text${expanded ? " expanded" : ""}${
          className ? ` ${className}` : ""
        }`}
      >
        {text}
      </div>
      {showToggle && (
        <button
          type="button"
          className="text-clamp-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      )}
    </div>
  );
}

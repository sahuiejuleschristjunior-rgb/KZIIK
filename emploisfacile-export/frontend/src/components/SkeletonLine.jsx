// src/components/SkeletonLine.jsx
export default function SkeletonLine({ width = "100%", height = "12px", radius = "6px" }) {
  return (
    <div
      className="skeleton-line"
      style={{
        width,
        height,
        borderRadius: radius,
      }}
    />
  );
}
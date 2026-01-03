export default function FeedSkeleton() {
  return (
    <div className="post-skeleton">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="skeleton skeleton-avatar"></div>
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line" style={{ width: "40%" }}></div>
          <div className="skeleton skeleton-line" style={{ width: "60%" }}></div>
        </div>
      </div>

      <div className="skeleton skeleton-img"></div>

      <div className="skeleton skeleton-line" style={{ width: "70%" }}></div>
      <div className="skeleton skeleton-line" style={{ width: "50%" }}></div>
    </div>
  );
}

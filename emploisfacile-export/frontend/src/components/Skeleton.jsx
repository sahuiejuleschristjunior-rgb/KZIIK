// src/components/Skeleton.jsx
export default function Skeleton({
  width = "100%",
  height = "14px",
  radius = "6px",
  style = {}
}) {
  return (
    <div
      className="fb-skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    ></div>
  );
}

/* SKELETON AVATAR */
export function SkeletonAvatar({ size = 40 }) {
  return (
    <div
      className="fb-skeleton"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
      }}
    ></div>
  );
}

/* SKELETON STORY */
export function SkeletonStory() {
  return (
    <div className="fb-skeleton-story">
      <SkeletonAvatar size={60} />
      <Skeleton width="80%" height="10px" style={{ marginTop: "6px" }} />
    </div>
  );
}

/* SKELETON POST */
export function SkeletonPost() {
  return (
    <div className="fb-skeleton-post">
      <div className="fb-skeleton-post-header">
        <SkeletonAvatar size={45} />
        <div className="fb-skeleton-post-header-info">
          <Skeleton width="120px" />
          <Skeleton width="70px" height="10px" style={{ marginTop: "4px" }} />
        </div>
      </div>

      <Skeleton width="100%" height="12px" style={{ marginTop: "12px" }} />
      <Skeleton width="90%" height="12px" style={{ marginTop: "8px" }} />

      <Skeleton
        width="100%"
        height="260px"
        radius="10px"
        style={{ marginTop: "18px" }}
      />
    </div>
  );
}
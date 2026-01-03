// src/components/SkeletonPost.jsx

import SkeletonLine from "./SkeletonLine";

export default function SkeletonPost() {
  return (
    <div className="fb-post fb-skeleton-post">
      {/* HEADER */}
      <div className="fb-post-header">
        <div className="fb-post-avatar skeleton-avatar" />
        <div className="fb-post-user">
          <SkeletonLine width="60%" height="14px" />
          <SkeletonLine width="40%" height="10px" />
        </div>
      </div>

      {/* TEXTE */}
      <div className="fb-post-text">
        <SkeletonLine width="100%" />
        <SkeletonLine width="80%" />
      </div>

      {/* IMAGE */}
      <div className="fb-post-media-wrapper">
        <div className="skeleton-media" />
      </div>

      {/* ACTIONS */}
      <div className="fb-post-actions skeleton-actions">
        <div className="skeleton-btn" />
        <div className="skeleton-btn" />
        <div className="skeleton-btn" />
      </div>

      {/* COMMENTAIRE */}
      <div className="fb-comment-input-row">
        <div className="fb-comment-avatar skeleton-avatar-sm" />
        <div className="fb-comment-input-wrapper">
          <SkeletonLine width="100%" height="12px" />
        </div>
      </div>
    </div>
  );
}
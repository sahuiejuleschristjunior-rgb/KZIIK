import { useState } from "react";
import "../styles/stories.css";

export default function StoriesBar({ stories, onOpen }) {
  return (
    <div className="stories-bar">
      {stories.map((story, index) => (
        <div
          key={story.id}
          className="story-item"
          onClick={() => onOpen(index)}
        >
          <img src={story.avatar} className="story-avatar" loading="lazy" />
          <p className="story-name">{story.name}</p>
        </div>
      ))}
    </div>
  );
}
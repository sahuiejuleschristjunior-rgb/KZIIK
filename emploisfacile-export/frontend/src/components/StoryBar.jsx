import "../styles/stories.css";
export default function StoryBar({ stories }) {
  return (
    <div className="story-bar">
      {stories.map((item) => (
        <div key={item.id} className="story-item">
          <div className="story-avatar-wrapper">
            <img src={item.avatar} className="story-avatar" alt="" loading="lazy" />
          </div>
          <span className="story-name">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
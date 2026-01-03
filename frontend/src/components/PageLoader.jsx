import "../styles/skeleton.css";

export default function PageLoader() {
  return (
    <div className="loader-wrapper">
      <div className="skeleton loader-line" style={{ width: "75%" }}></div>
      <div className="skeleton loader-line" style={{ width: "55%" }}></div>
      <div className="skeleton loader-line" style={{ width: "90%" }}></div>
      <div className="skeleton loader-line" style={{ width: "65%" }}></div>
      <div className="skeleton loader-btn"></div>
    </div>
  );
}

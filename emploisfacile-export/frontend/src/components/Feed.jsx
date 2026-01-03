import { useEffect, useState } from "react";
import Post from "./Post";
import PageLoader from "./PageLoader"; // ton loader existant
import { filterHiddenPosts, rememberHiddenPost } from "../utils/hiddenPosts";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  async function loadPosts() {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + "/posts", {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const data = await res.json();
      setPosts(filterHiddenPosts(data, currentUser?._id));
    } catch (err) {
      console.error("FEED LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleHidePost = (postId) => {
    rememberHiddenPost(postId, currentUser?._id);
    setPosts((prev) => filterHiddenPosts(prev, currentUser?._id));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      {posts.length === 0 && (
        <div style={{ padding: 20, color: "white", textAlign: "center" }}>
          Aucun post disponible.
        </div>
      )}

      {posts.map((post) => (
        <Post key={post._id} post={post} refresh={loadPosts} onHidePost={handleHidePost} />
      ))}
    </div>
  );
}

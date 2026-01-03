import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function sharePost(postId, text = "") {
  const res = await fetch(`${API_URL}/posts/${postId}/share`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error("Erreur lors du partage de la publication");
  }

  return res.json();
}

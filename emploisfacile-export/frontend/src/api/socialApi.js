// src/api/socialApi.js
import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

/* ======================================================
   🔥 1) RELATION STATUS
====================================================== */
export async function fetchRelationStatus(targetId) {
  const res = await fetch(`${API_URL}/social/status/${targetId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Erreur status relation");
  return res.json();
}

/* ======================================================
   🔥 2) FRIEND REQUESTS
====================================================== */
export async function sendFriendRequest(targetId) {
  const res = await fetch(`${API_URL}/social/friends/request/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function acceptFriendRequest(targetId) {
  const res = await fetch(`${API_URL}/social/friends/accept/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function rejectFriendRequest(targetId) {
  const res = await fetch(`${API_URL}/social/friends/reject/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function cancelFriendRequest(targetId) {
  const res = await fetch(`${API_URL}/social/friends/cancel/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function removeFriend(targetId) {
  const res = await fetch(`${API_URL}/social/friends/remove/${targetId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return res.json();
}

/* ======================================================
   🔥 3) FOLLOW
====================================================== */
export async function followUser(targetId) {
  const res = await fetch(`${API_URL}/social/follow/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function unfollowUser(targetId) {
  const res = await fetch(`${API_URL}/social/unfollow/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

/* ======================================================
   🔥 4) BLOCK / UNBLOCK
====================================================== */
export async function blockUser(targetId) {
  const res = await fetch(`${API_URL}/social/block/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function unblockUser(targetId) {
  const res = await fetch(`${API_URL}/social/unblock/${targetId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return res.json();
}

/* ======================================================
   🔥 5) FRIENDS LIST
====================================================== */
export async function fetchFriends() {
  const res = await fetch(`${API_URL}/social/friends`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erreur récupération amis");
  }

  const data = await res.json();
  return data.friends || [];
}

/* ======================================================
   🔥 6) CHANGE FRIEND CATEGORY
====================================================== */
export async function changeFriendCategory(friendId, category) {
  const res = await fetch(
    `${API_URL}/social/friends/category/${friendId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ category }),
    }
  );

  return res.json();
}

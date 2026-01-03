import { API_URL } from "./config";

const AUTH_ERROR_MESSAGE = "Impossible de charger vos conversations";

function getToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
}

export async function fetchMessageRequests() {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/requests`, {
    headers: getAuthHeaders(token),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }
  return data?.data || [];
}

export async function fetchInbox() {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/inbox`, {
    headers: getAuthHeaders(token),
  });

  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  return data;
}

export async function sendMessageRequest(toUser, message) {
  const token = getToken();
  if (!token) {
    throw new Error("Vous devez être connecté pour envoyer un message.");
  }

  const res = await fetch(`${API_URL}/messages/request`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ toUser, message }),
  });
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || "Impossible d'envoyer la demande."
    );
  }

  return data;
}

export async function acceptMessageRequest(id) {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/request/${id}/accept`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || "Impossible d'accepter la demande."
    );
  }

  return data;
}

export async function declineMessageRequest(id) {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/request/${id}/reject`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de refuser la demande.");
  }

  return data;
}

export async function blockMessageRequest(id) {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/request/${id}/block`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de bloquer l'utilisateur.");
  }

  return data;
}

export async function sendMessagePayload(payload) {
  const token = getToken();
  if (!token) {
    throw new Error("Vous devez être connecté pour envoyer un message.");
  }

  const res = await fetch(`${API_URL}/messages/send`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  return { ok: res.ok, data };
}

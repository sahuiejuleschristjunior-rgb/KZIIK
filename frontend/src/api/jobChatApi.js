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

function getStoredUserId() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser)?._id || null;
  } catch (err) {
    return null;
  }
}

function unwrapPayload(data) {
  if (!data) return null;
  return data.data || data.conversation || data.conversations || data;
}

export async function fetchJobChatConversations() {
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

  const list = unwrapPayload(data);
  return Array.isArray(list) ? list : [];
}

export async function fetchJobConversation(conversationId) {
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

  const list = Array.isArray(data) ? data : data?.data || [];
  const currentUserId = getStoredUserId();
  const match =
    list.find((conv) => String(conv?._id) === String(conversationId)) ||
    list.find((conv) =>
      Array.isArray(conv?.participants)
        ? conv.participants.some((p) => String(p?._id || p) === String(conversationId)) &&
          (!currentUserId ||
            conv.participants.some((p) => String(p?._id || p) === String(currentUserId)))
        : false
    );

  return match || null;
}

export async function createJobConversation({ participants, jobId }) {
  const token = getToken();
  if (!token) {
    throw new Error("Vous devez être connecté pour accéder à vos conversations.");
  }

  const res = await fetch(`${API_URL}/messages/inbox`, {
    headers: getAuthHeaders(token),
  });

  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const list = Array.isArray(data) ? data : data?.data || [];
  const participantIds = (participants || []).map((p) => String(p?._id || p));
  const existing = list.find((conv) =>
    Array.isArray(conv?.participants)
      ? participantIds.every((id) =>
          conv.participants.some((p) => String(p?._id || p) === id)
        )
      : false
  );

  if (existing) return existing;

  const currentUserId = getStoredUserId();
  const otherParticipant =
    participantIds.find((id) => id && id !== String(currentUserId)) ||
    participantIds[0] ||
    null;

  if (!otherParticipant) {
    throw new Error("Impossible de créer la conversation.");
  }

  return {
    _id: otherParticipant,
    participants: participants || [],
    jobId,
    __placeholder: true,
  };
}

export async function fetchConversationMessages(conversationId) {
  const token = getToken();
  if (!token) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  const res = await fetch(`${API_URL}/messages/conversation/${conversationId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data?.messages)) return data.data.messages;
  return [];
}

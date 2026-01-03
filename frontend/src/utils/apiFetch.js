const isBrowser = typeof window !== "undefined";

const isValidJwt = (token) => typeof token === "string" && token.split(".").length === 3;

const getAuthToken = () => {
  if (!isBrowser) return null;
  const token = localStorage.getItem("token");
  return isValidJwt(token) ? token : null;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
};

export default async function apiFetch(url, options = {}) {
  const { headers = {}, body, ...rest } = options;
  const token = getAuthToken();
  const finalHeaders = new Headers(headers);
  let finalBody = body;

  if (body instanceof FormData) {
    // Let the browser set the appropriate multipart boundary
  } else if (body && typeof body === "object") {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new Error("Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { isValidJwt, getAuthToken };

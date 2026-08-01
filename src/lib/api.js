// Change this if your backend URL is ever different.
export const API_BASE = "https://bi-community-backend.onrender.com";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export function getTokens() {
  return {
    access: localStorage.getItem("setu_access"),
    refresh: localStorage.getItem("setu_refresh"),
  };
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("setu_access", access);
  if (refresh) localStorage.setItem("setu_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("setu_access");
  localStorage.removeItem("setu_refresh");
}

function summarizeError(data) {
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const parts = [];
  for (const key in data) {
    const val = Array.isArray(data[key]) ? data[key].join(" ") : data[key];
    parts.push(`${key}: ${val}`);
  }
  return parts.join(" | ") || "Something went wrong.";
}

async function tryRefresh() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(API_BASE + "/api/users/login/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    setTokens(data.access, null);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function api(path, { method = "GET", body, auth = true, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const { access } = getTokens();
    if (access) headers["Authorization"] = "Bearer " + access;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return api(path, { method, body, auth, retry: false });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty body, that's fine for some endpoints (e.g. DELETE)
  }

  if (!res.ok) {
    const message = data ? summarizeError(data) : `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

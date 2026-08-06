// BUG FIX: this was hardcoded to the production Render URL, so running
// `npm run dev` locally always hit the live backend — there was no way to
// point the frontend at `python manage.py runserver` on localhost without
// editing this file (and risking committing that edit). Vite exposes any
// `VITE_`-prefixed variable from a local `.env`/`.env.local` file via
// `import.meta.env`, so set VITE_API_BASE=http://127.0.0.1:8000 in a
// (gitignored) `.env.local` for local dev; production keeps working with
// no env file at all, since it falls back to the same URL as before.
export const API_BASE = import.meta.env.VITE_API_BASE || "https://bi-community-backend.onrender.com";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

// Auth tokens live in httpOnly cookies set by the backend (see
// users/views.py) — the browser attaches them automatically on every
// request to API_BASE as long as `credentials: "include"` is set below.
// This file never reads or stores a raw token, so JS on this page (and
// therefore any XSS payload) has nothing to steal.

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
  try {
    const res = await fetch(API_BASE + "/api/users/login/refresh/", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function api(path, { method = "GET", body, retry = true } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    credentials: "include", // send/receive the httpOnly auth cookies
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return api(path, { method, body, retry: false });
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

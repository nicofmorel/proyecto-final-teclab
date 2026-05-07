/**
 * api.js — Base fetch wrapper with auth header and error handling
 */

const API_BASE = 'http://localhost:8080/api';

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Core fetch wrapper.
 * - Attaches Authorization: Bearer header
 * - Sets Content-Type: application/json unless body is FormData
 * - On 401/403 clears storage and redirects to login
 * @param {string} path  - API path (e.g. '/medicos')
 * @param {object} options - fetch options
 * @returns {Response|undefined}
 */
async function apiFetch(path, options = {}) {
  const headers = {
    'Authorization': `Bearer ${getToken()}`,
    ...options.headers,
  };

  // Do NOT set Content-Type for FormData — browser sets it with the boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(API_BASE + path, { ...options, headers });
  } catch (err) {
    // Network error
    throw new Error('No se pudo conectar al servidor. Verifique su conexión.');
  }

  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    window.location.href = getLoginPath();
    return;
  }

  return response;
}

/**
 * Determine the correct path to index.html relative to the current page.
 */
function getLoginPath() {
  return /\/(admin|medico)\/[^/]+$/.test(window.location.pathname)
    ? '../index.html'
    : 'index.html';
}

/**
 * Convenience: GET, expect JSON
 */
async function apiGet(path) {
  const res = await apiFetch(path);
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Convenience: POST JSON
 */
async function apiPost(path, data) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  // Some endpoints return 201 with body, some 200
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Convenience: POST FormData (multipart)
 */
async function apiPostForm(path, formData) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: formData,
  });
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Convenience: PUT JSON
 */
async function apiPut(path, data) {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Convenience: PUT FormData (multipart)
 */
async function apiPutForm(path, formData) {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: formData,
  });
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Convenience: DELETE
 */
async function apiDelete(path) {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  return true;
}

/**
 * Convenience: GET raw response (for file downloads)
 */
async function apiGetRaw(path) {
  const res = await apiFetch(path);
  if (!res) return null;
  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }
  return res;
}

/**
 * Extracts a human-readable error message from a failed response.
 */
async function safeErrorMessage(res) {
  try {
    const data = await res.json();
    return data.message || data.error || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}: ${res.statusText}`;
  }
}

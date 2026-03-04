/**
 * Generic fetch wrapper for JSON API calls.
 *
 * Replaces the old `apiRequest()` function from frontend.js.
 *
 * @param {string} endpoint - API path, e.g. "/api/v1/users"
 * @param {object} options  - fetch options override
 * @returns {Promise<object>} Parsed JSON response with { ok, status, ...body }
 */
export async function apiRequest(endpoint, { method = 'GET', body, headers = {} } = {}) {
  const opts = { method, headers: { ...headers }, credentials: 'include' };

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, opts);

  const contentType = response.headers.get('Content-Type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Normalise into a predictable shape
  const result = typeof data === 'object'
    ? { ok: response.ok, status: response.status, ...data }
    : { ok: response.ok, status: response.status, data };

  return result;
}

/**
 * Multipart upload helper (for files).
 *
 * Replaces the old `apiRequestMultipart()` from frontend.js.
 *
 * @param {string} endpoint
 * @param {FormData} formData
 * @returns {Promise<object>}
 */
export async function apiRequestMultipart(endpoint, formData) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const contentType = response.headers.get('Content-Type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return typeof data === 'object'
    ? { ok: response.ok, status: response.status, ...data }
    : { ok: response.ok, status: response.status, data };
}

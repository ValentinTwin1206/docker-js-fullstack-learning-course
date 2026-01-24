/**
 * Helper to show a Bootstrap toast message dynamically.
 * @param {string} message - Message to display inside the toast body.
 * @param {number} statusCode - HTTP status code to display.
 * @param {"success"|"error"} type - Determines toast styling.
 */
function showToast(message, statusCode, success = true) {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "position-fixed bottom-0 end-0 p-3";
    toastContainer.style.zIndex = 1100;
    document.body.appendChild(toastContainer);
  }

  const bgClass = success ? "text-bg-success" : "text-bg-danger";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${statusCode}: ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 2000 });
  toast.show();

  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

/**
 * Helper to show a Bootstrap toast message dynamically.
 * @param {string} endpoint - REST Api endpoint.
 * @param {string} method - HTTP method.
 * @param {object} body - Request body object.
 * @param {string} contentType - HTTP content type
 * @param {boolean} hideToast - Either to display a toast message or not.
 */
function apiRequest(endpoint, method, body, contentType = "application/json", hideToast = false) {
  return new Promise((resolve, reject) => {
    const options = { method, headers: {} };

    if (body) {
      if (contentType === null) {
        options.body = body; // FormData or raw
      } else {
        options.headers["Content-Type"] = contentType;
        options.body = JSON.stringify(body);
      }
    }

    fetch(endpoint, options)
      .then(async response => {
        const respContentType = response.headers.get("Content-Type") || "";
        let rawResult;

        if (respContentType.includes("application/json")) {
          rawResult = await response.json();
        } else if (respContentType.startsWith("text/") || respContentType === "application/javascript") {
          rawResult = await response.text();
        } else {
          rawResult = await response.blob();
        }

        const result = (typeof rawResult === "object" && !(rawResult instanceof Blob))
          ? { ok: response.ok, status: response.status, redirected: response.redirected, url: response.url, ...rawResult }
          : { ok: response.ok, status: response.status, redirected: response.redirected, url: response.url, data: rawResult };

        // Show toast if allowed
        if (!hideToast && typeof rawResult === "object" && rawResult.message) {
          showToast(rawResult.message, rawResult.statusCode, result.ok);
        }

        // If success -> reload after 1 second
        if (result.ok && !hideToast)
          setTimeout(() => window.location.reload(), 1000);

        resolve(result);
      })
      .catch(error => {
        console.error(`[apiRequest] Error calling ${endpoint}:`, error);
        reject({
          ok: false,
          success: false,
          status: 0,
          error: error.message || "Network error",
        });
      });
  });
}

/**
 * API request for file uploads using multipart/form-data.
 *
 * @param {string} endpoint - API endpoint.
 * @param {string} method - HTTP method (usually "POST" or "PATCH").
 * @param {FormData} formData - FormData object containing files and fields.
 * @param {boolean} [hideToast=true] - Suppress toast if true.
 */
function apiRequestMultipart(endpoint, method, formData, hideToast = false) {
  return new Promise((resolve, reject) => {
    const options = { method, body: formData }; // DO NOT set Content-Type manually

    console.log(`[apiRequestMultipart] Calling ${endpoint}`);
    console.log('[apiRequestMultipart] FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    fetch(endpoint, options)
      .then(async response => {
        const contentType = response.headers.get("Content-Type") || "";
        let rawResult;

        if (contentType.includes("application/json"))
          rawResult = await response.json();
        else
          rawResult = await response.text();

        console.log("[apiRequestMultipart] Response body:", rawResult);

        const result = typeof rawResult === "object"
          ? { ok: response.ok, status: response.status, redirected: response.redirected, url: response.url, ...rawResult }
          : { ok: response.ok, status: response.status, redirected: response.redirected, url: response.url, data: rawResult };

        if (!hideToast && "message" in result)
          showToast(result.message, result.statusCode || result.status, result.success ? "success" : "error");

        resolve(result);
      })
      .catch(error => {
        console.error(`[apiRequestMultipart] Error calling ${endpoint}:`, error);
        const errRes = { ok: false, success: false, status: 0, error: error.message || "Network error" };

        if (!hideToast)
          showToast(errRes.error, 0, "error");

        reject(errRes);
      });
  });
};

function b64toBlob(base64, type) {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) 
    buffer[i] = binary.charCodeAt(i);
  return new Blob([buffer], { type });
};

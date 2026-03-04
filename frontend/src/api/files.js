import { apiRequest, apiRequestMultipart } from './client';

/**
 * GET /api/v1/file — paginated files for the current user.
 */
export async function getFilesPaginated({ username, page = 1, limit = 10, search = '' }) {
  const params = new URLSearchParams({ username, page, limit });
  if (search.length >= 2) params.append('search', search);
  return apiRequest(`/api/v1/file?${params.toString()}`);
}

/**
 * POST /api/v1/files — upload a file (multipart).
 */
export async function uploadFile(username, file) {
  const formData = new FormData();
  formData.append('uploadedBy', username);
  formData.append('file', file);
  return apiRequestMultipart('/api/v1/files', formData);
}

/**
 * DELETE /api/v1/files/:id
 */
export async function deleteFile(id) {
  return apiRequest(`/api/v1/files/${id}`, { method: 'DELETE' });
}

/**
 * GET /api/v1/files/:id — raw file content (returns fetch Response).
 * We return the raw response so the caller can handle content-type.
 */
export async function getFileRaw(id) {
  const response = await fetch(`/api/v1/files/${id}`, { credentials: 'include' });
  return response;
}

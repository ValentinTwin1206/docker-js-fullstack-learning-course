import { apiRequest } from './client';

/**
 * GET /api/v1/apikeys/:username — list all API keys for a user.
 */
export async function getApiKeys(username) {
  return apiRequest(`/api/v1/apikeys/${username}`);
}

/**
 * POST /api/v1/apikeys — create a new API key.
 */
export async function createApiKey(username, tokenName) {
  return apiRequest('/api/v1/apikeys', {
    method: 'POST',
    body: { username, tokenName },
  });
}

/**
 * DELETE /api/v1/apikeys/:username/:tokenName — revoke an API key.
 */
export async function deleteApiKey(username, tokenName) {
  return apiRequest(`/api/v1/apikeys/${username}/${tokenName}`, {
    method: 'DELETE',
  });
}

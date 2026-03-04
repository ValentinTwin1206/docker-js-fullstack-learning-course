import { apiRequest } from './client';

/**
 * GET /api/v1/users/:username — get user details.
 */
export async function getUser(username) {
  return apiRequest(`/api/v1/users/${username}`);
}

/**
 * PATCH /api/v1/users/:username — update user profile.
 */
export async function updateUser(username, { firstname, lastname, email }) {
  return apiRequest(`/api/v1/users/${username}`, {
    method: 'PATCH',
    body: { firstname, lastname, email },
  });
}

/**
 * GET /api/v1/user?page=&limit=&username= — paginated user list (admin).
 */
export async function getUsersPaginated({ page = 1, limit = 10, username = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (username && username.length >= 3) params.append('username', username);
  return apiRequest(`/api/v1/user?${params.toString()}`);
}

/**
 * DELETE /api/v1/users/:username — delete a user (sysadmin).
 */
export async function deleteUser(username) {
  return apiRequest(`/api/v1/users/${username}`, { method: 'DELETE' });
}

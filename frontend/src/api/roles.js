import { apiRequest } from './client';

/**
 * PATCH /api/v1/roles/:username — toggle user role (admin ↔ user).
 */
export async function updateUserRole(username, role) {
  return apiRequest(`/api/v1/roles/${username}`, {
    method: 'PATCH',
    body: { role },
  });
}

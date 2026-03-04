import { apiRequest } from './client';

/**
 * POST /api/v1/auth/login — authenticate with username + password.
 * Creates a server-side session (cookie).
 */
export async function login(username, password) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

/**
 * GET /api/v1/auth/logout — destroy the session.
 */
export async function logout() {
  return apiRequest('/api/v1/auth/logout');
}

/**
 * GET /api/v1/auth/me — returns the current session user or 401.
 */
export async function getMe() {
  return apiRequest('/api/v1/auth/me');
}

/**
 * POST /api/v1/users — public registration (no auth required).
 */
export async function register({ firstname, lastname, email, password }) {
  return apiRequest('/api/v1/users', {
    method: 'POST',
    body: { firstname, lastname, email, password },
  });
}

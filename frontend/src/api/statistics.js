import { apiRequest } from './client';

/**
 * GET /api/v1/statistics/churn?days=30&includeSummary=true — user growth data.
 */
export async function getUserGrowth({ days = 30, includeSummary = true } = {}) {
  const params = new URLSearchParams({ days, includeSummary });
  return apiRequest(`/api/v1/statistics/churn?${params.toString()}`);
}

/**
 * GET /api/v1/statistics/traffic?days=30&includeSummary=true — API traffic data.
 */
export async function getApiStatistics({ days = 30, includeSummary = true } = {}) {
  const params = new URLSearchParams({ days, includeSummary });
  return apiRequest(`/api/v1/statistics/traffic?${params.toString()}`);
}

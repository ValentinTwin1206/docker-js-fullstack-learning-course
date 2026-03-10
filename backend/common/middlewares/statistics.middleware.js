import { 
    app 
} from "../../config/index.js";
import { 
    updateUsersGrowth
} from "../../modules/usergrowths/usergrowths.services.js";
import {
    updateApiStatistics
} from "../../modules/apistatistics/apistatistics.services.js";
import { StatusCodes } from "http-status-codes";


/**
 * Unified Hook to track user-growth statistics.
 * 
 * This hook monitors user registration and deletion events to maintain
 * historical user growth statistics. It is triggered onResponse to ensure
 * we only count successful operations (201 for registrations, 200 for deletions).
 * 
 * The hook asynchronously updates the user growth metrics without blocking
 * the response to the client. Any errors during tracking are logged but do
 * not affect the primary request flow.
 * 
 * @param {Object} request - Fastify request object containing method and URL
 * @param {Object} reply - Fastify reply object containing statusCode
 * @returns {Promise<void>}
 * 
 * @example
 * // Used as onSend hook in route definition:
 * app.post('/api/v1/users', {
 *   onSend: [growthTrackingHook],
 *   handler: createUserController
 * });
 */
export const growthTrackingHook = async (request, reply) => {
  const { method, url } = request;
  const { statusCode } = reply;

  app.log.info(`Entering user-growth hook with '${method} ${url} -> ${statusCode}'`);

  // new registration
  if (method === 'POST' && statusCode === StatusCodes.CREATED) {
    app.log.debug(`Trying to track registration event`);
    updateUsersGrowth('registration').catch(err => {
        app.log.warn('Could not update user-growth')
        app.log.error(err.message)
    });
    app.influx.writeUserGrowth('registration');
    app.log.info("Successfully updated user growth for 'registration' event")
    return;
  }

  // new removal
  if (method === 'DELETE' && statusCode === StatusCodes.OK) {
    app.log.debug(`Trying to track deletion event`);
    updateUsersGrowth('deletion').catch(err => {
        app.log.warn('Could not update user-growth')
        app.log.error(err.message)
    });
    app.influx.writeUserGrowth('deletion');
    app.log.info("Successfully updated user growth for 'deletion' event")
    return;
  }
};


/**
 * Global hook to track API statistics.
 * Records request count, latency, routes, and status codes for analytics.
 * Triggered onResponse to capture complete request lifecycle.
 */
export const apiTrafficTrackingHook = async (request, reply) => {
  const { method, url } = request;
  const statusCode = reply.statusCode;
  
  // Calculate latency (response time)
  const latency = reply.getResponseTime ? reply.getResponseTime() : 
                  (Date.now() - request.startTime);

  // Skip tracking for healthcheck and static assets
  if (url === '/healthcheck' || url.startsWith('/public/') || url.startsWith('/static/'))
    return;

  try {
    // Normalize route path (remove query params and IDs)
    const normalizedPath = url.split('?')[0]
      .replace(/\/[0-9a-f]{24}/gi, '/:id') // MongoDB ObjectIDs
      .replace(/\/[a-zA-Z0-9_-]+@/gi, '/:username@') // Usernames with @
      .replace(/\/[a-zA-Z0-9_-]{6,}/gi, '/:param'); // Other dynamic params

    await updateApiStatistics({
      path: normalizedPath,
      method,
      statusCode,
      latency
    });

    try {
      app.influx.writeApiRequest({
        path: normalizedPath,
        method,
        statusCode,
        latency
      });
    } catch (influxErr) {
      app.log.warn('[InfluxDB] Could not queue api_requests point');
      app.log.error(influxErr.message);
    }

    app.log.debug(`Tracked API request: ${method} ${normalizedPath} - ${statusCode} (${latency}ms)`);
  } catch (err) {
    app.log.warn('Could not update API statistics');
    app.log.error(err.message);
  }
};
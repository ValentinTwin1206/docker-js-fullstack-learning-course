import { 
    app 
} from '../../config/index.js';

import { 
    buildCacheKey 
} from "../utils/utils.js";

export const addToCacheMiddleware = async (req, reply) => {
  const redis = req.server.redis;
  const key = buildCacheKey(req.routeOptions.url, req.query);

  try {
    const cached = await redis.get(key);
    if (cached) {
      app.log.info(`Found '${key}' in cache`);
      return reply.code(200).send(JSON.parse(cached));
    }

    const originalSend = reply.send.bind(reply);
    reply.send = async payload => {
      if (payload?.success) {
        await redis.set(key, JSON.stringify(payload), "EX", 60);
        app.log.info(`Stored entry for '${key}' in cache`);
      }
      return originalSend(payload);
    };
  } catch (err) {
    app.log.error(`Failed to add to cache: ${err.message}`);
  }
};

export const cleanCacheMiddleware = async (req, reply) => {
  try {
    app.log.info("Starting cache invalidation process");
    
    if (![200, 201, 204].includes(reply.statusCode)) {
      app.log.debug("Skipping cache invalidation")
      return;
    }
    
    // get user from request
    const username = req.user.username;
    app.log.debug(`Found '${req.user.username}' from request`);
    if (!username) {
      app.log.warn("No username found, skipping cache invalidation");
      return;
    }

    const redis = req.server.redis;

    // Keys to invalidate: file list + single file(s) for that user
    const patterns = [
      `cache:/api/v1/files:*username=${username}*`,
      `cache:/api/v1/file:*username=${username}*`,
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length) {
        for (const key of keys) {
          await redis.del(key);
          app.log.info(`Deleted entry for '${key}' from cache`);
        }
      } else {
        app.log.debug(`No keys matching '${pattern}'`);
      }
    }
  } catch (err) {
    app.log.error("Failed to invalidate cache");
    app.log.error(err.message);
  }
};
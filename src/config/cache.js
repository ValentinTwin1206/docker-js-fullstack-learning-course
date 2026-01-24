// setup.cache.js
import fastifyRedis   from "@fastify/redis";

// constants
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function setupCache(app) {

  app.log.info(`Initializing Redis connection to '${REDIS_URL}'`);

  // Register Redis with Fastify
  await app.register(fastifyRedis, {
    url: REDIS_URL,
  });

  app.log.info(`Connected to Redis at '${REDIS_URL}'`);

  // Utility to delete keys by pattern
  app.redis.delPattern = async pattern => {
    try {
      const keys = await app.redis.keys(pattern);
      if (!keys.length) {
        app.log.debug(`No keys matched pattern '${pattern}'`);
        return;
      }
      await app.redis.del(keys);
      app.log.info(`Deleted '${keys.length}' key(s) matching '${pattern}' from cache`);
    } catch (err) {
      app.log.error({ err }, `Failed to delete keys with pattern '${pattern}'`);
    }
  };

};
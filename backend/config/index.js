import handlebars         from 'handlebars';
import Fastify            from 'fastify';
import cookie             from "@fastify/cookie";
import fastifySession     from "@fastify/session";
import FastifyStatic      from '@fastify/static';
import FastifyView        from '@fastify/view';
import formbody           from '@fastify/formbody';
import multipart          from '@fastify/multipart';

import path               from 'path';
import fs                 from 'fs';
import { fileURLToPath }  from 'url';

// own modules
import AppRoutes          from '../routes/app.routes.js';
import { 
  setupCache 
}     from './cache.js';
import { 
  setupDatabase 
}  from './database.js';
import { 
  setupInflux 
}   from './influx.js';
import { 
  handleErrors 
}   from '../common/middlewares/errorHandling.middleware.js';
import {
  apiTrafficTrackingHook
} from '../common/middlewares/statistics.middleware.js';


// constants
const __DIRNAME         = path.dirname(fileURLToPath(import.meta.url));
const APIKEY_JWT_SECRET = process.env.APIKEY_JWT_SECRET;
const COOKIE_SECRET     = process.env.COOKIE_SECRET;
const PORT              = process.env.SERVER_PORT || 3000;
const HOST              = '0.0.0.0'

export const api_key_secret = new TextEncoder().encode(APIKEY_JWT_SECRET);

// Configure Fastify server
export const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  },
});

// ------------------------
// Setup Database
// ------------------------
try {
  app.log.info('Trying to setup database.')
  await setupDatabase(app)
} catch (err) {
  app.log.error('Failed to setup database');
  app.log.error(err.message);
  process.exit(1);
}

// ------------------------
// Setup Cache
// ------------------------
try {
  app.log.info('Trying to setup cache.');
  await setupCache(app);
  app.log.debug('Cache setup completed successfully.');
} catch (err) {
  app.log.error("Failed to setup cache");
  app.log.error(err.message);
  process.exit(1);
}

// ------------------------
// Setup InfluxDB
// ------------------------
try {
  app.log.info('Trying to setup InfluxDB.');
  await setupInflux(app);
} catch (err) {
  app.log.error('Failed to setup InfluxDB');
  app.log.error(err.message);
  process.exit(1);
}

// ------------------------
// Register Fastify Plugins
// ------------------------
try {
  app.register(FastifyStatic, {
    root: path.join(__DIRNAME, '..', 'public'),
    prefix: '/public',
  });

  app.register(formbody);

  app.register(FastifyView, {
    engine: { handlebars },
    root: path.join(__DIRNAME, '..', 'views'),
    layout: 'layouts/layout.hbs',
    includeViewExtension: true,
    viewExt: 'hbs',
  });

  // Register partials
  const partialsDir = path.join(__DIRNAME, '..', 'views', 'partials');
  if (fs.existsSync(partialsDir)) {
    fs.readdirSync(partialsDir).forEach((filename) => {
      const match = /^(.+)\.hbs$/.exec(filename);
      if (!match) return;
      const name = match[1];
      const template = fs.readFileSync(path.join(partialsDir, filename), "utf8");
      handlebars.registerPartial(name, template);
    });
  }

  app.register(multipart, {
    addToBody: false,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  // ------------------------
  // Wire Up Session and Cookies
  // ------------------------
  if (!COOKIE_SECRET || COOKIE_SECRET.length < 32)
    throw new Error("COOKIE_SECRET must be at least 32 characters long.");

  app.register(cookie, {
    secret: COOKIE_SECRET,
    parseOptions: {},
  });

  // Register session handling
  app.register(fastifySession, {
    secret: COOKIE_SECRET.repeat(2),
    cookie: { 
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.IS_PROD === 'true'
    },
    saveUninitialized: false,
    rolling: true,
  });

} catch (err) {
  app.log.error("Failed to register Fastify plugins");
  app.log.error(err.message);
  process.exit(1);
}

// ------------------------
// Register App Hooks
// ------------------------
app.addHook('onRequest', (request, reply, done) => {
  request.raw._startTime = Date.now();
  done();
});

// Additionally logging
app.addHook('onResponse', (request, reply, done) => {
  const { method, url } = request;
  const status = reply.statusCode;
  const responseTime = Date.now() - request.raw._startTime;
  app.log.info(`${method} ${url} -> ${status} (${responseTime}ms)`);
  done();
});

// Track API statistics for analytics
app.addHook('onResponse', apiTrafficTrackingHook);

// Graceful shutdown
app.addHook("onClose", async (instance, done) => {
  try {
    app.log.info("Closing Redis connection...");
    await app.redis.quit();
    app.log.info("Redis connection closed.");
  } catch (err) {
    app.log.error("Error closing Redis connection");
    app.log.error(err.message);
  }
  done();
});

// ------------------------
// Wire up Routes
// ------------------------
try {
  app.log.info("Trying to wire up routes.")
  app.register(AppRoutes);
}
catch (err) {
  app.log.error("Failed to register application routes");
  app.log.error(err.message);
  process.exit(1);
}

// ------------------------
// Error Handling
// ------------------------
app.setErrorHandler(handleErrors);

// ------------------------
// Start Server
// ------------------------
const start = async () => {
  try {
    await app.listen({
      port: Number(PORT),
      host: HOST,
    });
    app.log.info(`Server running on port ${PORT}`);
  } catch (err) {
    app.log.error('Server startup failed');
    app.log.error(err.message);
    process.exit(1);
  }
};

// ------------------------
// Global Unhandled Error Logging
// ------------------------
process.on('unhandledRejection', (reason, promise) => {
  app.log.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', err => {
  app.log.error("Received an 'Uncaught Exception'");
  app.log.error(err.message);
  process.exit(1);
});

// Start server
start();

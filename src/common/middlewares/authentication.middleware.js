import { 
  jwtVerify
} from "jose";
// own imports
import { 
  app, 
  api_key_secret 
} from '../../config/index.js';
import { 
  getUser 
} from '../../modules/users/users.services.js';
import { 
  ForbiddenError,
  NotFoundError,
  UnauthorizedError 
} from "../utils/custom.errors.js";

/**
 * Middleware to handle user authentication via a valid JWT token or 
 * via a valid user session.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @throws {UnauthorizedError} If neither JWT nor session is valid
 */
export const authenticate = async (req, reply) => {
  try {

    app.log.debug(`Entering user authentication routine for '${req.method} ${req.url}'`);
    
    // Authenticate via JWT-
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      app.log.debug(`Extracted '${token ? token.slice(0, 10) + "..." : "none"}' as JWT token`);

      try {
        const { payload } = await jwtVerify(token, api_key_secret);
        
        // Validate required claims
        if (!payload.sub || !payload.role) {
          app.log.warn(`JWT missing required claims - sub: ${payload.sub}, role: ${payload.role}`);
          throw new UnauthorizedError("Invalid token");
        }
        
        // Extract username and role from JWT payload
        req.user = {
          username: payload.sub,
          role: payload.role
        };

        app.log.info(`Successfully authenticated '${req.user.username}' with role '${req.user.role}' via JWT`);
        return;
      } catch (err) {
        app.log.warn(`JWT verification failed: ${err.message}`);
        throw new UnauthorizedError("Invalid token");
      }
    }

    // Authenticate via Session
    if (req.session?.user) {
      const user = await getUser(req.session.user.username, false, true);
      if (!user) {
        app.log.warn(`Could not find '${req.session.user.username}' in database.`);
        await req.destroySession();
        return reply.redirect("/login");
      }

      app.log.info(`Successfully authenticated '${user.username}' via session`);

      // Store only username and role in req.user
      req.user = {
        username: user.username,
        role: user.role
      };
      
      // Refresh session user
      req.session.user = user;

      return;
    }

    // Reject unsupported mechanisms
    if (authHeader)
      app.log.warn(`Authorization via '${authHeader}' is not supported`);

    throw new UnauthorizedError("Not authenticated");
  } catch (err) {
    if (!(err instanceof UnauthorizedError) && !(err instanceof NotFoundError)) {
      app.log.error("Unexpected error inside authentication middleware");
      app.log.error(err.message);
      throw new Error("Something unexpected happened");
    }
    throw err;
  }
};


/**
 * Middleware to validate appropiate user permissions
 *  *
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @throws {ForbiddenError}
 */
export const requireAdminRights = role => {
  return async function (req, reply) {

    app.log.info(`Checking for appropriate '${role}' rights`);

    // Always allow sysadmin
    if (req.user.username === process.env.SYS_USER_USERNAME)
      return;

    // Only sysadmin access
    if (role === "sysadmin") {
      if (req.user.role !== "sysadmin") {
        req.log.warn(`User '${req.user.username}' with role '${req.user.role}' denied sysadmin route`);
        throw new ForbiddenError("Sysadmin rights required");
      }
      return;
    }

    // If route requires admin, allow sysadmin and admin
    if (role === "admin") {
      if (req.user.role !== "admin" && req.user.role !== "sysadmin") {
        req.log.warn(`User '${req.user.username}' with role '${req.user.role}' denied admin route`);
        throw new ForbiddenError("Admin rights required");
      }
      return;
    }

    // Unknown role requirement
    req.log.error(`Unsupported role '${role}'`);
    throw new ForbiddenError("Invalid role requirement");
  };
};

/**
 * Middleware to handle user authentication via a valid JWT token or 
 * via a valid user session.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @throws {UnauthorizedError} If neither JWT nor session is valid
 */
export const requireUserSession = async (req, reply) => {
  try {

    if (!req.session?.user) {
      app.log.warn("Could not find valid user session");
      app.log.debug(req.session);
      return reply.redirect("/login");
    }

    // Ensure user still exists in DB
    app.log.info(`Trying to check if user '${req.session.user.username}' exists in database`);
    const user = await getUser(req.session.user.username, false, true);
    if (!user) {
      app.log.warn(`Could not find '${req.session.user.username}' in database.`);

      // Correct session destroy
      await new Promise((resolve, reject) => {
        req.session.destroy(err => {
          if (err) 
            return reject(err);
          resolve();
        });
      });

      app.log.debug("Redirecting to '/login'");
      return reply.redirect("/login");
    }

    app.log.debug(`User '${req.session.user.username}' has a valid session.`);
    
    // Store only username and role in req.user
    req.user = {
      username: user.username,
      role: user.role
    };
    
    // Refresh session user
    req.session.user = user;

  } catch (err) {
    app.log.error("Something unexpected happened while verifying user session");
    app.log.error(err.message);
    return reply.redirect("/login");
  }
};
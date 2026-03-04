import bcrypt from "bcrypt";

import { 
  app 
} from '../../config/index.js';
import { 
  getUser 
} from '../users/users.services.js'
import { 
  getApiKeys 
} from '../apikeys/apikeys.services.js';
import {
  getUsersGrowth
} from '../usergrowths/usergrowths.services.js';
import {
  getApiStatistics
} from '../apistatistics/apistatistics.services.js';
import { 
  BadRequestError,
  NotFoundError 
} from '../../common/utils/custom.errors.js'


/**
 * Renders the users admin page '/admin/users' for a logged-in user.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Renders the "users-view.hbs" view with the username.
 */
export const usersViewController = async (req, reply) => {
  return reply.view("users.hbs", {
    title: "Users View",
    username: req.session.user.username,
    isUsersView: true
  });
};


/**
 * Renders the user growth statistics page '/admin/usergrowth' for admins.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Renders the "usergrowth-view.hbs" view.
 */
export const userGrowthViewController = async (req, reply) => {
  const TARGET_DAYS = 30;
  
  let growthData = {
    dailyData: [],
    summary: null
  };
  let changeData = {
    change: 0,
    percentage: 0,
    isPositive: true
  };
  let apiStatsData = {
    dailyData: [],
    summary: null
  };

  try {
    // Fetch user growth data
    growthData = await getUsersGrowth({ 
      days: TARGET_DAYS,
      includeSummary: true
    });
    
    app.log.info(`Retrieved '${growthData.dailyData?.length || 0}' user-growth records for last '${TARGET_DAYS}' days`);
    
    // Calculate today's growth change compared to yesterday
    if (growthData.dailyData && growthData.dailyData.length >= 2) {
      const today = growthData.dailyData[growthData.dailyData.length - 1];
      const yesterday = growthData.dailyData[growthData.dailyData.length - 2];
      
      const todayNetGrowth = today.netGrowth || 0;
      const yesterdayNetGrowth = yesterday.netGrowth || 0;
      
      changeData.change = todayNetGrowth - yesterdayNetGrowth;
      changeData.isPositive = changeData.change >= 0;
      
      if (yesterdayNetGrowth !== 0) {
        changeData.percentage = ((changeData.change / Math.abs(yesterdayNetGrowth)) * 100).toFixed(1);
      } else if (changeData.change !== 0) {
        changeData.percentage = '∞';
      } else {
        changeData.percentage = '0.0';
      }
    }

    // Fetch API statistics data
    apiStatsData = await getApiStatistics({
      days: TARGET_DAYS,
      includeSummary: true
    });
    
    app.log.info(`Retrieved '${apiStatsData.dailyData?.length || 0}' API statistics records for last '${TARGET_DAYS}' days`);
  } catch (error) {
    app.log.error("Error loading statistics data");
    app.log.error(error.message)
  }

  return reply.view("statistics.hbs", {
    title: "Statistics Dashboard",
    username: req.session.user.username,
    isUserGrowthView: true,
    apiStatsData: JSON.stringify(apiStatsData),
    changeData: JSON.stringify(changeData),
    growthData: JSON.stringify(growthData)
  });
};


/**
 * Renders the home page '/home' for a logged-in user.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Renders the "home.hbs" view with the username.
 */
export const homeViewController = async (req, reply) => {
  return reply.view("home.hbs", {
    title: "Home",
    isAdmin: req.session.user.role === "admin" || req.session.user.role === "sysadmin", 
    username: req.session.user.username
  });
};


/**
 * Render the profile page '/profile' for a logged-in user.
 *
 * Loads user details from the database, retrieves all API keys,
 * and populates the profile view.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Renders the "profile.hbs" view or redirects to login.
 */
export const profileViewController = async (req, reply) => {
 
  // Load all API keys for the user
  const apiKeys = await getApiKeys(req.session.user.username);
  
  // Map to only include needed fields
  const apiKeysList = apiKeys.map(key => ({
    tokenName: key.tokenName,
    role: key.role,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt
  }));

  return reply.view("profile.hbs", {
    title: "Profile",
    firstname: req.session.user.firstname,
    lastname: req.session.user.lastname,
    username: req.session.user.username,
    email: req.session.user.email,
    hasApiKey: apiKeys.length > 0,
    apiKeys: apiKeysList,
    timestamp: Date.now()
  });
};


/**
 * Handle login form submissions.
 *
 * Validates 'username' and 'password', checks credentials against the database,
 * and creates a session for the authenticated user.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object (must contain `body.username` and `body.password`).
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @throws {BadRequestError} If credentials are missing or invalid.
 * @throws {NotFoundError} If the user does not exist.
 * @returns {Promise<object>} JSON response indicating login success.
 */
export const loginToAppController = async (req, reply) => {
  app.log.info("Entering login routine");

  const { username = "", password = "" } = req.body || {};

  if (!username || !password)
    throw new BadRequestError("Missing credentials");

  // Search for user
  app.log.info(`Trying to search for '${username}' in database`);
  const user = await getUser(username, true, true);
  if (!user)
    throw new NotFoundError(`Could not find '${username}'`);

  app.log.debug(`Found '${user.username}' in database`);

  // Validate credentials
  app.log.debug("Trying to validate password");
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    app.log.warn("Invalid password");
    throw new BadRequestError("Invalid credentials");
  }

  // Store the whole user object in session (without password!)
  app.log.info(`Trying to create session for '${user.username}'`);
  const plainUser = user.toObject ? user.toObject() : user;
  const { password: _pw, ...safeUser } = plainUser;
  req.session.user = safeUser;

  return reply.code(200).send({
    success: true,
    message: "Login successful",
    data: { username: user.username },
    statusCode: 200,
  });
};


/**
 * Log the user out by destroying their session.
 *
 * After destroying the session, redirects to the login page '/login'.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Redirects the user to "/login".
 */
export const logoutViewController = async (req, reply) => {
  if (req.session && req.session.user) {
    await new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          app.log.error("Error destroying session")
          app.log.error(err.message);
          return reject(err);
        }
        resolve();
      });
    });
  }

  return reply.redirect("/login");
};


// ========================================
// Auth API controllers (for React SPA)
// ========================================

/**
 * POST /api/v1/auth/login — JSON login, creates a session.
 * Same logic as loginToAppController but returns JSON only.
 */
export const apiLoginController = async (req, reply) => {
  app.log.info("Entering API login routine");

  const { username = "", password = "" } = req.body || {};

  if (!username || !password)
    throw new BadRequestError("Missing credentials");

  app.log.info(`Trying to search for '${username}' in database`);
  const user = await getUser(username, true, true);
  if (!user)
    throw new NotFoundError(`Could not find '${username}'`);

  app.log.debug(`Found '${user.username}' in database`);

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    app.log.warn("Invalid password");
    throw new BadRequestError("Invalid credentials");
  }

  // Store user in session (without password)
  app.log.info(`Creating session for '${user.username}'`);
  const plainUser = user.toObject ? user.toObject() : user;
  const { password: _pw, ...safeUser } = plainUser;
  req.session.user = safeUser;

  return reply.code(200).send({
    success: true,
    message: "Login successful",
    data: { username: user.username },
    statusCode: 200,
  });
};

/**
 * GET /api/v1/auth/logout — destroy session, return JSON.
 */
export const apiLogoutController = async (req, reply) => {
  if (req.session && req.session.user) {
    await new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          app.log.error("Error destroying session");
          app.log.error(err.message);
          return reject(err);
        }
        resolve();
      });
    });
  }

  return reply.code(200).send({
    success: true,
    message: "Logged out",
    statusCode: 200,
  });
};

/**
 * GET /api/v1/auth/me — returns the current session user.
 * Protected by the `authenticate` middleware.
 */
export const getMeController = async (req, reply) => {
  // req.user is set by authenticate middleware (from session or JWT)
  const user = req.session?.user || req.user;

  if (!user)
    throw new BadRequestError("No active session");

  // Return safe user data
  const { password: _pw, __v, ...safeUser } = user.toObject ? user.toObject() : user;

  return reply.code(200).send({
    success: true,
    data: safeUser,
    statusCode: 200,
  });
};
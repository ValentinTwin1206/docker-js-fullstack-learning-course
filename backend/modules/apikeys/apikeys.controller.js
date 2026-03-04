import { 
  createHash 
} from 'crypto';
import { 
    StatusCodes
} from "http-status-codes";

// own modules
import { 
  app
} from '../../config/index.js';
import {
  createApiKey,
  deleteApiKey,
  getApiKeys
} from './apikeys.services.js';
import { 
  getUser 
} from '../users/users.services.js';
import { 
  createJwtToken 
} from '../../common/utils/utils.js';
import { 
  ForbiddenError,
  NotFoundError
} from '../../common/utils/custom.errors.js';


/**
 * Controller to create a new API key for the authenticated user.
 *
 * Validates that the user in the request body matches the authenticated user.
 * Generates a signed JWT token and stores it in the database.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object. Expects `req.body.username`.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Sends a 201 response with API key details.
 *
 * @throws {ForbiddenError} If the username in the request body does not match the authenticated user.
 */
export const createApiKeyController = async (req, reply) => {
  const { username, tokenName } = req.body;

  if (username !== req.user.username) {
    app.log.warn(`User from body '${username}' unequals user from request '${req.user.username}'`);
    throw new ForbiddenError("Not allowed to create API key for different user");
  }

  app.log.debug(`Fetching user '${username}' from database to get role`);
  const user = await getUser(username, false, true);

  if (!user) {
    app.log.error(`Could not find '${username}'in database.`);
    throw new NotFoundError();
  }

  // Store username as 'sub' field and 'role' as a separate 'claim' 
  app.log.debug(`Creating JWT token for '${username}' with role '${user.role}'`);
  const token = await createJwtToken(username, user.role);
  
  // Store hashed token securely
  const tokenHash = createHash('sha256').update(token).digest('hex');
    
  // Register in DB
  app.log.info("Registering API Key into database");
  const apiKey = await createApiKey(username, tokenName, tokenHash, user.role);
  
  return reply.code(StatusCodes.CREATED).send({
    message: "API key created successfully. Store this token safely; it will not be shown again.",
    success: true,
    data: {
      id: apiKey._id,
      createdAt: apiKey.createdAt,
      username: apiKey.username,
      token: token
    },
  });
};


/**
 * Controller to delete a specific API key for the authenticated user.
 *
 * Looks up the API key for `req.user.username` and the specified tokenName, and deletes it from the database.
 * Sends a 200 response if deletion succeeds.
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object. Expects authenticated `req.user.username` and `req.params.tokenName`.
 * @param {import("fastify").FastifyReply} reply - Fastify reply object.
 * @returns {Promise<void>} Sends a 200 response indicating deletion success.
 *
 * @throws {NotFoundError} If no API key with the specified tokenName exists for the authenticated user.
 */
export const deleteApiKeyController = async (req, reply) => {
  const { tokenName } = req.params;

  const deleted = await deleteApiKey(req.user.username, tokenName);
  if (!deleted) {
    app.log.debug(`Could not find api key '${tokenName}' for '${req.user.username}'`)
    throw new NotFoundError();
  }

  return reply.code(StatusCodes.OK).send({
    message: `API key '${tokenName}' for '${req.user.username}' deleted successfully`,
    success: true,
    data: deleted,
    statusCode: StatusCodes.OK
  });
};


/**
 * Controller to list all API keys for the authenticated user.
 *
 * @param {import("fastify").FastifyRequest} req
 * @param {import("fastify").FastifyReply} reply
 */
export const getApiKeysController = async (req, reply) => {
  const { username } = req.params;

  if (username !== req.user.username) {
    app.log.warn(`User '${req.user.username}' tried to list API keys for '${username}'`);
    throw new ForbiddenError("Not allowed to view API keys for different user");
  }

  const apiKeys = await getApiKeys(username);

  const result = apiKeys.map(key => ({
    tokenName: key.tokenName,
    role: key.role,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt
  }));

  return reply.code(StatusCodes.OK).send({
    success: true,
    data: result,
    statusCode: StatusCodes.OK
  });
};
import bcrypt          from "bcrypt";
import { StatusCodes } from "http-status-codes";

import {
  app
} from "../../config/index.js";

import { 
  deleteApiKey 
} from "../apikeys/apikeys.services.js";

import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  getUsersPaginated,
  updateUser
} from "./users.services.js";

import { 
  getUserRole 
} from "../roles/roles.services.js";

import { 
  BadRequestError,
  NotFoundError 
} from "../../common/utils/custom.errors.js";

import { 
  generateUsername 
} from "../../common/utils/utils.js";

/**
 * Create a new user with a unique username.
 *
 * @route POST /users
 * @access Public (registration) or Admin (manual creation)
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @returns {Promise<FastifyReply>} JSON response with the created user (without password)
 *
 * Example response:
 * {
 *   "message": "User created successfully",
 *   "success": true,
 *   "statusCode": 201,
 *   "data": {
 *     "firstname": "John",
 *     "lastname": "Doe",
 *     "email": "john@doe.com",
 *     "username": "john1234",
 *     "role": "user"
 *   }
 * }
 */
export const createUserController = async (req, reply) => {
  const { firstname, lastname, email, password } = req.body || {};
  let username;

  // Keep trying until unique username is found
  for (let i = 0; i < 50; i++) {
    const candidate = generateUsername(firstname);
    const existingUser = await getUser(candidate);
    if (!existingUser) {
      username = candidate;
      break;
    }
  }

  if (!username)
    throw new Error("Could not generate a unique username. Try again.");

  app.log.debug("Trying to hash user password");
  const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // get default user role
  const userRole = await getUserRole("user");
  if (!userRole) {
    app.log.error("Could not load 'user' role from database");
    throw new Error("Something unexpected happened");
  }

  // Create new user with default role
  const user = await createUser({
    firstname,
    lastname,
    email,
    password: hashedPassword,
    username,
    role: userRole._id
  });

  const userObj = user.toObject();
  delete userObj.password;

  return reply.code(StatusCodes.CREATED).send({
    message: `User '${user.username}' successfully created`,
    success: true,
    statusCode: StatusCodes.CREATED,
    data: userObj
  });
};

/**
 * Create a new user with a unique username.
 *
 * @route DELETE /users/:username
 * @access Admin-only
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @returns {Promise<FastifyReply>} JSON response with the created user (without password)
 *
 * Example response:
 * {
 *   "message": "User 'testuser5678' successfully deleted",
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "user": "68ca8d6b29b135fea4d2898f",
 *     "key": "68ca8d6b29b135fea4d2898f"
 *   }
 * }
*/
export const deleteUserController = async (req, reply) => {

  // sysadmin cannot be deleted
  if (req.params.username === process.env.SYS_USER_USERNAME) {
    app.log.warn(`Cannot delete '${process.env.SYS_USER_USERNAME}'`)
    throw new BadRequestError()
  }

  const deletedUser = await deleteUser(req.params.username);
  
  // Delete associated API key(s)
  const deletedKey = await deleteApiKey(req.params.username);

  return reply.code(StatusCodes.OK).send({
    message: `User '${req.params.username}' successfully deleted`,
    success: true,
    statusCode: StatusCodes.OK,
    data: {
      user: deletedUser,
      key: deletedKey,
    }
  });
};

/**
 * Get a single user by username.
 *
 * @route GET /users/:username
 * @access Authenticated (Admin or owner)
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @returns {Promise<FastifyReply>} JSON response with user details
 *
 * Example response:
 * {
 *   "message": "User 'john1234' succesfully found"
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "firstname": "John",
 *     "lastname": "Doe",
 *     "email": "john@doe.com",
 *     "username": "john1234",
 *     "role": "user"
 *   }
 * }
 */
export const getUserController = async (req, reply) => {
  const user = await getUser(req.params.username, false, true);

  if (!user)
    throw new NotFoundError(`User '${req.params.username}' not found`);

  return reply.code(StatusCodes.OK).send({
    message: `User '${req.params.username}' successfully found`,
    success: true,
    statusCode: StatusCodes.OK,
    data: user,
  });
};

/**
 * Get all users.
 *
 * @route GET /users
 * @access Authenticated (Admin only)
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @query {string} [email] - Optional email filter
 * @query {string} [lastname] - Optional lastname filter
 * @returns {Promise<FastifyReply>} JSON response with an array of users
 *
 * Example response:
 * {
 *   "message": "Successfully retrieved users"
 *   "success": true,
 *   "statusCode": 200,
 *   "data": [
 *     {
 *       "firstname": "John",
 *       "lastname": "Doe",
 *       "email": "john@doe.com",
 *       "username": "john1234",
 *       "role": "user"
 *     },
 *     {
 *       "firstname": "Bob",
 *       "lastname": "Brown",
 *       "email": "bob@example.com",
 *       "username": "bobby1234",
 *       "role": "admin"
 *     }
 *   ]
 * }
 */
export const getUsersController = async (req, reply) => {
  const { email, lastname } = req.query || {};
  const users = await getUsers({ email, lastname });

  if (!users)
    app.log.warn("Could not fetch any user");

  return reply.code(StatusCodes.OK).send({
    message: "Successfully retrieved users",
    success: true,
    statusCode: StatusCodes.OK,
    data: users
  });
};

/**
 * Get all users paginated.
 *
 * @route GET /user
 * @access Admin
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @returns {Promise<FastifyReply>} JSON response with paginated users
 *
 * Example response:
 * {
 *   "message": "Successfully retrieved users",
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "users": [
 *       { 
 *         "firstname": "John",
 *         "lastname": "Doe", 
 *         "email": "john@doe.com",
 *         "username": "john1234",
 *         "role": "user" 
 *       },
 *       { 
 *          "firstname": "Bob",
 *          "lastname": "Brown",
 *          "email": "bob@example.com",
 *          "username": "bobby1234",
 *          "role": "admin"
 *       }
 *     ],
 *     "total": 2,
 *     "page": 1,
 *     "totalPages": 1,
 *     "limit": 10
 *   }
 * }
 */
export const getUsersPaginatedController = async (req, reply) => {
  const page     = parseInt(req.query.page) || 1;
  const limit    = parseInt(req.query.limit) || 10;
  const username = req.query.username;

  app.log.info(`Requesting users with 'page=${page}', 'limit=${limit}' and 'username=${username}'`)

  const result = await getUsersPaginated({ page, limit, username });

  if (result.total === 0)
    req.log.warn(`No users found for query '${username || "all"}'`);

  app.log.debug(result.users)
  
  return reply.code(StatusCodes.OK).send({
    message: "Successfully retrieved users",
    success: true,
    statusCode: StatusCodes.OK,
    data: {
      users: result.users,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit
    }
  });
};

/**
 * Update an existing user.
 *
 * @route PATCH /users/:username
 * @access Authenticated (Admin or owner)
 *
 * @param {FastifyRequest} req - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object
 * @returns {Promise<FastifyReply>} JSON response with updated user
 *
 * Example response:
 * {
 *   "message": "User ''john1234' successfully updated",
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "firstname": "John",
 *     "lastname": "Doe",
 *     "email": "john@doe.com",
 *     "username": "john1234",
 *     "role": "user"
 *   }
 * }
 */
export const updateUserController = async (req, reply) => {
  const updatedUser = await updateUser(req.params.username, req.body, true);

  if (!updatedUser)
    throw new NotFoundError(`User '${req.params.username}' not found`);

  return reply.code(StatusCodes.OK).send({
    message: `User '${req.params.username}' successfully updated`,
    success: true,
    statusCode: StatusCodes.OK,
    data: updatedUser
  });
};

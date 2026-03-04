import { 
    ReasonPhrases, 
    StatusCodes 
} from "http-status-codes";

import { 
  app 
} from '../../config/index.js';

import { 
    BadRequestError,
    UnauthorizedError, 
    DuplicateKeyError,
    ForbiddenError,
    NotFoundError,
    ValidationError
} from '../utils/custom.errors.js';

/**
 * Global error handler middleware for Fastify application.
 * 
 * Intercepts all errors thrown during request processing and formats them
 * into consistent HTTP responses with appropriate status codes and messages.
 * 
 * Handles the following error types:
 * - ValidationError (400): Input validation failures with detailed field information
 * - BadRequestError (400): Malformed requests or invalid input
 * - UnauthorizedError (401): Missing or invalid authentication
 * - ForbiddenError (403): Authenticated but lacking permissions
 * - NotFoundError (404): Requested resource not found
 * - MongoDB duplicate key errors (409): Unique constraint violations (code 11000)
 * - All other errors (500): Unexpected internal server errors
 * 
 * @param {Error} error - The error object thrown during request processing
 * @param {FastifyRequest} request - Fastify request object
 * @param {FastifyReply} reply - Fastify reply object for sending the response
 * @returns {Promise<FastifyReply>} JSON response with error details
 * 
 * @example
 * // Response format for validation errors:
 * {
 *   "success": false,
 *   "error": "Bad Request",
 *   "details": [{ "field": "email", "message": "Invalid email format", "value": "bad-email" }],
 *   "message": "Input validation failed",
 *   "statusCode": 400
 * }
 * 
 * @example
 * // Response format for duplicate key errors:
 * {
 *   "success": false,
 *   "error": "Conflict",
 *   "message": "Email 'user@example.com' already exists",
 *   "statusCode": 409
 * }
 */
export const handleErrors = async (error, request, reply) => {
  app.log.warn(`Entered error handler with '${error.name}'`)
  app.log.error(error.message)  // HTTP 400
  if (error instanceof ValidationError) {

    error.format().forEach(detail => {
      app.log.warn(detail.message, { field: detail.field, value: detail.value });
    });

    return reply.status(error.statusCode).send({
      success: false,
      error: error.statusPhrase,
      details: error.format(),
      message: "Input validation failed",
      statusCode: error.statusCode,
    });
  // HTTP 400
  } else if (error instanceof BadRequestError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.statusPhrase,
      message: error.message,
      statusCode: error.statusCode,
    });
  // HTTP 400
  } else if (error.message === "Body cannot be empty when content-type is set to 'application/json'") {
    const badRequestError = new BadRequestError("No request body was send")
    return reply.status(badRequestError.statusCode).send({
      success: false,
      error: badRequestError.statusPhrase,
      message: badRequestError.message,
      statusCode: badRequestError.statusCode,
    });
  // HTTP 401
  } else if (error instanceof UnauthorizedError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.statusPhrase,
      message: error.message,
      statusCode: error.statusCode,
    });
  // HTTP 403
  } else if (error instanceof ForbiddenError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.statusPhrase,
      message: error.message,
      statusCode: error.statusCode,
    });
  // HTTP 404
  } else if (error instanceof NotFoundError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.statusPhrase,
      message: error.message,
      statusCode: error.statusCode,
    });
  // HTTP 409
  } else if (error?.code === 11000) {
    const dupError = new DuplicateKeyError(error)
    return reply.status(dupError.statusCode).send({
      success: false,
      error: dupError.statusPhrase,
      message: dupError.message,
      statusCode: dupError.statusCode,
    });
  // HTTP 500
  } else {
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: ReasonPhrases.INTERNAL_SERVER_ERROR,
      message: "Something unexpected happened",
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
   });
  }
};
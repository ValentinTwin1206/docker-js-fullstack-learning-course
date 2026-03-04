import Ajv        from "ajv";
import addFormats from "ajv-formats";
import { 
  app 
} from '../../config/index.js';
import {
  BadRequestError,
  ForbiddenError,
  ValidationError
} from '../utils/custom.errors.js';

const ajv = new Ajv({ 
  allErrors: true, 
  strict: false 
});
addFormats(ajv);
const validators = {};

export const validateSchema = modelName => {
  return async function (req, reply) {
    try {
      if (!validators[modelName]) {
        const model = (await import(`../../modules/${modelName}/${modelName}.model.js`)).default;
        if (!model?.schema?.jsonSchema)
          throw new Error(`Model '${modelName}' is not valid for validation`);

        const schema = model.schema.jsonSchema();

        // Enforce schema strictness
        if (schema.type === "object")
          schema.additionalProperties = false;

        // Convert unknown buffer type
        if (schema.properties?.filecontent?.type === "buffer")
          schema.properties.filecontent = { 
            type: "string", 
            contentEncoding: "base64" 
          };

        validators[modelName] = ajv.compile(schema);
      }

      
      app.log.debug(`Trying to validate request body for '${modelName}'`)
      app.log.debug(req.body)
      
      // validate against JSON schema
      const validate = validators[modelName];
      const valid = validate(req.body);

      if (!valid)
        throw new ValidationError(validate.errors);

      app.log.info("Validation succeeded")
      
    } catch (err) {
       if (!(err instanceof ValidationError)) {
          app.log.warn("Something unexpected happened inside validation middleware")
          throw new Error(err.message);
        }
      
        // Re-throw to error handler
        throw err;
    }
  };
};

/**
 * Middleware to validate ':username' route parameter
 *
 * @param {import("fastify").FastifyRequest} req - Fastify request object
 * @param {import("fastify").FastifyReply} reply - Fastify reply object
 * @throws {BadRequestError|ForbiddenError}
 */
export const validateUsername = async (req, reply) => {
  
  const usernameParam = req.params.username;
  app.log.debug(`Extracted '${usernameParam}' as 'username' from '${req.url}'`);

  if (!usernameParam) {
    app.log.warn("Missing 'username' parameter in route or query");
    throw new BadRequestError("No 'username' provided in route");
  }

  // Only allow alphanumeric values (letters + digits)
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(usernameParam)) {
    app.log.warn(`Username '${usernameParam}' has a bad format`);
    throw new BadRequestError();
  }

  // Ensure the authenticated user matches the username parameter
  app.log.info(`Comparing authenticated user '${req.user.username}' with '${usernameParam}' from request parameter.`)
  if (req.user.username !== usernameParam) {
    app.log.warn("Authenticated user does not match provided username")
    throw new ForbiddenError();
  }

  app.log.debug("Username successfully validated");
};
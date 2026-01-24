import { 
    StatusCodes,
    ReasonPhrases
} from "http-status-codes";

export class BadRequestError extends Error {
   constructor(message = "Bad request") {
    super(message);
    this.name         = "BadRequestError";
    this.statusCode   = StatusCodes.BAD_REQUEST;
    this.statusPhrase = ReasonPhrases.BAD_REQUEST
  } 
};

export class DuplicateKeyError extends Error {
  constructor(mongoError) {
    super("Duplicate key error");
    this.name         = "DuplicateKeyError";
    this.mongoError   = mongoError;
    this.statusCode   = StatusCodes.CONFLICT
    this.statusPhrase = ReasonPhrases.CONFLICT

    // Extract field and value from the error object
    if (mongoError?.keyPattern && mongoError?.keyValue) {
      const field = Object.keys(mongoError.keyPattern)[0];
      const value = mongoError.keyValue[field];
      this.field = field;
      this.value = value;
      this.message = `'${field}' is already used.`;
    } else {
      // fallback
      this.message = mongoError.message || "Duplicate key error";
    }
  }
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden to use") {
    super(message);
    this.name         = "ForbiddenError";
    this.statusCode   = StatusCodes.FORBIDDEN;
    this.statusPhrase = ReasonPhrases.FORBIDDEN
  } 
};

export class NotFoundError extends Error {
   constructor(message = "Document not found") {
    super(message);
    this.name         = "NotFoundError";
    this.statusCode   = StatusCodes.NOT_FOUND;
    this.statusPhrase = ReasonPhrases.NOT_FOUND
  } 
};

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name         = "UnauthorizedError";
    this.statusCode   = StatusCodes.UNAUTHORIZED;
    this.statusPhrase = ReasonPhrases.UNAUTHORIZED
  }
};

export class ValidationError extends Error {
  constructor(errors) {
    super("Validation failed");
    this.name         = "ValidationError";
    this.errors       = errors || [];
    this.statusCode   = StatusCodes.BAD_REQUEST
    this.statusPhrase = ReasonPhrases.BAD_REQUEST
  }

  format() {
    return this.errors.map(err => {
      const field = err.instancePath ? err.instancePath.replace(/^\//, '') : '(root)';
      const value = err.data;
      let message = 'Invalid value';

      switch (err.keyword) {
        case 'required':
          message = `Field '${err.params.missingProperty}' is required`;
          break;
        case 'type':
          message = `Wrong type for '${field}'. Expected ${err.params.type}`;
          break;
        case 'pattern':
          if (err.params.pattern === '^[A-Za-z]+$') {
            message = `Only alphabetical letters are allowed for "${field}"`;
          } else if (err.params.pattern === '^[A-Za-z0-9]+$') {
            message = `Only alphanumerical values are allowed for "${field}"`;
          } else {
            message = `Value for '${field}' does not match expected pattern`;
          }
          break;
        case 'minLength':
          message = `The '${field}' must be at least '${err.params.limit}' characters long`;
          break;
        case 'maxLength':
          message = `The '${field}' must be at most '${err.params.limit}' characters long`;
          break;
        default:
          message = err.message ? err.message : `Invalid value for "${field}"`;
      }

      return { message, value };
    });
  }
};
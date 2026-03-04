import mongoose from "mongoose";
import { 
  promises as fs 
} from "fs"
import { 
  SignJWT 
} from "jose";

// own modules
import { 
  app,
  api_key_secret
} from '../../config/index.js';


/**
 * Build a deterministic cache key based on a request path and query parameters.
 *
 * Ensures that query parameters are always sorted alphabetically so the same
 * query produces the same cache key regardless of parameter order.
 *
 * @param {string} path - The request path (e.g., "/api/v1/files").
 * @param {Object<string, any>} [query={}] - An object of query parameters.
 * @returns {string} A cache key string in the format `cache:<path>:<sortedQuery>`.
 *
 * @example
 * buildCacheKey("/api/v1/files", { username: "alice", page: 2 });
 * // => "cache:/api/v1/files:page=2&username=alice"
 */
export function buildCacheKey(path, query) {
  const queryKey = Object.keys(query || {})
    .sort() // ensure deterministic order
    .map(k => `${k}=${query[k]}`)
    .join('&');

  return queryKey ? `cache:${path}:${queryKey}` : `cache:${path}`;
};


/**
 * Drop a MongoDB collection safely.
 *
 * @param {string} collectionName - Name of the collection to drop
 * @returns {Promise<void>}
 */
export async function cleanUpCollection(collectionName) {
  try {
    const res = await mongoose.connection.db.dropCollection(collectionName);
    if(res)
      app.log.debug(`Dropped collection '${collectionName}'`);
  } catch (err) {
    app.log.warn(`Could not drop collection '${collectionName}'`)
    app.log.error(err.message);
  }
};


/**
 * Generate a new API Key (JWT) for a specific user.
 *
 * @param {string} username - Username of the user
 * @param {string} role - Role of the user (e.g., 'user', 'admin', 'sysadmin')
 * @returns {Promise<string>} Resolves to the signed JWT token
 */
export const createJwtToken = async (username, role) => {
  try {

    return await new SignJWT({ 
        sub: username,
        role: role,
        type: "api-key" 
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime('1y')
      .sign(api_key_secret);

  } catch (err) {
    app.log.error(`JWT Error: ${err.message}`);
    throw new Error("API key generation failed");
  }
};


/**
 * Generate a simple username string by combining a lowercase first name
 * with a random numeric suffix (between 2 and 5 digits).
 *
 * @param {string} firstname - The user's first name.
 * @returns {string} A generated username (e.g., "alice4821").
 *
 * @example
 * generateUsername("Alice");
 * // => "alice37429"
 */
export function generateUsername(firstname) {
  const randomSuffix = Math.floor(10 + Math.random() * 99000);
  return `${firstname.toLowerCase()}${randomSuffix}`;
};


/**
 * Reads a JSON file asynchronously and returns the parsed object.
 * @param {string} path - Path to the JSON file
 * @returns {Promise<Object>} Parsed JSON content
 */
export async function readJsonFile(pathToJson) {
  try {
    const data = await fs.readFile(pathToJson, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    app.log.error(`Could not read content from '${pathToJson}'`)
    app.log.error(err.message);
    throw err;
  }
};


/**
 * Convert a string (or ObjectId) to a valid mongoose ObjectId.
 *
 * @param {string|mongoose.Types.ObjectId} value - String that is converted to MongoDB ID
 * @returns {mongoose.Types.ObjectId|null}
 */
export const toObjectId = value => {
  try {
    const mongoId = new mongoose.Types.ObjectId(value)
    app.log.info(`Converted '${value}' to '${mongoId}'`)
    return mongoId;
  } 
  catch (err) {
    app.log.warn(`Could not convert '${value}' to MongoDB ID`)
    throw new Error(err.message)
  }
};

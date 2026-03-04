import ApiKey from "./apikeys.model.js";

/**
 * Create and persist a new API key for a given username.
 *
 * @async
 * @function createApiKey
 * @param {string} username - The username associated with the API key.
 * @param {string} tokenName - Name of the created API key
 * @param {string} tokenHash - The hashed JWT token to store.
 * @param {string} role - The role of the user at the time of API key creation.
 * @returns {Promise<Object>} The newly created API key document.
 *
 * @throws {Error} If saving the API key fails.
 */
export const createApiKey = async (username, tokenName, tokenHash, role) => {
  // Set expiration to 1 year from now
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const apiKeyDoc = new ApiKey({
    username,
    tokenName,
    tokenHash,
    role,
    expiresAt
  });

  return await apiKeyDoc.save();
};


/**
 * Delete a specific API key identified by username and token name.
 *
 * @async
 * @function deleteApiKey
 * @param {string} username - The username who owns the API key.
 * @param {string} tokenName - The name of the specific API key to delete.
 * @returns {Promise<boolean>} True if an API key was deleted, false otherwise.
 *
 * @example
 * const deleted = await deleteApiKey("testuser", "Production API");
 * if (deleted) console.log("API key removed");
 */
export const deleteApiKey = async (username, tokenName) => {
  const apiKeyDoc = await ApiKey.findOneAndDelete({ username, tokenName });
  return apiKeyDoc !== null;
};


/**
 * Retrieve an API key document by username.
 *
 * @async
 * @function getApiKey
 * @param {string} username - The username to look up.
 * @returns {Promise<Object|null>} The API key document, or null if not found.
 *
 * @example
 * const apiKey = await getApiKey("testuser");
 * if (apiKey) console.log(apiKey.tokenHash);
 */
export const getApiKey = async username => {
  return await ApiKey.findOne({ username });
};


/**
 * Retrieve all API keys for a specific user.
 *
 * @async
 * @function getApiKeys
 * @param {string} username - The username whose API keys should be retrieved.
 * @returns {Promise<Array<Object>>} Array of API key documents for the user.
 *
 * @example
 * const apiKeys = await getApiKeys("testuser");
 * console.log(`User has ${apiKeys.length} API keys`);
 */
export const getApiKeys = async username => {
  return await ApiKey.find({ username }).sort({ createdAt: -1 }).lean();
};

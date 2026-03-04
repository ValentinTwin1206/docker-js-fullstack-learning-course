import Role from "./roles.model.js";

/**
 * Fetch a single role by its name (from the "role" field).
 * @param {string} roles - The role name ("admin" or "user")
 * @returns {Promise<Role[]>}
 */
export const createUserRolesBulk = async roles => {
  if (!Array.isArray(roles)) return [];
  return Role.insertMany(roles, { ordered: false });
};

/**
 * Fetch a single role by its name (from the "role" field).
 * @param {string} role - The role name ("admin" or "user")
 * @returns {Promise<Role|null>}
 */
export const getUserRole = async role => {
  return await Role.findOne({ role: role }).lean();
};

/**
 * Fetch all available roles.
 * @returns {Promise<Role[]>}
 */
export const getUserRoles = async () => {
  return await Role.find().lean();
};
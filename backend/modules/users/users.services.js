import User from "./users.model.js";

/**
 * Create a new user in the database.
 * @param {object} body - Consisting of 'firstname', 'lastname', etc. 
 * @returns {Promise<User>}
 */
export const createUser = async ({ firstname, lastname, email, password, username, role }) => {
  const newUser = new User({
    firstname,
    lastname,
    email,
    password,
    username,
    role
  });

  return await newUser.save();
};

/**
 * Create multiple users in bulk.
 * Ensures _id and role are stored as ObjectId values.
 *
 * @param {object[]} users - Array of user objects.
 * @returns {Promise<User[]>}
 */
export const createUsersBulk = async users => {
  if (!Array.isArray(users)) return [];
  return User.insertMany(users, { ordered: false });
};

/**
 * Delete a user by username.
 *
 * @async
 * @function deleteUser
 * @param {string} username - The username of the user to delete.
 * @returns {Promise<Object|null>} The deleted user document, or null if not found.
 *
 * @example
 * const deletedUser = await deleteUser("john123");
 * if (deletedUser) console.log("User deleted:", deletedUser.username);
 */
export const deleteUser = async username => {
  return await User.findOneAndDelete({ username });
};


/**
 * Get one user by username.
 * If expand === true it will populate the "role" field and return a plain object.
 *
 * @param {string} username
 * @param {boolean} includePassword - whether to include password field (default false)
 * @param {boolean} expand - whether to populate role (default false)
 * @returns {Promise<User|object|null>}
 */
export const getUser = async (username, includePassword = false, expand = false) => {
  let projection

  if (expand) {
    // projection for expanded users (always clean output)
    projection = "-__v -createdAt -updatedAt";
    if (!includePassword) 
      projection += " -password";

    const user = await User.findOne({ username }, projection)
      .populate("role", "role")
      .lean()
      .exec();

    if (!user) return null;

    // flatten role to just the string
    if (user.role && typeof user.role === "object")
      user.role = user.role.role;

    return user;
  }

  // non-expanded users: keep mongoose doc, only strip password if requested
  projection = includePassword ? {} : "-password";
  return await User.findOne({ username }, projection).exec();
};

/**
 * Get all users with flattened role names.
 * Optimized via Aggregation Pipeline to reduce Node.js CPU usage.
 * 
 * @param {Object} filters - Optional filters
 * @param {string} [filters.email] - Filter by email (exact match)
 * @param {string} [filters.lastname] - Filter by lastname (exact match)
 * @returns {Promise<Array>} Array of user objects
 */
export const getUsers = async (filters = {}) => {
  const matchStage = {};
  
  if (filters.email)
    matchStage.email = filters.email;
  
  if (filters.lastname)
    matchStage.lastname = filters.lastname;

  return await User.aggregate([
    { 
      $match: matchStage
    },
    {
      $lookup: {
        from: "roles", 
        localField: "role",
        foreignField: "_id",
        as: "roleData"
      }
    },
    { 
      $unwind: "$roleData" // unwind prevents the role from being an array
    },
    {
      $set: {
        role: "$roleData.role" // Overwrite the 'role' field
      }
    },
    {
      $project: {
        password: 0,
        createdAt: 0,
        updatedAt: 0,
        __v: 0,
        roleData: 0 // Remove the temporary lookup object
      }
    }
  ]);
};


/**
 * Get paginated users from the database.
 *
 * Supports optional regex-based username search for autocomplete.
 *
 * @param {Object} options
 * @param {number} options.page - 1-based page number
 * @param {number} options.limit - number of items per page
 * @param {string} [options.username] - optional search string for username (regex autocomplete)
 * @returns {Promise<{ users: User[], total: number, page: number, totalPages: number }>}
 */
export const getUsersPaginated = async ({ page = 1, limit = 10, username } = {}) => {
  const skip = (page - 1) * limit;

  let query = {};
  if (username)
    query.username = new RegExp(`^${username}`, "i"); // case-insensitive prefix search (index-friendly)

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  // sort alphabetically by username
  const users = await User.find(query, "-password -createdAt -updatedAt -__v")
    .sort({ username: 1 }) 
    .skip(skip)
    .limit(limit)
    .populate("role", "role -_id")
    .lean()
    .exec();

  const flattenedUsers = users.map(user => {
    user.role = user.role.role;
    return user;
  });

  return {
    users: flattenedUsers,
    total,
    page,
    totalPages
  };
};

/**
 * Update user by username.
 * - Excludes sensitive and technical fields from output
 * - Flattens role to just the string if expanded
 *
 * @param {string} username
 * @param {object} updates - Fields to update
 * @param {boolean} expand - Whether to populate role (default true for clean output)
 * @returns {Promise<object|null>} - Clean user object or null if not found
 */
export const updateUser = async (username, updates, expand = true) => {
  const projection = "-password -__v -createdAt -updatedAt";

  let query = User.findOneAndUpdate({ 
    username
    },
    { 
      $set: updates 
    },
    { 
      new: true, 
      runValidators: true, 
      projection 
    }
  );

  if (expand)
    query = query.populate("role", "role -_id").lean();

  const user = await query.exec();
  if (!user) return null;

  if (expand && user.role && typeof user.role === "object")
    user.role = user.role.role;

  return user;
};

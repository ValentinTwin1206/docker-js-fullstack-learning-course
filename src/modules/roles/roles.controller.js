import { StatusCodes } from "http-status-codes";
import { 
  app 
} from "../../config/index.js";
import { 
    getUserRole,
    getUserRoles
} from './roles.services.js';
import { 
  getUser,
  updateUser
} from '../users/users.services.js';
import { 
  ForbiddenError,
  NotFoundError
} from '../../common/utils/custom.errors.js';


/**
 * Controller: Get all roles
 */
export const getUserRolesController = async (req, reply) => {
  const roles = await getUserRoles();

  if(roles.length === 0)
    app.log.warn("Could not find an user role")

  return reply.code(200).send({
    success: true,
    data: roles,
  });
};

/**
 * Controller: Get a single role by name
 */
export const getUserRoleController = async (req, reply) => {

  const role = await getUserRole(req.params.role);

  if (!role) 
    throw new NotFoundError()

  return reply.code(200).send({
    success: true,
    data: role,
  });
};

/**
 * Controller to update a user's role
 */
export const updateUserRoleController = async (req, reply) => {
  
  if (req.user.role !== "admin" && req.user.role !== "sysadmin") {
    app.log.warn(`Requesting user '${req.user.username}' has insufficient '${req.user.role}' rights`)
    throw new ForbiddenError()
  }

  // find user that gets a new role
  app.log.debug(`Trying to find '${req.params.username}'`)
  const user = await getUser(req.params.username)
  
  if(!user)
    throw new NotFoundError(`Could not find '${req.params.username}'`)

  app.log.debug(`Found user '${user.username}' in database`)

  // find user that gets a new role
  app.log.debug(`Trying to find '${req.body.role}'`)
  const role = await getUserRole(req.body.role)

  if(!role)
    throw new NotFoundError()

  app.log.debug(`Found role '${role.role}' in database`)
  

  if(role.role === "sysadmin")
    throw new ForbiddenError()

  // update user role
  app.log.debug(`Trying to assign new role '${req.body.role}' to '${user.username}'`)
  const updatedUser = await updateUser(
    req.params.username,
    { role: role._id },
    false
  )

  if(!updatedUser)
    throw new Error("Could not update user")

  return reply.code(StatusCodes.OK).send({
    success: true,
    message: "User role updated successfully",
    statusCode: StatusCodes.OK,
    data: updatedUser
  });
};
import { 
  createApiKeyController, 
  deleteApiKeyController 
} from '../modules/apikeys/apikeys.controller.js';
import { 
  createFileController,
  deleteFileController,
  getFileController,
  getFilesController,
  getFilesPaginatedController
} from '../modules/files/files.controller.js';
import { 
  createUserController,
  deleteUserController,
  getUserController,
  getUsersController,
  getUsersPaginatedController,
  updateUserController
} from '../modules/users/users.controller.js';
import { 
  updateUserRoleController 
} from '../modules/roles/roles.controller.js';
import {
  getUserGrowthController
} from '../modules/usergrowths/usergrowths.controller.js';
import {
  getApiStatisticsController
} from '../modules/apistatistics/apistatistics.controller.js';

// UI CONTROLLERS
import {
  usersViewController,
  homeViewController,
  profileViewController,
  loginViewController,
  loginToAppController,
  logoutViewController,
  userGrowthViewController
} from '../modules/ui/ui.controller.js';

// MIDDLEWARE
import {
  authenticate,
  requireAdminRights,
  requireUserSession
} from '../common/middlewares/authentication.middleware.js';
import { 
  addToCacheMiddleware,
  cleanCacheMiddleware
} from '../common/middlewares/caching.middleware.js';
import { 
  validateUsername,
  validateSchema
} from '../common/middlewares/validation.middleware.js';
import { 
  growthTrackingHook
} from '../common/middlewares/statistics.middleware.js';

export default async function AppRoutes(app) {

  // Public UI Routes
  app.get('/', async (req, reply) => reply.redirect('/home'));
  app.get('/healthcheck', async () => ({ ok: true }));
  app.get('/login', {
    handler: loginViewController 
  });
  app.get('/logout', { 
    handler: logoutViewController 
  });
  app.post('/login', { 
    handler: loginToAppController
  });

  // Protected UI Routes
  app.get('/home', {
    preHandler: [
      requireUserSession
    ],
    handler: homeViewController
  });
  app.get('/profile', { 
    preHandler: [
      requireUserSession
    ],
    handler: profileViewController
  });
  app.get('/admin/users', { 
    preHandler: [
      requireUserSession
    ],
    handler: usersViewController
  });
  app.get('/admin/users-growth', { 
    preHandler: [
      requireUserSession
    ],
    handler: userGrowthViewController
  });

  // API Keys
  app.delete('/api/v1/apikeys/:username/:tokenName', {
    preHandler: [
      authenticate,
      validateUsername
    ],
    handler: deleteApiKeyController
  });
  app.post('/api/v1/apikeys', {
    preHandler: [
      authenticate,
      validateSchema("apikeys")
    ],
    handler: createApiKeyController
  });

  // Files routes
  app.delete('/api/v1/files/:id', {
    preHandler: [
      authenticate
    ],
    handler: deleteFileController,
    onSend: [
      cleanCacheMiddleware
    ],
  });
  app.post('/api/v1/files', {
    preHandler: [
      authenticate
    ],
    handler: createFileController,
    onSend: [
      cleanCacheMiddleware
    ],
  });
  app.get('/api/v1/files/:id', {
    preHandler: [
      authenticate
    ],
    handler: getFileController
  });
  app.get('/api/v1/files', { 
    preHandler: [
      authenticate,
      addToCacheMiddleware
    ],
    handler: getFilesController
  });
  app.get('/api/v1/file', { 
    preHandler: [
      authenticate,
      addToCacheMiddleware
    ],
    handler: getFilesPaginatedController
  });

  // Roles routes
  app.patch('/api/v1/roles/:username', {
    preHandler: [
      authenticate,
      validateSchema("roles")
    ],
    handler: updateUserRoleController
  });
  
  // Users routes
  app.get('/api/v1/user', {
    preHandler: [
        authenticate,
        requireAdminRights("admin")
    ],
    handler: getUsersPaginatedController
  });
  app.get('/api/v1/users', {
    preHandler: [
        authenticate,
        requireAdminRights("admin")
    ],
    handler: getUsersController
  });
  app.post('/api/v1/users', {
    preHandler: [
        validateSchema("users")
    ],
    onSend: [ 
      growthTrackingHook
    ],
    handler: createUserController
  });
  app.delete('/api/v1/users/:username', {
     preHandler: [
      authenticate,
      requireAdminRights("sysadmin")
    ],
    onSend: [ 
      growthTrackingHook
    ],
    handler: deleteUserController
  })
  app.get('/api/v1/users/:username', {
    preHandler: [
      authenticate,
      validateUsername
    ],
    handler: getUserController
  });
  app.patch('/api/v1/users/:username', {
    preHandler: [
      authenticate,
      validateSchema("users"),
      validateUsername
    ],
    handler: updateUserController
  });

  // Statistics routes
  app.get('/api/v1/statistics/churn', {
    preHandler: [
      authenticate,
      requireAdminRights("admin")
    ],
    handler: getUserGrowthController
  });
  app.get('/api/v1/statistics/traffic', {
    preHandler: [
      authenticate,
      requireAdminRights("admin")
    ],
    handler: getApiStatisticsController
  });
};
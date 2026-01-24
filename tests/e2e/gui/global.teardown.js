import config from '../../../playwright.config.js';
import { 
  getTestUserData
} from '../helpers/test-helpers.js';

/**
 * Delete the preRegistered user created during global setup.
 * Server remains running (managed by Docker Compose).
 */
export default async function globalTeardown() {

  console.log('[TEARDOWN] Starting global teardown...');

  let username  = process.env.PREREGISTERED_USERNAME; 
  const baseURL = config.use?.baseURL;
  
  // receive user from API if username not in env
  if (!username) {
    // parse test-user from JSON file
    const testUser   = await getTestUserData('preRegistered');
    const adminToken = process.env.SYSADMIN_API_KEY;

    if (adminToken) {
      try {
        // Query users by email to find the username
        const response = await fetch(`${baseURL}/api/v1/users?email=${encodeURIComponent(testUser.email)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            username = result.data[0].username;
            console.log(`[TEARDOWN] Found user '${username}' with email '${testUser.email}'`);
          }
        }
      } catch (error) {
        console.warn(`[TEARDOWN] Error finding user by email: ${error.message}`);
      }
    }
  }

  if (username) {
    try {
      // Get sysadmin token from environment
      const adminToken = process.env.SYSADMIN_API_KEY;
            
      // Delete the user via API
      if (adminToken) {
        console.log(`[TEARDOWN] Trying to delete user '${username}'...`);

        const response = await fetch(`${baseURL}/api/v1/users/${username}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (response.ok)
          console.log(`[TEARDOWN] Successfully deleted user '${username}'`);
        else
          console.warn(`[TEARDOWN] Received '${response.status}' when trying to delete user '${username}'`);
      }
      else {
        console.warn('[TEARDOWN] No admin token available, skipping user deletion');
      }
      
      // Clear environment variables
      delete process.env.PREREGISTERED_USERNAME;
      delete process.env.PREREGISTERED_PASSWORD;
      delete process.env.PREREGISTERED_EMAIL;
      delete process.env.PREREGISTERED_FIRSTNAME;
      delete process.env.PREREGISTERED_LASTNAME;
      
    } catch (error) {
      console.warn('Error during user cleanup:', error.message);
    }
  }
  
  console.log('[TEARDOWN] Global teardown complete. Server remains running...');
}

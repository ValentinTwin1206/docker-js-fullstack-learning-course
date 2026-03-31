import config from '../../../playwright.config.js';
import { 
  getTestUserData,
  generateApiKey,
  registerUserViaApi
} from '../helpers/test-helpers.js';

/**
 * Wait until the Fastify server is reachable before running tests.
 * Then register the preRegistered user to be used across all tests.
 */
export default async function globalSetup() {
  
  // local variables
  const baseURL     = config.use?.baseURL;
  const delay       = 1000;
  const maxAttempts = 5;
  
  let connected     = false;


  process.env.BASEURL = baseURL; // Expose baseURL to environment for use in tests

  console.log(`[SETUP] Checking if '${process.env.SERVER_NAME}' is running at '${baseURL}'...`);

  // Wait for server to be ready
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseURL}/healthcheck`);
      
      if (response.ok) {
        connected = true;
        console.log(`[SETUP] Server responded with '${response.status}'`);
        break;
      }
      else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } 
    catch (error) {
      console.log(`[SETUP] Waiting for server... (attempt ${attempt}/${maxAttempts})`);
      
      if (attempt < maxAttempts)
        await new Promise(r => setTimeout(r, delay));
    }
  }

  if (!connected)
    throw new Error(`[SETUP] Server did not become reachable after '${maxAttempts}' attempts`);

  try {

    // Generate API keys for test users
    console.log('[SETUP] Generating API keys...');
    const [ sysadminApiKey, testUserApiKey ] = await Promise.all([
      generateApiKey(process.env.SYS_USER_USERNAME, 'sysadmin'),
      generateApiKey(process.env.TEST_USER_USERNAME, 'user')
    ]);
    
    // Expose API keys to environment
    console.log('[SETUP] Exposing API Keys to environment');
    process.env.SYSADMIN_API_KEY  = sysadminApiKey;
    process.env.TEST_USER_API_KEY = testUserApiKey; 
    console.log('[SETUP] API keys generated successfully');
  }
  catch(error) {
    console.warn('[ERROR] Failed to generate API keys');
    console.error(error.message)
    throw error;
  }

  // Pre-Register user via API
  try {

    let testUser = await getTestUserData('preRegistered');
    
    // Register user via REST API
    console.log(`[SETUP] Trying to register '${testUser.firstname} ${testUser.lastname}'...`);
    const registeredUser = await registerUserViaApi(baseURL, testUser);
    
    // Expose 'preRegistered' user to environment
    process.env.PREREGISTERED_USERNAME  = registeredUser.username;
    process.env.PREREGISTERED_PASSWORD  = registeredUser.password;
    process.env.PREREGISTERED_EMAIL     = registeredUser.email;
    process.env.PREREGISTERED_FIRSTNAME = registeredUser.firstname;
    process.env.PREREGISTERED_LASTNAME  = registeredUser.lastname;
    
    console.log(`[SETUP] Successfully registered user '${process.env.PREREGISTERED_USERNAME}'`);
    
  }
  catch (error) {
    console.error("ERROR", error.message)
    throw error;
  }
}

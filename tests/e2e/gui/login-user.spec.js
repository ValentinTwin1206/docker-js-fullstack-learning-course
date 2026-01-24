// third-party imports
import { 
  test,
  expect
} from '@playwright/test';

// own imports
import { 
  loginUser,
  loginUserWithFailure 
} from '../helpers/test-helpers.js';


test.describe('User login flow', () => {
  let registeredUser;

  /**
   * Setup: Load the preRegistered user created in global.setup.js
   * This user is shared across all test cases in this suite
   */
  test.beforeAll(async () => {
    registeredUser = {
      username: process.env.PREREGISTERED_USERNAME,
      password: process.env.PREREGISTERED_PASSWORD,
      email: process.env.PREREGISTERED_EMAIL,
      firstname: process.env.PREREGISTERED_FIRSTNAME,
      lastname: process.env.PREREGISTERED_LASTNAME
    };
  });


  /**
   * Test successful login with valid credentials
   */
  test('should login with registered credentials successfully', async ({ page }) => {
    await loginUser(page, registeredUser.username, registeredUser.password);
    
    // Verify welcome message with username is displayed
    await expect(page.locator('h1')).toContainText(`Welcome ${registeredUser.username}`);
    
    console.log(`✅ Logged in user '${registeredUser.username}' successfully.`);
  });


  /**
   * Test login failure with incorrect password
   */
  test('should fail login with incorrect password', async ({ page }) => {
    await loginUserWithFailure(
      page, 
      registeredUser.username, 
      'WrongPassword123!'
    );
    
    console.log(`✅ Login rejected since user '${registeredUser.username}' used incorrect password`);
  });


  /**
   * Test login failure with non-existent username
   */
  test('should fail login with non-existent username', async ({ page }) => {
    // Use a username that doesn't exist
    const unknownUsername = `unknown_${Date.now()}`;
    
    await loginUserWithFailure(
      page, 
      unknownUsername, 
      'AnyPassword123!'
    );
    
    console.log(`✅ Login rejected since user '${unknownUsername}' does not exist`);
  });
});

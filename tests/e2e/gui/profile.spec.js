// third-party imports
import { 
  test,
  expect
} from '@playwright/test';

// own imports
import { 
  loginUser,
  registerUserViaApi
} from '../helpers/test-helpers.js';

  test.describe('User unregister flow', () => {
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
   * Test login failure with incorrect password
   */
  test('Unregister a user but cancel confirmation', async ({ page }) => {

    console.debug("Login with user", registeredUser.username, registeredUser.password);
    await loginUser(page, registeredUser.username, registeredUser.password);

    // Verify welcome message with username is displayed
    await expect(page.locator('h1')).toContainText(`Welcome ${registeredUser.username}`);
    
    console.debug("Navigate to profile page"); 
    await page.click('a[data-bs-toggle="dropdown"]');  // open dropdown
    await page.waitForSelector('#profileLink', { state: 'visible' });
    await page.click('#profileLink');   
    
    console.debug("Start unregistration but cancel it");
    await page.click('#deleteAccountButton');

    await expect(page.locator('text=Are you sure?')).toBeVisible();

    await page.click('#cancelDeleteButton');

    await expect(page.locator('text=Are you sure?')).not.toBeVisible();

    await expect(page.locator('h4')).toContainText(`${registeredUser.username}`);
  });
  
  /** 
   * 
   */
  test('Unregister a user with confirmation successfully', async ({ page }) => {

    // register a new user via API to ensure test isolation and avoid conflicts with other tests
    const testUserData = {
      "firstname": "Undine",
      "lastname": "Unregister",
      "email": `unregister+${Date.now()}@unregister.com`,
      "password": "SecurePass123!"
    }

    console.debug(`Trying to register '${testUserData.firstname} ${testUserData.lastname}'...`);
    const userToUnregister = await registerUserViaApi(process.env.BASEURL, testUserData);
    console.debug(`Successfully registered user '${userToUnregister.username}' for unregister test`);

    // login with the user
    await loginUser(page, userToUnregister.username, userToUnregister.password);

    console.debug("Navigate to profile page"); 
    await page.click('a[data-bs-toggle="dropdown"]');  // open dropdown
    await page.waitForSelector('#profileLink', { state: 'visible' });
    await page.click('#profileLink');   
    
    console.debug("Start unregistration");
    await page.click('#deleteAccountButton');

    await expect(page.locator('text=Are you sure?')).toBeVisible();

    await page.click('#confirmDeleteButton');

    await expect(page).toHaveURL(/login/);

    // Verify that login with the deleted user fails
    const result = await loginUser(page, userToUnregister.username, userToUnregister.password, { throwOnFailure: false });

    expect(result.success).toBe(false);
  });

})
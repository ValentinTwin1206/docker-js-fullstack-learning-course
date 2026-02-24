import { 
  test,
  expect
} from '@playwright/test';
import { 
  getTestUserData,
  registerUser,
  registerUserWithFailure 
} from '../helpers/test-helpers.js';

test.describe('User registration flow', () => {
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
   * Test that the preRegistered user was successfully created
   * Validates that global setup worked correctly
   */
  test('should have preRegistered user available', async ({ page }) => {
    // Verify preRegistered user exists with valid username format
    expect(registeredUser.username).toBeTruthy();
    expect(registeredUser.username).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(registeredUser.firstname).toBe('Theresa');
    expect(registeredUser.lastname).toBe('Tauscher');
    expect(registeredUser.email).toBe('theresa@tauscher.com');
    
    console.log(`✅ PreRegistered user '${registeredUser.firstname} ${registeredUser.lastname}' available as '${registeredUser.username}'`);
  });

  /**
   * Test successful user registration via UI
   * Creates a new user using the registration form and validates the response
   */
  test('should register a new user successfully via UI', async ({ page }) => {
    const testUser = await getTestUserData('john');
    
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Open the Register modal
    await page.click('button[data-bs-target="#registerModal"]');
    await page.waitForTimeout(300);
    
    // Fill registration form
    await page.fill('#registerForm input[name="firstname"]', testUser.firstname);
    await page.fill('#registerForm input[name="lastname"]', testUser.lastname);
    await page.fill('#registerForm input[name="email"]', testUser.email);
    await page.fill('#registerForm input[name="password"]', testUser.password);
    
    // Submit the form
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/v1/users') && 
        response.request().method() === 'POST'
      ),
      page.click('#registerForm button[type="submit"]')
    ]);
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    
    // Verify registration success alert is displayed
    const alertTitle = page.locator('.swal2-title');
    await expect(alertTitle).toHaveText(/Registration Successful/i, { timeout: 20000 });
    
    // Verify success message contains account creation confirmation
    const alertHtml = page.locator('.swal2-html-container');
    await expect(alertHtml).toContainText('Your account has been created!');
    
    // Extract and verify username
    const htmlContent = await alertHtml.innerHTML();
    const match = htmlContent.match(/<strong>Generated Username:<\/strong>\s*([a-zA-Z0-9._-]+)/);
    const username = match ? match[1] : '';
    
    await expect(alertHtml).toContainText('Generated Username:');
    await expect(alertHtml).toContainText(username);
    expect(username).toMatch(/^[a-zA-Z0-9._-]+$/);
    
    // Click confirm button with retry logic
    const confirmButton = page.locator('.swal2-confirm');
    await confirmButton.waitFor({ state: 'visible' });
    
    for (let i = 0; i < 3; i++) {
      try {
        await confirmButton.click({ timeout: 5000 });
        break;
      } catch (error) {
        if (i === 2) throw error;
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for modal to close
    await expect(page.locator('#registerModal')).not.toBeVisible({ timeout: 10000 });
    
    // Verify username is populated in login form
    const loginUsernameInput = page.locator('#loginForm input[name="username"]');
    await expect(loginUsernameInput).toHaveValue(username, { timeout: 10000 });
    
    //console.log(`✅ Registered '${testUser.firstname} ${testUser.lastname}' as '${username}'`);
  });

  /**
   * Test registration failure with invalid firstname
   */
  test('should fail to register a user with invalid firstname', async ({ page }) => {
    const invalidUser = await getTestUserData('invalidFirstname');
    await registerUserWithFailure(page, invalidUser);
    //console.log(`✅ Registration rejected since firstname '${invalidUser.firstname}' contains numbers`);
  });

  /**
   * Test registration failure with too short firstname
   */
  test('should fail to register a user with too short firstname', async ({ page }) => {
    const invalidUser = await getTestUserData('tooShortFirstname');
    await registerUserWithFailure(page, invalidUser);
    console.log(`✅ Registration rejected since firstname '${invalidUser.firstname}' is too short (${invalidUser.firstname.length} char)`);
  });

  /**
   * Test registration failure with invalid lastname
   */
  test('should fail to register a user with invalid lastname', async ({ page }) => {
    const invalidUser = await getTestUserData('invalidLastname');
    await registerUserWithFailure(page, invalidUser);
    //console.log(`✅ Registration rejected since lastname '${invalidUser.lastname}' contains special characters`);
  });

  /**
   * Test registration failure with invalid email
   */
  test('should fail to register a user with invalid email', async ({ page }) => {
    const invalidUser = await getTestUserData('invalidEmail');
    await registerUserWithFailure(page, invalidUser);
    //console.log(`✅ Registration rejected since email '${invalidUser.email}' is not valid format`);
  });

  /**
   * Test registration failure with short password
   */
  test('should fail to register a user with short password', async ({ page }) => {
    const invalidUser = await getTestUserData('shortPassword');
    await registerUserWithFailure(page, invalidUser);
    //console.log(`✅ Registration rejected since password '${invalidUser.password}' is too short (${invalidUser.password.length} chars)`);
  });

});

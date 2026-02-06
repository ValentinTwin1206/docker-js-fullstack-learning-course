import { SignJWT } from 'jose';

/**
 * Get test user data from JSON fixtures with optional unique email generation
 * @param {string} username - The template name from test-users.json
 * @returns {{firstname: string, lastname: string, email: string, password: string, username?: string}}
 */
export const getTestUserData = async username => {
  const testUsersModule = await import('../fixtures/test-users.json', { with: { type: 'json' } });
  const testUsersData = testUsersModule.default;
  const { firstname, lastname, password, email } = testUsersData[username];
  return {
    firstname,
    lastname,
    email: email || `${lastname.toLowerCase()}.${Date.now()}@example.com`,
    password
  };
};


/**
 * Login with username and password for Playwright tests
 * 
 * @param {object} page - Playwright page object
 * @param {string} username - Username to login with
 * @param {string} password - Password to login with
 * @param {object} [options] - Options object
 * @param {boolean} [options.throwOnFailure=true] - Whether to throw error on login failure
 */
export const loginUser = async (page, username, password, options = {}) => {
  const throwOnFailure = options.throwOnFailure ?? true;

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  await page.fill('#loginForm input[name="username"]', username);
  await page.fill('#loginForm input[name="password"]', password);
  
  // Submit and wait for response
  await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/login') && 
      response.request().method() === 'POST'
    ),
    page.click('#loginForm button[type="submit"]')
  ]);
  
  // Wait for network to settle
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  
  try {
    await page.waitForURL('/home', { timeout: 20000 });
    await page.waitForLoadState('domcontentloaded');
    return { success: true };
  } 
  catch (e) {
    const hasAlert = await page.locator('.swal2-container').isVisible().catch(() => false);
    
    if (hasAlert) {
      const alertText = await page.locator('.swal2-html-container').textContent();
    
      if (throwOnFailure)
        throw new Error(`Login failed: ${alertText}`);

      return { success: false, error: alertText };
    }

    if (throwOnFailure)
      throw e;
  
    return { success: false, error: e.message };
  }
};


/**
 * Attempt login and expect failure
 */
export const loginUserWithFailure = async (page, username, password) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Fill in login form
  await page.fill('#loginForm input[name="username"]', username);
  await page.fill('#loginForm input[name="password"]', password);
  
  // Submit the form and wait for response
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/login') && res.request().method() === 'POST'),
    page.click('#loginForm button[type="submit"]'),
  ]);
  
  // Wait for error alert
  await page.waitForSelector('.swal2-title', { state: 'visible' });
  const alertTitle = page.locator('.swal2-title');
  const titleText = await alertTitle.textContent();
  if (!titleText.match(/Login Failed|Error/i)) {
    throw new Error('Expected login failure alert');
  }
};


/**
 * Register a new user via the UI
 * @returns The registered user with username populated
 */
export const registerUser = async (page, user) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Open the Register modal
  await page.click('button[data-bs-target="#registerModal"]');
  await page.waitForTimeout(300); // Wait for modal animation
  
  // Fill registration form
  await page.fill('#registerForm input[name="firstname"]', user.firstname);
  await page.fill('#registerForm input[name="lastname"]', user.lastname);
  await page.fill('#registerForm input[name="email"]', user.email);
  await page.fill('#registerForm input[name="password"]', user.password);
  
  // Submit the form and wait for network to be idle
  await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/v1/users') && 
      response.request().method() === 'POST'
    ),
    page.click('#registerForm button[type="submit"]')
  ]);
  
  // Wait for network to settle before checking for SweetAlert
  await page.waitForLoadState('networkidle');
  
  // Wait for the SweetAlert modal and extract username with retries
  await page.waitForSelector('.swal2-html-container', { state: 'visible', timeout: 20000 });
  const htmlContent = await page.locator('.swal2-html-container').innerHTML();
  // Extract username from HTML like "<p><strong>Generated Username:</strong> john1234</p>"
  const match = htmlContent.match(/<strong>Generated Username:<\/strong>\s*([a-zA-Z0-9._-]+)/);
  const username = match ? match[1] : '';

  return {
    ...user,
    username,
  };
};


/**
 * Attempt to register a user and expect failure
 */
export const registerUserWithFailure = async (page, user) => {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Open the Register modal
  await page.click('button[data-bs-target="#registerModal"]');
  
  // Disable HTML5 validation to test server-side validation
  await page.evaluate(() => {
    const form = document.querySelector('#registerForm');
    if (form) form.setAttribute('novalidate', 'true');
  });
  
  // Fill registration form
  await page.fill('#registerForm input[name="firstname"]', user.firstname);
  await page.fill('#registerForm input[name="lastname"]', user.lastname);
  await page.fill('#registerForm input[name="email"]', user.email);
  await page.fill('#registerForm input[name="password"]', user.password);
  
  // Submit the form and wait for response
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/v1/users') && res.status() >= 400),
    page.click('#registerForm button[type="submit"]'),
  ]);
  
  // Wait for error alert
  const alertTitle = page.locator('.swal2-title');
  const titleText = await alertTitle.textContent();
  if (!titleText.match(/Error/i)) {
    throw new Error('Expected error alert');
  }
};


/**
 * Generate JWT API key for a given username
 * 
 * Creates a JWT token using the same logic as the application's API key generation.
 * Uses the APIKEY_JWT_SECRET from environment variables and generates a token with 1 year expiration.
 * 
 * @param {string} username - The username to generate the API key for
 * @param {string} role - The role to assign (default: 'user')
 * @returns {Promise<string>} The generated JWT token
 * 
 * @example
 * const apiKey = await generateApiKey('testuser5678', 'user');
 * // Use in API requests with Authorization: Bearer <apiKey>
 */
export const generateApiKey = async (username, role = 'user') => {
  const { APIKEY_JWT_SECRET } = process.env;
  
  if (!APIKEY_JWT_SECRET)
    throw new Error('[ERROR] APIKEY_JWT_SECRET not found in environment');
  
  const secretKey = new TextEncoder().encode(APIKEY_JWT_SECRET);
  
  const token = await new SignJWT({ 
    sub: username, 
    role: role, 
    type: "api-key" 
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(secretKey);
  
  return token;
};
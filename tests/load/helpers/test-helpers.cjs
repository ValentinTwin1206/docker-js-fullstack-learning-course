const { faker } = require('@faker-js/faker');
const fs        = require('fs');
const path      = require('path');
const { SignJWT } = require('jose');

/**
 * Artillery processor function to create random user data using Faker
 * 
 * @param {object} context - Artillery context object containing vars, funcs, etc.
 * @param {object} events - Artillery event emitter for custom metrics
 * @param {function} done - Callback to signal completion of the processor function
 */
const createRandomUser = (context, events, done) => {
  context.vars.randomUser = {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password({
      length: 12,
      memorable: true,
      pattern: /[A-Za-z0-9!]/ 
    })
  };
  return done();
};


/**
 * Artillery processor function to create a random file using Faker
 * 
 * Generates a temporary file with random content and stores the file path
 * in context.vars for use in subsequent requests (e.g., file uploads).
 * 
 * Generated file properties:
 * - filename: Random word + timestamp + extension (e.g., "report_1234567890.txt")
 * - content: Random lorem ipsum text, structured data, or binary content
 * - size: Varies by file type (text files ~1-5KB, binary files 1-10KB)
 * 
 * Usage in Artillery YAML:
 * ```yaml
 * flow:
 *   - function: "createRandomFile"
 *   - post:
 *       url: "/api/v1/files"
 *       formData:
 *         file:
 *           fromFile: "{{ randomFilePath }}"
 * ```
 * 
 * @param {object} context - Artillery context object containing vars, funcs, etc.
 * @param {object} events - Artillery event emitter for custom metrics
 * @param {function} done - Callback to signal completion of the processor function
 */
const createRandomFile = (context, events, done) => {
  const timestamp = Date.now();
  const extension = faker.helpers.arrayElement(['txt', 'md', 'csv', 'log', 'json', 'html', 'bin']);
  const filename  = `${faker.word.noun()}_${timestamp}.${extension}`;
  const filePath  = path.join('/tmp', filename);
  
  // Generate random content based on file type (matching seedFakeFiles in database.js)
  let content;
  let isBinary = false;
  
  switch (extension) {
    case 'txt':
      content = faker.lorem.paragraphs(3);
      break;
      
    case 'md':
      content = `# ${faker.lorem.sentence()}\n\n${faker.lorem.paragraphs(2)}`;
      break;
      
    case 'csv':
      const headers = 'id,name,email,department\n';
      const rows = Array.from({ length: 5 }, () => 
        `${faker.string.uuid()},${faker.person.fullName()},${faker.internet.email()},${faker.commerce.department()}`
      ).join('\n');
      content = headers + rows;
      break;
      
    case 'log':
      content = Array.from({ length: 10 }, () => 
        `[${faker.date.recent().toISOString()}] ${faker.helpers.arrayElement(['INFO', 'WARN', 'ERROR'])}: ${faker.lorem.sentence()}`
      ).join('\n');
      break;
      
    case 'json':
      content = JSON.stringify({
        id: faker.string.uuid(),
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        author: faker.person.fullName(),
        createdAt: faker.date.recent().toISOString(),
        tags: faker.helpers.multiple(() => faker.word.noun(), { count: 3 })
      }, null, 2);
      break;
      
    case 'html':
      content = `<!DOCTYPE html><html><head><title>${faker.lorem.words(3)}</title></head><body><h1>${faker.lorem.sentence()}</h1><p>${faker.lorem.paragraph()}</p></body></html>`;
      break;
      
    case 'bin':
      // Generate binary data (1-10 KB)
      const size = 1024 + Math.floor(Math.random() * 9 * 1024);
      content = Buffer.from(faker.string.alphanumeric(size));
      isBinary = true;
      break;
      
    default:
      content = faker.lorem.paragraphs(5, '\n\n');
  }
  
  // Write file to disk
  if (isBinary)
    fs.writeFileSync(filePath, content);
  else
    fs.writeFileSync(filePath, content, 'utf-8');
  
  // Store file information in context
  context.vars.randomFilePath = filePath;
  context.vars.randomFileName = filename;
  context.vars.randomFileSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
  
  return done();
};


/**
 * Artillery Playwright function to login a user
 * 
 * Reads username and password from context.vars
 * Does not throw on failure - returns success status for Artillery metrics
 * 
 * Usage in Artillery YAML:
 * ```yaml
 * - engine: playwright
 *   testFunction: loginUser
 * ```
 * 
 * @param {object} page - Playwright page object
 * @param {object} context - Artillery context object containing vars
 */
const loginUser = async (page, context) => {
  const username = context.vars.username;
  const password = context.vars.password;

  // Navigate to login page
  await page.goto('/login', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  // Fill login form
  await page.fill('#loginForm input[name="username"]', username);
  await page.fill('#loginForm input[name="password"]', password);

  // Submit login form
  await page.click('#loginForm button[type="submit"]');
  
  try {
    // Wait for navigation to home page
    await page.waitForURL('/home', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    console.log(`User '${username}' successfully logged in`);
    
    // Logout the user
    await page.goto('/logout');
    await page.waitForLoadState('domcontentloaded');
    
    return { success: true };
  }
  catch (e) {
    const hasAlert = await page.locator('.swal2-container').isVisible().catch(() => false);
    if (hasAlert) {
      const alertText = await page.locator('.swal2-html-container').textContent();
      return { success: false, error: alertText };
    }
    return { success: false, error: e.message };
  }
};


/**
 * Artillery Playwright function to register a new user
 * 
 * Generates random user data using Faker and attempts registration
 * The registration may succeed (201) or fail (400/409) naturally
 * 
 * Usage in Artillery YAML:
 * ```yaml
 * - engine: playwright
 *   testFunction: registerUser
 * ```
 * 
 * @param {object} page - Playwright page object
 * @param {object} context - Artillery context object containing vars
 */
const registerUser = async (page, context) => {
  // Generate random user data with Faker
  const userData = {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(
      {
        length: 12,
        memorable: true, 
        pattern: /[A-Za-z0-9!]/
      }
    )
  };

  await page.goto('/login', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  // Open the Register modal
  await page.click('button[data-bs-target="#registerModal"]');
  await page.waitForTimeout(500); // Wait for modal animation
  
  // Fill registration form
  await page.fill('#registerForm input[name="firstname"]', userData.firstname);
  await page.fill('#registerForm input[name="lastname"]', userData.lastname);
  await page.fill('#registerForm input[name="email"]', userData.email);
  await page.fill('#registerForm input[name="password"]', userData.password);
  
  // Submit the form
  await page.click('#registerForm button[type="submit"]');
  
  // Wait for SweetAlert response
  await page.waitForSelector('.swal2-html-container', { state: 'visible', timeout: 15000 });
  const htmlContent = await page.locator('.swal2-html-container').innerHTML();
  
  // Check if registration was successful
  const usernameMatch = htmlContent.match(/<strong>Generated Username:<\/strong>\s*([a-zA-Z0-9._-]+)/);
  if (usernameMatch) {
    const generatedUsername = usernameMatch[1];
    console.log(`User registered: ${generatedUsername}`);
    
    // Store in context for potential use in subsequent flows
    context.vars.registeredUsername = generatedUsername;
    context.vars.registeredEmail = userData.email;
    context.vars.registeredPassword = userData.password;
    
    return { success: true, username: generatedUsername };
  } else {
    // Registration failed
    const alertText = await page.locator('.swal2-html-container').textContent();
    console.log(`Registration failed: ${alertText}`);
    return { success: false, error: alertText };
  }
};


/**
 * Silence the metrics warning
 */
const metricsByEndpoint_afterResponse = (requestParams, response, context, ee, next) => {
  // You could add custom logic here to track metrics by URL if you wanted
  return next(); 
};


/**
 * Artillery beforeScenario hook to generate API keys for test users
 * 
 * Generates API keys for sysadmin and test user before each scenario starts.
 * Stores the tokens in context.vars for use in subsequent requests.
 * 
 * @param {object} context - Artillery context object
 * @param {object} events - Event emitter
 */
const generateApiKeys = async (context, events) => {
  try {
    const sysadminUsername  = process.env.SYS_USER_USERNAME;
    const testUserUsername  = process.env.TEST_USER_USERNAME;
    const APIKEY_JWT_SECRET = process.env.APIKEY_JWT_SECRET;
    
    if (!sysadminUsername || !testUserUsername) {
      console.error('[ERROR] SYS_USER_USERNAME or TEST_USER_USERNAME not found in environment');
      throw new Error('Missing required environment variables');
    }
    
    if (!APIKEY_JWT_SECRET) {
      console.error('[ERROR] APIKEY_JWT_SECRET not found in environment');
      throw new Error('Missing APIKEY_JWT_SECRET');
    }
    
    const secretKey = new TextEncoder().encode(APIKEY_JWT_SECRET);
    
    // Generate sysadmin API key
    const sysadminToken = await new SignJWT({ 
      sub: sysadminUsername, 
      role: 'sysadmin', 
      type: "api-key" 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime('1y')
      .sign(secretKey);
    
    // Generate test user API key
    const testUserToken = await new SignJWT({ 
      sub: testUserUsername, 
      role: 'user', 
      type: "api-key" 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime('1y')
      .sign(secretKey);
    
    // Store in context for use in requests
    context.vars.SYS_USER_TOKEN = sysadminToken;
    context.vars.TEST_USER_TOKEN = testUserToken;
    context.vars.TEST_USER_USERNAME = testUserUsername;
  } catch (error) {
    console.error('[ERROR] Failed to generate API keys:', error.message);
    throw error;
  }
};


module.exports = {
  createRandomUser,
  createRandomFile,
  metricsByEndpoint_afterResponse,
  loginUser,
  registerUser,
  generateApiKeys
};
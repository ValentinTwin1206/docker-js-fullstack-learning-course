import bcrypt                   from "bcrypt";
import mongoose                 from "mongoose";
import mongooseSchemaJsonschema from "mongoose-schema-jsonschema";
import path                     from "path";
import { 
  fileURLToPath
} from "url";

// own imports
import { 
  cleanUpCollection,
  createJwtToken,
  readJsonFile,
  toObjectId
} from '../common/utils/utils.js';
import File from '../modules/files/files.model.js'
import { 
  createApiKey
} from '../modules/apikeys/apikeys.services.js';
import { 
  createFile
} from "../modules/files/files.services.js";
import { 
  createUser,
  createUsersBulk
} from '../modules/users/users.services.js';
import { 
  createUserRolesBulk,
  getUserRole
} from '../modules/roles/roles.services.js';
import { 
  createUsersGrowth,
  getUsersGrowth
} from "../modules/usergrowths/usergrowths.services.js";
import {
  createApiStatistics
} from "../modules/apistatistics/apistatistics.services.js";

// globals
const __DIRNAME   = path.dirname(fileURLToPath(import.meta.url));
const IS_PROD     = process.env.IS_PROD || false;
const MONGO_URI   = process.env.MONGO_URI;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;


/**
 * Seed the database with fake files of various types for a specified user.
 * 
 * Generates random files with diverse content types including text documents,
 * structured data, markup, and binary files. Each file is uploaded to GridFS
 * storage and its metadata is saved to the MongoDB files collection.
 * 
 * @param {FastifyInstance} app - Fastify application instance with GridFS connection (app.gfs)
 * @param {string} uploadedBy - Username of the file owner
 * @param {number} count - Number of random files to generate and upload
 * @returns {Promise<void>}
 * @throws {Error} If GridFS upload fails or file metadata creation fails
 */
const seedFakeFiles = async (app, uploadedBy, count) => {
  const { faker } = await import("@faker-js/faker");

  // supported fake file definitions
  const fileTypes = [
    { 
      ext: '.txt',
      mimetype: 'text/plain',
      generator: () => faker.lorem.paragraphs(3)
    },
    { 
      ext: '.md',
      mimetype: 'text/markdown',
      generator: () => `# ${faker.lorem.sentence()}\n\n${faker.lorem.paragraphs(2)}`
    },
    {
      ext: '.csv',
      mimetype: 'text/csv',
      generator: () => {
        const headers = 'id,name,email,department\n';
        const rows = Array.from({ length: 5 }, () => 
          `${faker.string.uuid()},${faker.person.fullName()},${faker.internet.email()},${faker.commerce.department()}`
        ).join('\n');
        return headers + rows;
      }
    },
    { 
      ext: '.log',
      mimetype: 'text/plain',
      generator: () => {
        return Array.from({ length: 10 }, () => 
          `[${faker.date.recent().toISOString()}] ${faker.helpers.arrayElement(['INFO', 'WARN', 'ERROR'])}: ${faker.lorem.sentence()}`
        ).join('\n');
      }
    },
    {
      ext: '.json',
      mimetype: 'application/json',
      generator: () => JSON.stringify({
        id: faker.string.uuid(),
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        author: faker.person.fullName(),
        createdAt: faker.date.recent().toISOString(),
        tags: faker.helpers.multiple(() => faker.word.noun(), { count: 3 })
      }, null, 2)
    },
    {
      ext: '.html',
      mimetype: 'text/html',
      generator: () => 
        `<!DOCTYPE html><html><head><title>${faker.lorem.words(3)}</title></head><body><h1>${faker.lorem.sentence()}</h1><p>${faker.lorem.paragraph()}</p></body></html>`
    },
    { 
      ext: '.bin',
      mimetype: 'application/octet-stream',
      isBinary: true,
      generator: () => {
        const size = 1024 + Math.floor(Math.random() * 9 * 1024);
        return Buffer.from(faker.string.alphanumeric(size));
      }
    },
  ];


  for (let i = 0; i < count; i++) {
    // Random file type
    const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const filename = faker.system.fileName().split(".")[0] + fileType.ext;
    const mimetype = fileType.mimetype;
    const isBinary = fileType.isBinary || false;

    // Generate content
    const content = fileType.generator();
    const bufferContent = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");
    const size = bufferContent.length;

    // Upload to file storage (GridFS)
    const uploadStream = app.gfs.openUploadStream(filename, {
      contentType: mimetype,
      metadata: { uploadedBy },
    });
    uploadStream.end(bufferContent);

    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    // Save metadata to database
    await createFile({
      originalName: filename,
      filename,
      mimetype,
      size,
      uploadedBy,
      fileStorageId: uploadStream.id,
      isBinary
    });
  }
};


/**
 * Seed the database with test user accounts with realistic profile data.
 * 
 * Generates random user accounts with unique emails, usernames, and secure
 * hashed passwords. All generated users are assigned the default 'user' role.
 * Implements email uniqueness validation with fallback to index-based emails
 * to prevent collisions. Usernames are sanitized to alphanumeric characters
 * with a random suffix to ensure uniqueness.
 * 
 * @param {FastifyInstance} app - Fastify application instance for logging
 * @param {number} count - Number of test users to create
 * @returns {Promise<Array>} Array of created user documents
 * @throws {Error} If 'user' role is not found or bulk insert fails
 */
const seedFakeUsers = async (app, count) => {
  const { faker } = await import("@faker-js/faker");
  const userRole  = await getUserRole("user");

  if (!userRole?._id)
    throw new Error("Could not find 'user' role");

  const usedEmails = new Set();

  const usersData = await Promise.all(
    Array.from({ length: count }).map(async (_, index) => {
      const first = faker.person.firstName();
      const last  = faker.person.lastName();
      const baseUsername = `${first}${last}`.toLowerCase();
      const cleanUsername = baseUsername.replace(/[^a-z0-9]/g, "") + faker.string.alphanumeric(4).toLowerCase();

      // Generate realistic unique email
      let email;
      let attempts = 0;
      do {
        email = faker.internet.email({ firstName: first, lastName: last });
        attempts++;
        // Fallback: if we can't find unique email after 10 tries, append index
        if (attempts > 10) {
          email = `${first.toLowerCase()}.${last.toLowerCase()}.${index}@example.com`;
          break;
        }
      } while (usedEmails.has(email));
      usedEmails.add(email);

      const password = faker.internet.password({ length: 12, memorable: true });
      const hashedPw = await bcrypt.hash(password, SALT_ROUNDS);

      return {
        firstname: first,
        lastname: last,
        email: email,
        username: cleanUsername,
        password: hashedPw,
        role: userRole._id,
      };
    })
  );

  const users = await createUsersBulk(usersData);
  if (!users?.length) throw new Error("Failed to insert test users");

  app.log.info(`Inserted '${users.length}' test user(s).`);
  return users;
};


/**
 * Seed historical user growth data with realistic patterns.
 * Generates fake growth statistics for the past 30 days to populate
 * the dashboard with demo data and test chart functionality.
 * 
 * @param {FastifyInstance} app - The Fastify application instance with logging capabilities
 * @param {number} days - Number of days in the past to generate data for (default: 29, excluding today)
 * @returns {Promise<void>}
 */
const seedFakeUsersGrowth = async (app, days) => {
  const { faker } = await import("@faker-js/faker");
  
  try {
    app.log.debug(`Generating historical user-growth for the past '${days}' days...`);
    
    for (let i = days; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      
      // Create realistic growth patterns
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Registrations: fewer on weekends, more on weekdays
      const baseRegistrations = isWeekend 
        ? faker.number.int({ min: 5, max: 20 })
        : faker.number.int({ min: 15, max: 50 });
      
      // Deletions: typically 5-15% of registrations, with some random variation
      const maxDeletions = Math.floor(baseRegistrations * 0.15);
      const deletions = faker.number.int({ min: 0, max: Math.max(1, maxDeletions) });
      
      // Ensure we have net positive growth most days
      const registrations = deletions > 0 && Math.random() < 0.1 
        ? deletions + faker.number.int({ min: 0, max: 5 }) // Occasionally low/negative growth
        : baseRegistrations;
      
      await createUsersGrowth(date, registrations, deletions);
    }
    
    app.log.debug(`Created '${days}' historical user-growth records`);
  } catch (err) {
    app.log.warn("Failed to seed historical growth data");
    app.log.error(err.message);
  }
};


/**
 * Seed fake API statistics for historical analysis.
 * 
 * Generates realistic API usage data for the specified number of days.
 * Creates daily statistics with varying request counts, routes, latencies,
 * and status codes to simulate real-world API traffic patterns.
 * 
 * @param {FastifyInstance} app - Fastify application instance for logging
 * @param {number} days - Number of historical days to generate
 */
const seedFakeApiStatistics = async (app, days) => {
  const { faker } = await import("@faker-js/faker");
  
  try {
    app.log.debug(`Generating historical API statistics for the past '${days}' days...`);
    
    // Common API routes to simulate
    const commonRoutes = [
      { path: '/api/v1/users', method: 'GET' },
      { path: '/api/v1/users/:id', method: 'GET' },
      { path: '/api/v1/users', method: 'POST' },
      { path: '/api/v1/users/:id', method: 'PUT' },
      { path: '/api/v1/users/:id', method: 'DELETE' },
      { path: '/api/v1/files', method: 'GET' },
      { path: '/api/v1/files/:id', method: 'GET' },
      { path: '/api/v1/files', method: 'POST' },
      { path: '/api/v1/files/:id', method: 'DELETE' },
      { path: '/api/v1/apikeys', method: 'GET' },
      { path: '/api/v1/apikeys', method: 'POST' },
      { path: '/api/v1/roles', method: 'GET' },
    ];
    
    for (let i = days; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Generate routes with realistic request counts
      const routes = commonRoutes.map(route => {
        // Fewer requests on weekends
        const baseCount = isWeekend 
          ? faker.number.int({ min: 10, max: 50 })
          : faker.number.int({ min: 50, max: 300 });
        
        // Some routes are more popular than others
        const popularityFactor = route.method === 'GET' ? 1.5 : 1.0;
        const count = Math.floor(baseCount * popularityFactor);
        
        // Realistic latency distribution (most requests are fast, some are slow)
        const latencies = [];
        for (let j = 0; j < count; j++) {
          if (Math.random() < 0.05) {
            // 5% slow requests (200-800ms)
            latencies.push(faker.number.int({ min: 200, max: 800 }));
          } else if (Math.random() < 0.2) {
            // 20% medium requests (80-200ms)
            latencies.push(faker.number.int({ min: 80, max: 200 }));
          } else {
            // 75% fast requests (20-80ms)
            latencies.push(faker.number.int({ min: 20, max: 80 }));
          }
        }
        
        // Calculate percentiles
        const sortedLatencies = latencies.sort((a, b) => a - b);
        const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
        const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
        const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
        const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
        
        // Status code distribution
        // 90% success (2xx), 8% client errors (4xx), 2% server errors (5xx)
        const successCount = Math.floor(count * 0.90);
        const clientErrorCount = Math.floor(count * 0.08);
        const serverErrorCount = count - successCount - clientErrorCount;
        
        return {
          path: route.path,
          method: route.method,
          count,
          latency: {
            avg: Math.round(avgLatency),
            min: Math.min(...latencies),
            max: Math.max(...latencies),
            p50: Math.round(p50),
            p95: Math.round(p95),
            p99: Math.round(p99)
          },
          statusCodes: {
            success: successCount,
            clientError: clientErrorCount,
            serverError: serverErrorCount
          }
        };
      });
      
      // Calculate overall statistics
      const totalRequests = routes.reduce((sum, r) => sum + r.count, 0);
      const allLatencies = routes.flatMap(r => {
        const avg = r.latency.avg;
        return Array(r.count).fill(avg);
      });
      const sortedAllLatencies = allLatencies.sort((a, b) => a - b);
      
      const performance = {
        avg: Math.round(allLatencies.reduce((sum, val) => sum + val, 0) / allLatencies.length),
        p50: sortedAllLatencies[Math.floor(sortedAllLatencies.length * 0.5)],
        p95: sortedAllLatencies[Math.floor(sortedAllLatencies.length * 0.95)],
        p99: sortedAllLatencies[Math.floor(sortedAllLatencies.length * 0.99)]
      };
      
      const errors = routes.reduce((sum, r) => 
        sum + r.statusCodes.clientError + r.statusCodes.serverError, 0);
      
      await createApiStatistics(date, {
        totalRequests,
        routes,
        performance,
        errors
      });
    }
    
    app.log.debug(`Created '${days}' historical API statistics records`);
  } catch (err) {
    app.log.warn("Failed to seed historical API statistics");
    app.log.error(err.message);
  }
};


/**
 * Seed built-in user roles into the database.
 * 
 * Loads role definitions from the roles.json resource file and creates
 * them in the database. Roles include permissions and access levels for
 * the application (e.g., 'user', 'admin', 'sysadmin').
 * 
 * @param {FastifyInstance} app - Fastify application instance for logging
 * @returns {Promise<void>}
 * @throws {Error} If roles.json is empty or role creation fails
 */
const seedUserRoles = async app => {
  
  const rolesJSON = await readJsonFile(path.join(__DIRNAME, "../resources/roles.json"));
  
  if (!rolesJSON.length)
    throw new Error("No built-in roles found");
  
  const mappedRoles = rolesJSON.map(r => ({ ...r, _id: toObjectId(r._id) }));
  
  const roles = await createUserRolesBulk(mappedRoles);

  if (!roles?.length)
    throw new Error("Failed to insert roles");

  app.log.info(`Inserted '${roles.length}' role(s).`);
  app.log.debug(roles);
};


const seedSysadmin = async app => {

  const sysadminRole = await getUserRole("sysadmin");
  if (!sysadminRole) 
    throw new Error("Could not find 'sysadmin' user role");

  app.log.debug(`Trying to hash password for '${process.env.SYS_USER_USERNAME}'`)
  const hashedPw = await bcrypt.hash(process.env.SYS_USER_PASS, SALT_ROUNDS);

  app.log.debug(`Trying to create user '${process.env.SYS_USER_USERNAME}'`)
  const sysadminUser = await createUser({
    firstname: process.env.SYS_USER_FIRST,
    lastname: process.env.SYS_USER_LAST,
    email: process.env.SYS_USER_MAIL,
    password: hashedPw,
    role: sysadminRole._id,
    username: process.env.SYS_USER_USERNAME,
  });

  if (!sysadminUser)
    throw new Error("Could not create sysadmin");

  app.log.info(`Sysadmin user '${sysadminUser.username}' created successfully`);
  
  // Create ONE bootstrap API key for cross-container testing
  // This key is used by tests running in devcontainer to access the app container
  app.log.debug(`Generating bootstrap API key for '${sysadminUser.username}'`);
  const sysadminToken = await createJwtToken(sysadminUser.username, "sysadmin");
  const { createHash } = await import('crypto');
  const sysadminTokenHash = createHash('sha256').update(sysadminToken).digest('hex');
  
  const apiKeySysAdmin = await createApiKey(
    sysadminUser.username,
    "bootstrap-key",
    sysadminTokenHash,
    "sysadmin"
  );
  
  if (!apiKeySysAdmin)
    throw new Error("Could not create sysadmin API key");
  
  // Export token to environment for cross-container test access
  process.env.SYS_USER_TOKEN = sysadminToken;
  app.log.info(`Bootstrap API key for '${sysadminUser.username}' exported to SYS_USER_TOKEN`);
};


const seedTestUser = async app => {

  const userRole = await getUserRole("user");
  if (!userRole) 
    throw new Error("Could not find 'user' user role");

  app.log.debug(`Trying to hash password for '${process.env.TEST_USER_USERNAME}'`)
  const hashedPw = await bcrypt.hash(process.env.TEST_USER_PASS, SALT_ROUNDS);

  app.log.debug(`Trying to create user '${process.env.TEST_USER_USERNAME}'`)
  const testUser = await createUser({
    firstname: process.env.TEST_USER_FIRST,
    lastname: process.env.TEST_USER_LAST,
    email: process.env.TEST_USER_MAIL,
    password: hashedPw,
    role: userRole._id,
    username: process.env.TEST_USER_USERNAME,
  });

  if (!testUser)
    throw new Error("Could not create 'testuser'");

  app.log.info(`Test user '${testUser.username}' created successfully`);
  
  // Create ONE bootstrap API key for cross-container testing
  // This key is used by tests running in devcontainer to access the app container
  app.log.debug(`Generating bootstrap API key for '${testUser.username}'`);
  const testUserToken = await createJwtToken(testUser.username, "user");
  const { createHash } = await import('crypto');
  const testUserTokenHash = createHash('sha256').update(testUserToken).digest('hex');
  
  const apiKeyTestUser = await createApiKey(
    testUser.username,
    "bootstrap-key",
    testUserTokenHash,
    "user"
  );
  
  if (!apiKeyTestUser)
    throw new Error("Could not create API key for 'testuser'");
  
  // Export token to environment for cross-container test access
  process.env.TEST_USER_TOKEN = testUserToken;
  app.log.info(`Bootstrap API key for '${testUser.username}' exported to TEST_USER_TOKEN`);
};


/**
 * Initialize today's user growth document.
 * 
 * Ensures a document exists for the current day with the actual seeded 
 * user count. This provides accurate baseline data matching the database 
 * state.
 * 
 * @param {FastifyInstance} app - The Fastify application instance with logging capabilities
 * @param {number} seededUserCount - Number of users seeded during database initialization
 * @returns {Promise<void>}
 */
const seedTodaysGrowth = async (app, seededUserCount = 0) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Check if document already exists for today
    const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const existingData = await getUsersGrowth({ 
      startDate: todayStr, 
      endDate: todayStr 
    });
    
    if (existingData && existingData.dailyData && existingData.dailyData.length > 0) {
      const existing = existingData.dailyData[0];
      app.log.debug(`User growth document for today already exists (${existing.registrations} registrations, ${existing.deletions} deletions)`);
      return;
    }
    
    // Create document with exact seeded user count as registrations, 0 deletions
    // This ensures total registrations = seededUserCount, total deletions = 0, net growth = seededUserCount
    await createUsersGrowth(today, seededUserCount, 0);
    app.log.debug(`Created user-growth document with '${seededUserCount}' registrations for today`);
  } catch (err) {
    app.log.warn("Failed to initialize today's growth document");
    app.log.error(err.message)
  }
};


/**
 * Sets up the MongoDB database connection and performs initial seeding operations.
 * 
 * This function performs the following operations in sequence:
 * 1. Establishes connection to MongoDB using Mongoose
 * 2. Sets up GridFS bucket for file storage
 * 3. Enables JSON schema generation for Mongoose models
 * 4. Cleans up existing collections (apikeys, files, roles, users, usagestats)
 * 5. Synchronizes all model indexes with the database
 * 6. Creates text search indexes for file collections
 * 7. Seeds the database with:
 *    - Built-in user roles (user, admin, sysadmin)
 *    - System administrator account
 *    - Today's user growth tracking document
 *    - Test user account (non-production only)
 *    - Sample files and users (non-production only)
 * 
 * @param {FastifyInstance} app - The Fastify application instance with logging capabilities
 * @returns {Promise<void>}
 * @throws {Error} If database connection fails or seeding operations encounter errors
 */
export const setupDatabase = async app => {
  try {
    app.log.info(`Trying to connect to MongoDB on '${MONGO_URI}'...`)
    mongoose.set("strictQuery", true);
    await mongoose.connect(MONGO_URI, { monitorCommands: false });
    app.log.debug(`Connected to MongoDB at '${MONGO_URI}'`);

    // GridFS
    const GFS = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    app.decorate("gfs", GFS);
    app.log.debug("Successfully created 'GridFS' connection.");

    // Plugin JSON schemas to mongoose schemas
    mongooseSchemaJsonschema(mongoose);

    // Cleanup collections
    app.log.info("Trying to clean up database...");
    await Promise.all([
      cleanUpCollection("apikeys"),
      cleanUpCollection("apistatistics"),
      cleanUpCollection("files"),
      cleanUpCollection("roles"),
      cleanUpCollection("users"),
      cleanUpCollection("usagestats"),
      cleanUpCollection("usergrowths")
    ]);
    app.log.debug("Database cleanup completed.");

    // Ensure all schema indexes are created in MongoDB
    app.log.info("Synchronizing model indexes...");
    try {
      await mongoose.connection.syncIndexes();
      app.log.debug("Model indexes synchronized successfully.");
    } catch (indexError) {
      app.log.error("Failed to synchronize indexes, but continuing startup:");
      app.log.error(indexError.message);
    }

    // Apply full text search
    app.log.info("Enabling text search...");
    await Promise.all([
      File.collection.createIndex({ originalName: "text" }), 
    ]);
    app.log.debug("Indexes ensured successfully.");

    // Seed user roles
    app.log.info("Trying to seed built-in user roles...");
    await seedUserRoles(app);
    app.log.debug("Built-in user roles created successfully");

    // Seed sysadmin account
    app.log.info(`Trying to seed '${process.env.SYS_USER_USERNAME}' user account...`);
    await seedSysadmin(app);

    let appUsers = 1;

    if (String(IS_PROD).toLowerCase() === "false") {

      // constants
      const countFiles = process.env.COUNT_FILES || 500;
      const countUsers = process.env.COUNT_USERS || 500;
      const countDays  = process.env.COUNT_DAYS  || 29; 

      // Seed test user account
      app.log.info(`Trying to seed '${process.env.TEST_USER_USERNAME}' user account...`);
      await seedTestUser(app);
      appUsers++;

      // Seed files for sysadmin
      app.log.info(`Trying to seed '${countFiles}' test files for '${process.env.SYS_USER_USERNAME}'`);
      await seedFakeFiles(app, process.env.SYS_USER_USERNAME, countFiles);
      app.log.debug("Test files created successfully");

      // Seed fake users
      app.log.info(`Trying to seed '${countUsers}' test users data`);
      const fakeusers = await seedFakeUsers(app, countUsers);
      appUsers += fakeusers.length;
      app.log.debug("Test users created successfully");

      // Seed historical user growth data for the past 29 days
      app.log.info("Seeding historical user growth data for the past 29 days...");
      await seedFakeUsersGrowth(app, countDays);
      app.log.debug("Historical growth data created successfully");

      // Seed historical API statistics for the past 29 days
      app.log.info("Seeding historical API statistics for the past 29 days...");
      await seedFakeApiStatistics(app, countDays);
      app.log.debug("Historical API statistics created successfully");
      
    }

    // Initialize today's user growth document with seeded user count
    app.log.info(`Initializing user growth with '${appUsers}' for today...`);
    await seedTodaysGrowth(app, appUsers);
    app.log.debug("User growth document initialized.");

  } catch (err) {
    app.log.error("Database setup failed");
    app.log.error(err);
    process.exit(1);
  }
};

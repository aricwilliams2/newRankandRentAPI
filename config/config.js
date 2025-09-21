require('dotenv').config();

module.exports = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  },

  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'https://your-domain.com'
  },

  // SEO Rankings configuration
  seo: {
    opencageApiKey: process.env.OPENCAGE_API_KEY,
    // serpapiKey is now managed through the database via seoApiKeyService
    rateLimitDelay: parseInt(process.env.SEO_RATE_LIMIT_DELAY) || 250, // milliseconds between API calls
    maxGridSize: process.env.SEO_MAX_GRID_SIZE || '21x21',
    timeout: parseInt(process.env.SEO_API_TIMEOUT) || 30000 // 30 seconds
  },

  // AWS S3 configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  }
};

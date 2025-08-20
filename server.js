const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const leadRoutes = require("./routes/leadRoutes");
const seoRoutes = require("./routes/seoRoutes");
const clientRoutes = require("./routes/clientRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
const taskRoutes = require("./routes/taskRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const billingRoutes = require("./routes/billingRoutes");
const callLogRoutes = require("./routes/callLogRoutes");
const twilioRoutes = require("./routes/twilioRoutes");
const callForwardingRoutes = require("./routes/callForwardingRoutes");
const analyticsSnapshotRoutes = require("./routes/analyticsSnapshotRoutes");
const videoRoutes = require("./routes/videoRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,          // e.g. https://rankandrenttool.com
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // allow mobile apps / curl (no origin) and whitelisted sites
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,  // <-- needed if you send cookies or Authorization headers
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Content-Length','Content-Range'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight

// Serve static files from uploads directory
app.use('/videos', express.static(path.join(__dirname, 'uploads')));

// Video routes MUST come BEFORE the body parsers to avoid conflicts with multipart data
app.use("/api/videos", videoRoutes);

// Standard parsers for JSON/urlencoded requests (these properly ignore multipart data)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes that don't need file uploads
app.use("/stripe", stripeRoutes);
app.use("/api/billing", billingRoutes);

// Routes
app.get("/api/test", (req, res) => {
  res.json({ message: "API works!" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", leadRoutes);
app.use("/api", seoRoutes);
app.use("/api", clientRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", websiteRoutes);
app.use("/api", taskRoutes);
app.use("/api", callLogRoutes);
app.use("/api/twilio", twilioRoutes);
app.use("/api/call-forwarding", callForwardingRoutes);
app.use("/api/analytics-snapshots", analyticsSnapshotRoutes);

// Error handler for upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({ 
      error: 'File upload error', 
      details: err.message 
    });
  }
  console.error('Upload error:', err);
  res.status(500).json({ error: err.message });
});

// API endpoints documentation
app.get("/api/endpoints", (req, res) => {
  const endpoints = [
    // General endpoints
    {
      method: "GET",
      path: "/api/test",
      description: "Test endpoint to verify API is working",
    },
    {
      method: "POST",
      path: "/api/auth/register",
      description: "Register a new user",
      required_fields: "name, email, password",
    },
    {
      method: "POST",
      path: "/api/auth/login",
      description: "Login user",
      required_fields: "email, password",
    },
    {
      method: "GET",
      path: "/api/auth/profile",
      description: "Get current user profile",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/health",
      description: "Health check endpoint with server status",
    },
    {
      method: "GET",
      path: "/api/endpoints",
      description: "List all available API endpoints",
    },

    // Lead management endpoints
    {
      method: "GET",
      path: "/api/leads",
      description: "Get all leads with filtering, searching, and pagination",
      parameters: "status, search, sort_by, sort_dir, page, per_page",
    },
    {
      method: "GET",
      path: "/api/leads/:id",
      description: "Get a specific lead by ID",
    },
    {
      method: "POST",
      path: "/api/leads",
      description: "Create a new lead",
      required_fields: "name, phone",
    },
    {
      method: "PUT",
      path: "/api/leads/:id",
      description: "Update an existing lead",
    },
    {
      method: "DELETE",
      path: "/api/leads/:id",
      description: "Delete a lead",
    },

    // Client management endpoints
    {
      method: "GET",
      path: "/api/clients",
      description: "Get all clients with filtering, searching, and pagination",
      parameters: "status, search, sort_by, sort_dir, page, per_page",
    },
    {
      method: "GET",
      path: "/api/clients/:id",
      description: "Get a specific client by ID",
    },
    {
      method: "POST",
      path: "/api/clients",
      description: "Create a new client",
      required_fields: "website, email",
    },
    {
      method: "PUT",
      path: "/api/clients/:id",
      description: "Update an existing client",
    },
    {
      method: "DELETE",
      path: "/api/clients/:id",
      description: "Delete a client",
    },

    // Dashboard endpoints
    {
      method: "GET",
      path: "/api/dashboard/stats",
      description: "Get dashboard statistics (revenue, websites, leads, clients, phones)",
    },
    {
      method: "GET",
      path: "/api/dashboard/activity",
      description: "Get recent activity feed",
      optional_parameters: "limit (default: 10)",
    },

    // Website management endpoints
    {
      method: "GET",
      path: "/api/websites",
      description: "Get all websites with filtering, searching, and pagination",
      parameters: "status, search, sort_by, sort_dir, page, per_page",
    },
    {
      method: "GET",
      path: "/api/websites/:id",
      description: "Get a specific website by ID",
    },
    {
      method: "POST",
      path: "/api/websites",
      description: "Create a new website",
      required_fields: "domain",
    },
    {
      method: "PUT",
      path: "/api/websites/:id",
      description: "Update an existing website",
    },
    {
      method: "DELETE",
      path: "/api/websites/:id",
      description: "Delete a website",
    },

    // Task management endpoints
    {
      method: "GET",
      path: "/api/tasks",
      description: "Get all tasks with filtering, searching, and pagination",
      parameters: "status, website_id, priority, assignee, search, sort_by, sort_dir, page, per_page",
    },
    {
      method: "GET",
      path: "/api/tasks/:id",
      description: "Get a specific task by ID",
    },
    {
      method: "POST",
      path: "/api/tasks",
      description: "Create a new task",
      required_fields: "title",
    },
    {
      method: "PUT",
      path: "/api/tasks/:id",
      description: "Update an existing task",
    },
    {
      method: "DELETE",
      path: "/api/tasks/:id",
      description: "Delete a task",
    },

    // SEO & Keyword Research endpoints
    {
      method: "GET",
      path: "/api/url-metrics",
      description: "Get URL metrics and backlink data for a domain",
      required_parameters: "url",
    },
    {
      method: "GET",
      path: "/api/website-traffic",
      description: "Get website traffic data including monthly averages, history, top pages, and keywords",
      required_parameters: "url",
      optional_parameters: "mode (subdomains/exact, default: subdomains)",
    },
    {
      method: "GET",
      path: "/api/website-authority",
      description: "Get website authority metrics including domain rating, backlinks, and referring domains",
      required_parameters: "url",
      optional_parameters: "mode (subdomains/exact, default: subdomains)",
    },
    {
      method: "GET",
      path: "/api/website-backlinks",
      description: "Get detailed website backlinks data with authority metrics and backlinks list",
      required_parameters: "url",
      optional_parameters: "mode (subdomains/exact, default: subdomains)",
    },
    {
      method: "GET",
      path: "/api/keyword-metrics",
      description: "Get keyword search volume, CPC, and difficulty metrics",
      required_parameters: "keyword",
      optional_parameters: "country (default: us)",
    },
    {
      method: "GET",
      path: "/api/keyword-generator",
      description: "Generate related keyword ideas",
      required_parameters: "keyword",
      optional_parameters: "country (default: us)",
    },
    {
      method: "POST",
      path: "/api/domain-backlinks",
      description: "Get detailed backlinks for a domain",
      required_body: "domain",
    },
    {
      method: "POST",
      path: "/api/domain-keywords",
      description: "Get ranking keywords with positions and traffic values",
      required_body: "domain",
    },
    {
      method: "POST",
      path: "/api/google-rank-check",
      description: "Check Google ranking position of a URL for a keyword",
      required_parameters: "keyword, url",
      optional_parameters: "country (default: us), id (default: google-serp)",
    },
    {
      method: "POST",
      path: "/api/google-search",
      description: "Search Google and get organic results with related searches",
      required_body: "query",
      optional_body: "language (default: en), country (default: us)",
    },
    {
      method: "GET",
      path: "/api/seo-health",
      description: "Check RapidAPI connectivity status",
    },

    // Analytics snapshot endpoints
    {
      method: "GET",
      path: "/api/analytics-snapshots",
      description: "List stored analytics snapshots for the authenticated user",
      auth_required: true,
      optional_parameters: "limit, offset",
    },
    {
      method: "GET",
      path: "/api/analytics-snapshots/:id",
      description: "Get a single analytics snapshot for the authenticated user",
      auth_required: true,
    },
    {
      method: "DELETE",
      path: "/api/analytics-snapshots/:id",
      description: "Delete a single analytics snapshot for the authenticated user",
      auth_required: true,
    },

    // Twilio endpoints
    {
      method: "POST",
      path: "/api/twilio/buy-number",
      description: "Purchase a phone number from Twilio",
      required_fields: "phoneNumber or areaCode",
      optional_fields: "country",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/api/twilio/available-numbers",
      description: "Get available phone numbers for purchase",
      optional_parameters: "areaCode, country, limit",
      auth_required: true,
    },
    {
      method: "POST",
      path: "/api/twilio/call",
      description: "Make a call from the browser",
      required_fields: "to",
      optional_fields: "from, record, twimlUrl",
      auth_required: true,
    },
    {
      method: "POST",
      path: "/api/twilio/twiml",
      description: "TwiML endpoint for call handling (internal)",
    },
    {
      method: "POST",
      path: "/api/twilio/status-callback",
      description: "Call status callback webhook (internal)",
    },
    {
      method: "POST",
      path: "/api/twilio/recording-callback",
      description: "Recording callback webhook (internal)",
    },
    {
      method: "GET",
      path: "/api/twilio/recordings/:callSid",
      description: "Get recordings for a specific call",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/api/twilio/recordings",
      description: "Get all recordings for a user",
      optional_parameters: "page, limit",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/api/twilio/usage-stats",
      description: "Get aggregated call duration, call count, and phone number count for the authenticated user",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/api/twilio/call-logs",
      description: "Get call logs for a user",
      optional_parameters: "page, limit, status",
      auth_required: true,
    },
    {
      method: "GET",
      path: "/api/twilio/call-logs/:callSid",
      description: "Get a specific call log",
      auth_required: true,
    },
    {
      method: "DELETE",
      path: "/api/twilio/recordings/:recordingSid",
      description: "Delete a recording",
      auth_required: true,
    },
  ];

  res.json({
    message: "Available API endpoints",
    total_endpoints: endpoints.length,
    endpoints: endpoints,
    base_url: `${req.protocol}://${req.get("host")}`,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || "Node Lead API",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`�� Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

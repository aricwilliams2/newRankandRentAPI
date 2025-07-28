const express = require('express');
const cors = require('cors');
require('dotenv').config();

const leadRoutes = require('./routes/leadRoutes');
const seoRoutes = require('./routes/seoRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API works!' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', leadRoutes);
app.use('/api', seoRoutes);
app.use('/api', clientRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', websiteRoutes);
app.use('/api', taskRoutes);

// API endpoints documentation
app.get('/api/endpoints', (req, res) => {
  const endpoints = [
    // General endpoints
    {
      method: 'GET',
      path: '/api/test',
      description: 'Test endpoint to verify API is working'
    },
    {
      method: 'POST',
      path: '/api/auth/register',
      description: 'Register a new user',
      required_fields: 'name, email, password'
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'Login user',
      required_fields: 'email, password'
    },
    {
      method: 'GET',
      path: '/api/auth/profile',
      description: 'Get current user profile',
      auth_required: true
    },
    {
      method: 'GET',
      path: '/health',
      description: 'Health check endpoint with server status'
    },
    {
      method: 'GET',
      path: '/api/endpoints',
      description: 'List all available API endpoints'
    },
    
    // Lead management endpoints
    {
      method: 'GET',
      path: '/api/leads',
      description: 'Get all leads with filtering, searching, and pagination',
      parameters: 'status, search, sort_by, sort_dir, page, per_page'
    },
    {
      method: 'GET',
      path: '/api/leads/:id',
      description: 'Get a specific lead by ID'
    },
    {
      method: 'POST',
      path: '/api/leads',
      description: 'Create a new lead',
      required_fields: 'name, phone'
    },
    {
      method: 'PUT',
      path: '/api/leads/:id',
      description: 'Update an existing lead'
    },
    {
      method: 'DELETE',
      path: '/api/leads/:id',
      description: 'Delete a lead'
    },
    
    // Client management endpoints
    {
      method: 'GET',
      path: '/api/clients',
      description: 'Get all clients with filtering, searching, and pagination',
      parameters: 'status, search, sort_by, sort_dir, page, per_page'
    },
    {
      method: 'GET',
      path: '/api/clients/:id',
      description: 'Get a specific client by ID'
    },
    {
      method: 'POST',
      path: '/api/clients',
      description: 'Create a new client',
      required_fields: 'website, email'
    },
    {
      method: 'PUT',
      path: '/api/clients/:id',
      description: 'Update an existing client'
    },
    {
      method: 'DELETE',
      path: '/api/clients/:id',
      description: 'Delete a client'
    },
    
    // Dashboard endpoints
    {
      method: 'GET',
      path: '/api/dashboard/stats',
      description: 'Get dashboard statistics (revenue, websites, leads, clients, phones)'
    },
    {
      method: 'GET',
      path: '/api/dashboard/activity',
      description: 'Get recent activity feed',
      optional_parameters: 'limit (default: 10)'
    },
    
    // Website management endpoints  
    {
      method: 'GET',
      path: '/api/websites',
      description: 'Get all websites with filtering, searching, and pagination',
      parameters: 'status, search, sort_by, sort_dir, page, per_page'
    },
    {
      method: 'GET',
      path: '/api/websites/:id',
      description: 'Get a specific website by ID'
    },
    {
      method: 'POST',
      path: '/api/websites',
      description: 'Create a new website',
      required_fields: 'domain'
    },
    {
      method: 'PUT',
      path: '/api/websites/:id',
      description: 'Update an existing website'
    },
    {
      method: 'DELETE',
      path: '/api/websites/:id',
      description: 'Delete a website'
    },
    
    // Task management endpoints
    {
      method: 'GET',
      path: '/api/tasks',
      description: 'Get all tasks with filtering, searching, and pagination',
      parameters: 'status, website_id, priority, assignee, search, sort_by, sort_dir, page, per_page'
    },
    {
      method: 'GET',
      path: '/api/tasks/:id',
      description: 'Get a specific task by ID'
    },
    {
      method: 'POST',
      path: '/api/tasks',
      description: 'Create a new task',
      required_fields: 'title'
    },
    {
      method: 'PUT',
      path: '/api/tasks/:id',
      description: 'Update an existing task'
    },
    {
      method: 'DELETE',
      path: '/api/tasks/:id',
      description: 'Delete a task'
    },
    
    // SEO & Keyword Research endpoints
    {
      method: 'GET',
      path: '/api/url-metrics',
      description: 'Get URL metrics and backlink data for a domain',
      required_parameters: 'url'
    },
    {
      method: 'GET',
      path: '/api/keyword-metrics',
      description: 'Get keyword search volume, CPC, and difficulty metrics',
      required_parameters: 'keyword',
      optional_parameters: 'country (default: us)'
    },
    {
      method: 'GET',
      path: '/api/keyword-generator',
      description: 'Generate related keyword ideas',
      required_parameters: 'keyword',
      optional_parameters: 'country (default: us)'
    },
    {
      method: 'POST',
      path: '/api/domain-backlinks',
      description: 'Get detailed backlinks for a domain',
      required_body: 'domain'
    },
    {
      method: 'POST',
      path: '/api/domain-keywords',
      description: 'Get ranking keywords with positions and traffic values',
      required_body: 'domain'
    },
    {
      method: 'POST',
      path: '/api/google-rank-check',
      description: 'Check Google ranking position of a URL for a keyword',
      required_parameters: 'keyword, url',
      optional_parameters: 'country (default: us), id (default: google-serp)'
    },
    {
      method: 'POST',
      path: '/api/google-search',
      description: 'Search Google and get organic results with related searches',
      required_body: 'query',
      optional_body: 'language (default: en), country (default: us)'
    },
    {
      method: 'GET',
      path: '/api/seo-health',
      description: 'Check RapidAPI connectivity status'
    }
  ];

  res.json({
    message: 'Available API endpoints',
    total_endpoints: endpoints.length,
    endpoints: endpoints,
    base_url: `${req.protocol}://${req.get('host')}`,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || 'Node Lead API'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
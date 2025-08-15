# Node.js Lead Management API

This is a Node.js API converted from PHP Laravel, providing full CRUD operations for lead management.

## Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ User authentication and authorization with JWT
- ✅ User-specific data isolation
- ✅ Advanced filtering and searching
- ✅ Pagination support
- ✅ Input validation
- ✅ MySQL database integration
- ✅ RESTful API design
- ✅ Error handling
- ✅ **Twilio Integration** - Buy numbers, make calls, record calls, playback recordings
- ✅ **SEO & Keyword Research** - Comprehensive SEO analysis tools
- ✅ **Stripe Integration** - Payment processing

## Billing & Usage

- Calls: $0.02/min (rounded up). Each user gets 200 free minutes/month.
- Numbers: $2/month. New users get 1 free number on first purchase.
- Users must keep a minimum $5 balance to make calls or buy numbers when no free minutes remain.

Endpoints:
- `GET /api/billing/me` — current balance, free minutes, and pricing.
- `POST /stripe/top-up` — Stripe Checkout for one-time balance top-up (min $5). Webhook credits balance.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your MySQL database and run the SQL script:
```bash
mysql -u root -p customer_api < sql/create_leads_table.sql
```

3. Configure your environment variables in `.env`

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user and get JWT token
- `GET /api/auth/profile` - Get current user profile

### General
- `GET /api/endpoints` - List all available API endpoints
- `GET /api/test` - Test endpoint to verify API is working
- `GET /health` - Health check endpoint with server status

### SEO & Keyword Research

- `GET /api/url-metrics?url=example.com` - Get URL metrics and backlink data
- `GET /api/keyword-metrics?keyword=fishing&country=us` - Get keyword search volume and metrics
- `GET /api/keyword-generator?keyword=fishing&country=us` - Get related keyword ideas
- `POST /api/domain-backlinks` - Get backlinks for a domain
- `POST /api/domain-keywords` - Get ranking keywords for a domain
- `POST /api/google-rank-check` - Check Google ranking for a URL and keyword
- `GET /api/seo-health` - Check RapidAPI connectivity status

### Leads

- `GET /api/leads` - Get all leads with filtering, searching, and pagination
- `GET /api/leads/:id` - Get a specific lead
- `POST /api/leads` - Create a new lead
- `PUT /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead

### Clients

- `GET /api/clients` - Get all clients with filtering, searching, and pagination
- `GET /api/clients/:id` - Get a specific client
- `POST /api/clients` - Create a new client
- `PUT /api/clients/:id` - Update a client
- `DELETE /api/clients/:id` - Delete a client

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics (revenue, websites, leads, clients, phones)
- `GET /api/dashboard/activity` - Get recent activity feed

### Websites

- `GET /api/websites` - Get all websites with filtering, searching, and pagination
- `GET /api/websites/:id` - Get a specific website
- `POST /api/websites` - Create a new website
- `PUT /api/websites/:id` - Update a website
- `DELETE /api/websites/:id` - Delete a website

### Tasks

- `GET /api/tasks` - Get all tasks with filtering, searching, and pagination
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Twilio Integration

- `POST /api/twilio/buy-number` - Purchase a phone number from Twilio
- `GET /api/twilio/available-numbers` - Get available phone numbers for purchase
- `POST /api/twilio/call` - Make a call from the browser
- `GET /api/twilio/call-logs` - Get call logs for a user
- `GET /api/twilio/call-logs/:callSid` - Get a specific call log
- `GET /api/twilio/recordings` - Get all recordings for a user
- `GET /api/twilio/recordings/:callSid` - Get recordings for a specific call
- `DELETE /api/twilio/recordings/:recordingSid` - Delete a recording

### SEO API Query Parameters

#### URL Metrics
- `url` (required) - The URL to analyze (e.g., `medium.com`)

#### Keyword Metrics
- `keyword` (required) - The keyword to analyze
- `country` (optional) - 2-letter country code (default: `us`)

#### Keyword Generator
- `keyword` (required) - The seed keyword for generating ideas
- `country` (optional) - 2-letter country code (default: `us`)

#### Google Rank Check (POST)
Query parameters:
- `keyword` (required) - The keyword to check ranking for
- `url` (required) - The URL to check ranking for
- `country` (optional) - 2-letter country code (default: `us`)
- `id` (optional) - Search engine ID (default: `google-serp`)

#### Domain Backlinks (POST)
Request body:
```json
{
  "domain": "searchengineland.com"
}
```

#### Domain Keywords (POST)
Request body:
```json
{
  "domain": "searchengineland.com"
}
```

### Query Parameters for GET /api/leads

- `status` - Filter by status (New, Contacted, Qualified, Converted, Lost)
- `search` - Search in name, company, or email
- `sort_by` - Sort by field (default: created_at)
- `sort_dir` - Sort direction (asc/desc, default: desc)
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 15)

### Example Requests

#### Get URL metrics:
```bash
GET /api/url-metrics?url=medium.com
```

#### Get keyword metrics:
```bash
GET /api/keyword-metrics?keyword=fishing&country=us
```

#### Get keyword ideas:
```bash
GET /api/keyword-generator?keyword=fishing&country=us
```

#### Get website traffic data:
```bash
GET /api/website-traffic?url=rapidapi.com&mode=subdomains
```

#### Get website authority metrics:
```bash
GET /api/website-authority?url=rapidapi.com
```

#### Get website backlinks data:
```bash
GET /api/website-backlinks?url=rapidapi.com&mode=subdomains
```

#### Get domain backlinks:
```bash
POST /api/domain-backlinks
Content-Type: application/json

{
  "domain": "searchengineland.com"
}
```

#### Get domain keywords:
```bash
POST /api/domain-keywords
Content-Type: application/json

{
  "domain": "searchengineland.com"
}
```

### Authentication

All protected endpoints require an Authorization header with a valid JWT token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Register a new user:
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get user profile:
```bash
GET /api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get leads with filtering:
```bash
GET /api/leads?status=New&search=john&page=1&per_page=10
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Create a new lead:
```bash
POST /api/leads
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "company": "Example Corp",
  "city": "New York"
}
```

#### Update a lead:
```bash
PUT /api/leads/lead-uuid-here
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "Contacted",
  "notes": "Called and left voicemail"
}
```

#### Get clients with filtering:
```bash
GET /api/clients?status=active&search=example.com&page=1&per_page=10
```

#### Create a new client:
```bash
POST /api/clients
Content-Type: application/json

{
  "website": "https://example.com",
  "email": "contact@example.com",
  "phone": "123-456-7890",
  "status": "new",
  "revenue": 5000,
  "note": "Potential high-value client"
}
```

#### Update a client:
```bash
PUT /api/clients/client-uuid-here
Content-Type: application/json

{
  "status": "active",
  "revenue": 10000,
  "note": "Contract signed, monthly retainer"
}
```

#### Get dashboard statistics:
```bash
GET /api/dashboard/stats
```

#### Get recent activity:
```bash
GET /api/dashboard/activity?limit=5
```

#### Create a new website:
```bash
POST /api/websites
Content-Type: application/json

{
  "domain": "example.com",
  "niche": "Plumbing",
  "monthly_revenue": 2500,
  "domain_authority": 35
}
```

#### Create a new task:
```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "Optimize meta descriptions",
  "description": "Update meta descriptions for all service pages",
  "website_id": "website-uuid-here",
  "priority": "high",
  "assignee": "John Doe",
  "due_date": "2024-03-25"
}
```

#### Buy a phone number:
```bash
POST /api/twilio/buy-number
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "areaCode": "415",
  "country": "US"
}
```

#### Make a call:
```bash
POST /api/twilio/call
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "to": "+1234567890",
  "from": "+1987654321",
  "record": true
}
```

#### Get call logs:
```bash
GET /api/twilio/call-logs?page=1&limit=20&status=completed
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get recordings:
```bash
GET /api/twilio/recordings?page=1&limit=20
Authorization: Bearer YOUR_JWT_TOKEN
```

## Environment Variables

Copy the `.env` file and configure:

- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port  
- `DB_DATABASE` - Database name
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT token signing (change in production!)
- `RAPIDAPI_KEY` - Your RapidAPI key for SEO Traffic Authority API
- `RAPIDAPI_HOST` - RapidAPI host (seo-traffic-authority.p.rapidapi.com)
- `RAPIDAPI_BACKLINKS_HOST` - RapidAPI host for backlinks (backlinks-and-keywords-fetcher.p.rapidapi.com)
- `RAPIDAPI_RANK_CHECKER_HOST` - RapidAPI host for rank checking (google-rank-checker-by-keyword.p.rapidapi.com)
- `RAPIDAPI_GOOGLE_SEARCH_HOST` - RapidAPI host for Google search (google-search122.p.rapidapi.com)
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- `TWILIO_APP_SID` - Your Twilio TwiML App SID
- `SERVER_URL` - Your server URL for webhooks (e.g., https://your-api-url.com)

## Database Schema

The application uses MySQL database with the following main tables:

- `users` - User accounts and authentication
- `leads` - Lead management and contact information
- `clients` - Client information and relationships
- `websites` - Website tracking and SEO data
- `tasks` - Task management and scheduling
- `call_logs` - Call tracking and follow-up management (general call logs)
- `twilio_call_logs` - Twilio-specific call logs with detailed call information
- `activities` - User activity logging

The leads table includes:
- `id` (UUID primary key)
- `name` (required)
- `email`
- `phone` (required)
- `company`
- `status` (New, Contacted, Qualified, Converted, Lost)
- `notes`
- `reviews`
- `website`
- `contacted` (boolean)
- `city`
- `created_at`
- `updated_at`

The websites table includes:
- `id` (UUID primary key)
- `domain` (required, unique)
- `niche`
- `status` (active, inactive, suspended)
- `monthly_revenue` (decimal)
- `domain_authority`
- `backlinks`
- `organic_keywords`
- `organic_traffic`
- `top_keywords` (JSON)
- `competitors` (JSON)
- `seo_last_updated`
- `created_at`
- `updated_at`

The tasks table includes:
- `id` (UUID primary key)
- `website_id` (foreign key)
- `title` (required)
- `description`
- `status` (todo, in_progress, completed)
- `priority` (low, medium, high)
- `assignee`
- `due_date`
- `created_at`
- `updated_at`

The clients table includes:
- `id` (UUID primary key)
- `website` (required, unique URL)
- `phone`
- `email` (required, unique)
- `status` (new, active, inactive, suspended)
- `revenue` (decimal)
- `history` (text)
- `note` (text)
- `created_at`
- `updated_at`
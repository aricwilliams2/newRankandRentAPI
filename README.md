# Node.js Lead Management API

This is a Node.js API converted from PHP Laravel, providing full CRUD operations for lead management.

## Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Advanced filtering and searching
- ✅ Pagination support
- ✅ Input validation
- ✅ MySQL database integration
- ✅ RESTful API design
- ✅ Error handling

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
- `POST /api/google-search` - Search Google and get organic results
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

#### Get leads with filtering:
```bash
GET /api/leads?status=New&search=john&page=1&per_page=10
```

#### Create a new lead:
```bash
POST /api/leads
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

## Environment Variables

Copy the `.env` file and configure:

- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port  
- `DB_DATABASE` - Database name
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `PORT` - Server port (default: 3000)
- `RAPIDAPI_KEY` - Your RapidAPI key for SEO Traffic Authority API
- `RAPIDAPI_HOST` - RapidAPI host (seo-traffic-authority.p.rapidapi.com)
- `RAPIDAPI_BACKLINKS_HOST` - RapidAPI host for backlinks (backlinks-and-keywords-fetcher.p.rapidapi.com)
- `RAPIDAPI_RANK_CHECKER_HOST` - RapidAPI host for rank checking (google-rank-checker-by-keyword.p.rapidapi.com)

## Database Schema

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
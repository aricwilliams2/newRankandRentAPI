class SeoController {
  constructor() {
   this.rapidApiKey = process.env.RAPIDAPI_KEY;
   this.rapidApiHost = process.env.RAPIDAPI_HOST;
   this.baseUrl = `https://${this.rapidApiHost}`;
   this.backlinksApiHost = process.env.RAPIDAPI_BACKLINKS_HOST;
   this.backlinksBaseUrl = `https://${this.backlinksApiHost}`;
   this.rankCheckerApiHost = process.env.RAPIDAPI_RANK_CHECKER_HOST;
   this.rankCheckerBaseUrl = `https://${this.rankCheckerApiHost}`;
   this.googleSearchApiHost = process.env.RAPIDAPI_GOOGLE_SEARCH_HOST;
   this.googleSearchBaseUrl = `https://${this.googleSearchApiHost}`;
   this.websiteTrafficApiHost = process.env.RAPIDAPI_WEBSITE_TRAFFIC_HOST;
   this.websiteTrafficBaseUrl = `https://${this.websiteTrafficApiHost}`;
 
   // 🔥 Bind class methods to preserve `this`
   this.getUrlMetrics = this.getUrlMetrics.bind(this);
   this.getKeywordMetrics = this.getKeywordMetrics.bind(this);
   this.getKeywordIdeas = this.getKeywordIdeas.bind(this);
   this.healthCheck = this.healthCheck.bind(this);
   this.getDomainBacklinks = this.getDomainBacklinks.bind(this);
   this.getDomainKeywords = this.getDomainKeywords.bind(this);
   this.checkGoogleRank = this.checkGoogleRank.bind(this);
   this.searchGoogle = this.searchGoogle.bind(this);
   this.getWebsiteTraffic = this.getWebsiteTraffic.bind(this);
   this.getWebsiteAuthority = this.getWebsiteAuthority.bind(this);
   this.getWebsiteBacklinks = this.getWebsiteBacklinks.bind(this);
 }
 
   /**
    * Get URL metrics from RapidAPI
    */
   async getUrlMetrics(req, res) {
     try {
       const { url } = req.query;
       
       if (!url) {
         return res.status(400).json({ 
           error: 'URL parameter is required',
           message: 'Please provide a url query parameter'
         });
       }
 
       const apiUrl = `${this.baseUrl}/url-metrics?url=${encodeURIComponent(url)}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.rapidApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching URL metrics:', error);
       res.status(500).json({ 
         error: 'Failed to fetch URL metrics',
         message: error.message 
       });
     }
   }
 
   /**
    * Get keyword metrics from RapidAPI
    */
   async getKeywordMetrics(req, res) {
     try {
       const { keyword, country = 'us' } = req.query;
       
       if (!keyword) {
         return res.status(400).json({ 
           error: 'Keyword parameter is required',
           message: 'Please provide a keyword query parameter'
         });
       }
 
       const apiUrl = `${this.baseUrl}/keyword-metrics?keyword=${encodeURIComponent(keyword)}&country=${country}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.rapidApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching keyword metrics:', error);
       res.status(500).json({ 
         error: 'Failed to fetch keyword metrics',
         message: error.message 
       });
     }
   }
 
   /**
    * Get keyword ideas/generator from RapidAPI
    */
   async getKeywordIdeas(req, res) {
     try {
       const { keyword, country = 'us' } = req.query;
       
       if (!keyword) {
         return res.status(400).json({ 
           error: 'Keyword parameter is required',
           message: 'Please provide a keyword query parameter'
         });
       }
 
       const apiUrl = `${this.baseUrl}/keyword-generator?keyword=${encodeURIComponent(keyword)}&country=${country}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.rapidApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching keyword ideas:', error);
       res.status(500).json({ 
         error: 'Failed to fetch keyword ideas',
         message: error.message 
       });
     }
   }
 
   /**
    * Health check for RapidAPI connectivity
    */
   async healthCheck(req, res) {
     try {
       // Test with a simple keyword metrics call
       const testUrl = `${this.baseUrl}/keyword-metrics?keyword=test&country=us`;
       
       const response = await fetch(testUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.rapidApiHost
         }
       });
 
       const isHealthy = response.status === 200 || response.status === 429; // 429 = rate limited but API is working
       
       res.json({
         status: isHealthy ? 'healthy' : 'unhealthy',
         rapidApiConnected: isHealthy,
         timestamp: new Date().toISOString(),
         apiHost: this.rapidApiHost
       });
     } catch (error) {
       console.error('RapidAPI health check failed:', error);
       res.status(503).json({
         status: 'unhealthy',
         rapidApiConnected: false,
         error: error.message,
         timestamp: new Date().toISOString()
       });
     }
   }
 
   /**
    * Get domain backlinks from backlinks API
    */
   async getDomainBacklinks(req, res) {
     try {
       const { domain } = req.body;
       
       if (!domain) {
         return res.status(400).json({ 
           error: 'Domain parameter is required',
           message: 'Please provide a domain in the request body'
         });
       }
 
       const apiUrl = `${this.backlinksBaseUrl}/seolizer`;
       
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.backlinksApiHost,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           approute: 'domain_backlinks',
           domain: domain
         })
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching domain backlinks:', error);
       res.status(500).json({ 
         error: 'Failed to fetch domain backlinks',
         message: error.message 
       });
     }
   }
 
   /**
    * Get domain keywords from backlinks API
    */
   async getDomainKeywords(req, res) {
     try {
       const { domain } = req.body;
       
       if (!domain) {
         return res.status(400).json({ 
           error: 'Domain parameter is required',
           message: 'Please provide a domain in the request body'
         });
       }
 
       const apiUrl = `${this.backlinksBaseUrl}/seolizer`;
       
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.backlinksApiHost,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           approute: 'domain_keywords',
           domain: domain
         })
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching domain keywords:', error);
       res.status(500).json({ 
         error: 'Failed to fetch domain keywords',
         message: error.message 
       });
     }
   }
 
   /**
    * Check Google ranking for a specific URL and keyword
    */
   async checkGoogleRank(req, res) {
     try {
       const { keyword, url, country = 'us', id = 'google-serp' } = req.validatedQuery;
       
       const apiUrl = `${this.rankCheckerBaseUrl}/id?keyword=${encodeURIComponent(keyword)}&url=${encodeURIComponent(url)}&country=${country}&id=${id}`;
       
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.rankCheckerApiHost,
           'Content-Type': 'text/plain'
         },
         body: 'rank check request'
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error checking Google rank:', error);
       res.status(500).json({ 
         error: 'Failed to check Google rank',
         message: error.message 
       });
     }
   }
 
   /**
    * Search Google and get organic results
    */
   async searchGoogle(req, res) {
     try {
       const { query, language = 'en', country = 'us' } = req.validatedBody;
       
       const apiUrl = this.googleSearchBaseUrl;
       
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.googleSearchApiHost,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           actor: 'scraper.google.search',
           input: {
             q: query,
             hl: language,
             gl: country
           }
         })
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error searching Google:', error);
       res.status(500).json({ 
         error: 'Failed to search Google',
         message: error.message 
       });
     }
   }
 
     /**
   * Get website traffic data
   */
     async getWebsiteTraffic(req, res) {
     try {
       // Check if required configuration is available
       if (!this.websiteTrafficBaseUrl || !this.rapidApiKey || !this.websiteTrafficApiHost) {
         return res.status(500).json({
           error: 'RapidAPI configuration missing',
           message: 'RAPIDAPI_WEBSITE_TRAFFIC_HOST and RAPIDAPI_KEY environment variables are required'
         });
       }

       const { url, mode } = req.validatedQuery;
      
      const apiUrl = `${this.websiteTrafficBaseUrl}/traffic?url=${encodeURIComponent(url)}&mode=${mode}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.websiteTrafficApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();

       // Persist snapshot for authenticated users
       try {
         const userId = req.user?.id;
         if (userId) {
           const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
           await AnalyticsSnapshot.create({
             user_id: userId,
             url: req.validatedQuery?.url || req.query?.url,
             mode: req.validatedQuery?.mode || req.query?.mode,
             snapshot: data
           });
         }
       } catch (e) {
         console.warn('Snapshot save failed (non-blocking):', e?.message || e);
       }

       res.json(data);
     } catch (error) {
       console.error('Error fetching website traffic:', error);
       res.status(500).json({ 
         error: 'Failed to fetch website traffic',
         message: error.message 
       });
     }
   }
 
     /**
   * Get website authority data
   */
     async getWebsiteAuthority(req, res) {
     try {
       // Check if required configuration is available
       if (!this.websiteTrafficBaseUrl || !this.rapidApiKey || !this.websiteTrafficApiHost) {
         return res.status(500).json({
           error: 'RapidAPI configuration missing',
           message: 'RAPIDAPI_WEBSITE_TRAFFIC_HOST and RAPIDAPI_KEY environment variables are required'
         });
       }

       const { url, mode } = req.validatedQuery;
      
      const apiUrl = `${this.websiteTrafficBaseUrl}/authority?url=${encodeURIComponent(url)}&mode=${mode}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.websiteTrafficApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching website authority:', error);
       res.status(500).json({ 
         error: 'Failed to fetch website authority',
         message: error.message 
       });
     }
   }
 
     /**
   * Get website backlinks data
   */
     async getWebsiteBacklinks(req, res) {
     try {
       // Check if required configuration is available
       if (!this.websiteTrafficBaseUrl || !this.rapidApiKey || !this.websiteTrafficApiHost) {
         return res.status(500).json({
           error: 'RapidAPI configuration missing',
           message: 'RAPIDAPI_WEBSITE_TRAFFIC_HOST and RAPIDAPI_KEY environment variables are required'
         });
       }

       const { url, mode } = req.validatedQuery;
      
      const apiUrl = `${this.websiteTrafficBaseUrl}/backlinks?url=${encodeURIComponent(url)}&mode=${mode}`;
       
       const response = await fetch(apiUrl, {
         method: 'GET',
         headers: {
           'x-rapidapi-key': this.rapidApiKey,
           'x-rapidapi-host': this.websiteTrafficApiHost
         }
       });
 
       if (!response.ok) {
         throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
       }
 
       const data = await response.json();
       
       res.json(data);
     } catch (error) {
       console.error('Error fetching website backlinks:', error);
       res.status(500).json({ 
         error: 'Failed to fetch website backlinks',
         message: error.message 
       });
     }
   }
 }
 
 module.exports = new SeoController();
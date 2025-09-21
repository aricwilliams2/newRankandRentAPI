const express = require('express');
const router = express.Router();
const SeoController = require('../controllers/SeoController');
const SeoControllerMap = require('../controllers/SeoControllerMap');

const { validateSeoRequest, validateBacklinkRequest, validateGoogleSearchRequest } = require('../middleware/validation');
const { validateAnalysis } = require('../middleware/seoValidation');
const { authenticate } = require('../middleware/auth');

// SEO API routes
router.get('/url-metrics', validateSeoRequest('urlMetrics'), SeoController.getUrlMetrics);
router.get('/keyword-metrics', validateSeoRequest('keywordMetrics'), SeoController.getKeywordMetrics);
router.get('/keyword-generator', validateSeoRequest('keywordGenerator'), SeoController.getKeywordIdeas);
router.get('/keyword-suggestions', validateSeoRequest('keywordSuggestions'), SeoController.getKeywordSuggestions);
router.post('/save-keyword', authenticate, SeoController.saveKeywordFromSuggestions);
router.post('/google-rank-check', validateSeoRequest('googleRankCheck'), SeoController.checkGoogleRank);

// Website traffic and backlinks API routes
// Require auth for website traffic so we can associate snapshots with users
router.get('/website-traffic', authenticate, validateSeoRequest('websiteTraffic'), SeoController.getWebsiteTraffic);
router.get('/website-authority', validateSeoRequest('websiteAuthority'), SeoController.getWebsiteAuthority);
router.get('/website-backlinks', SeoController.getWebsiteBacklinks);

// Backlinks API routes
router.post('/domain-backlinks', validateBacklinkRequest('domainBacklinks'), SeoController.getDomainBacklinks);
router.post('/domain-keywords', validateBacklinkRequest('domainKeywords'), SeoController.getDomainKeywords);

// Google Search API routes
router.post('/google-search', validateGoogleSearchRequest('search'), SeoController.searchGoogle);

// Health check
router.get('/seo-health', SeoController.healthCheck);

// SEO Heatmap routes
router.post('/analyze', validateAnalysis, SeoControllerMap.runSEOAnalysis);
router.get('/grid-sizes', SeoControllerMap.getGridSizes);
router.post('/add-key', SeoControllerMap.addApiKey);
router.get('/usage-stats', SeoControllerMap.getUsageStats);

module.exports = router;
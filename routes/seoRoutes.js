const express = require('express');
const router = express.Router();
const SeoController = require('../controllers/SeoController');
const { validateSeoRequest, validateBacklinkRequest, validateGoogleSearchRequest } = require('../middleware/validation');

// SEO API routes
router.get('/url-metrics', validateSeoRequest('urlMetrics'), SeoController.getUrlMetrics);
router.get('/keyword-metrics', validateSeoRequest('keywordMetrics'), SeoController.getKeywordMetrics);
router.get('/keyword-generator', validateSeoRequest('keywordGenerator'), SeoController.getKeywordIdeas);
router.post('/google-rank-check', validateSeoRequest('googleRankCheck'), SeoController.checkGoogleRank);

// Backlinks API routes
router.post('/domain-backlinks', validateBacklinkRequest('domainBacklinks'), SeoController.getDomainBacklinks);
router.post('/domain-keywords', validateBacklinkRequest('domainKeywords'), SeoController.getDomainKeywords);

// Google Search API routes
router.post('/google-search', validateGoogleSearchRequest('search'), SeoController.searchGoogle);

// Health check
router.get('/seo-health', SeoController.healthCheck);

module.exports = router;
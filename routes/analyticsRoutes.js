const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const SeoController = require('../controllers/SeoController');

// Website analytics endpoints
router.get('/websites/:websiteId/backlinks', authenticate, SeoController.getWebsiteBacklinksById);

module.exports = router;

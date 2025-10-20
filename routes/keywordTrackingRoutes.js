const express = require('express');
const router = express.Router();
const KeywordTrackingController = require('../controllers/KeywordTrackingController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create a new keyword tracking entry
router.post('/', KeywordTrackingController.createKeywordTracking);

// Get all keyword tracking entries for the authenticated user
router.get('/', KeywordTrackingController.getKeywordTracking);

// Get a specific keyword tracking entry by ID
router.get('/:id', KeywordTrackingController.getKeywordTrackingById);

// Update a keyword tracking entry
router.put('/:id', KeywordTrackingController.updateKeywordTracking);

// Delete a keyword tracking entry
router.delete('/:id', KeywordTrackingController.deleteKeywordTracking);

// Check ranking for a specific keyword tracking entry
router.post('/:id/check-ranking', KeywordTrackingController.checkRanking);

// Get ranking history for a keyword tracking entry
router.get('/:id/rank-history', KeywordTrackingController.getRankHistory);

// Bulk check rankings for multiple entries
router.post('/bulk-check', KeywordTrackingController.bulkCheckRankings);

module.exports = router;

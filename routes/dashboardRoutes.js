const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticate } = require('../middleware/auth');

// Dashboard routes
router.get('/dashboard/stats', authenticate, DashboardController.getStats);
router.get('/dashboard/activity', authenticate, DashboardController.getRecentActivity);

module.exports = router;
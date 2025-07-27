const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');

// Dashboard routes
router.get('/dashboard/stats', DashboardController.getStats);
router.get('/dashboard/activity', DashboardController.getRecentActivity);

module.exports = router;
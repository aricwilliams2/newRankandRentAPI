const express = require('express');
const router = express.Router();
const ChecklistController = require('../controllers/ChecklistController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all checklist completion status for a specific client
router.get('/client/:clientId', ChecklistController.getClientChecklist);

// Get completion statistics for a client
router.get('/client/:clientId/stats', ChecklistController.getCompletionStats);

// Get completed items for a client
router.get('/client/:clientId/completed', ChecklistController.getCompletedItems);

// Get incomplete items for a client
router.get('/client/:clientId/incomplete', ChecklistController.getIncompleteItems);

// Toggle completion status of a checklist item
router.put('/client/:clientId/item/:itemId/toggle', ChecklistController.toggleChecklistItem);

// Mark a checklist item as completed
router.put('/client/:clientId/item/:itemId/complete', ChecklistController.markAsCompleted);

// Mark a checklist item as incomplete
router.put('/client/:clientId/item/:itemId/incomplete', ChecklistController.markAsIncomplete);

// Reset all checklist items for a client
router.delete('/client/:clientId/reset', ChecklistController.resetClientChecklist);

module.exports = router;

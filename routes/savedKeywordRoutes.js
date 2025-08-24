const express = require('express');
const router = express.Router();
const SavedKeywordController = require('../controllers/SavedKeywordController');
const { validateSavedKeyword } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Save a single keyword
router.post('/', validateSavedKeyword('save'), SavedKeywordController.saveKeyword);

// Get all saved keywords for the authenticated user
router.get('/', SavedKeywordController.getSavedKeywords);

// Check if a keyword is saved
router.get('/check', SavedKeywordController.checkIfSaved);

// Get a specific saved keyword by ID
router.get('/:id', SavedKeywordController.getSavedKeyword);

// Update a saved keyword
router.put('/:id', validateSavedKeyword('update'), SavedKeywordController.updateSavedKeyword);

// Delete a saved keyword
router.delete('/:id', SavedKeywordController.deleteSavedKeyword);

// Bulk save keywords
router.post('/bulk', validateSavedKeyword('bulkSave'), SavedKeywordController.bulkSaveKeywords);

module.exports = router;

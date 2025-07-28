const express = require('express');
const router = express.Router();
const WebsiteController = require('../controllers/WebsiteController');
const { authenticate } = require('../middleware/auth');
const { validateWebsite } = require('../middleware/validation');

// Website routes
router.get('/websites', authenticate, WebsiteController.index);
router.get('/websites/:id', authenticate, WebsiteController.show);
router.post('/websites', authenticate, validateWebsite('store'), WebsiteController.store);
router.put('/websites/:id', authenticate, validateWebsite('update'), WebsiteController.update);
router.delete('/websites/:id', authenticate, WebsiteController.destroy);

module.exports = router;
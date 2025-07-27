const express = require('express');
const router = express.Router();
const WebsiteController = require('../controllers/WebsiteController');
const { validateWebsite } = require('../middleware/validation');

// Website routes
router.get('/websites', WebsiteController.index);
router.get('/websites/:id', WebsiteController.show);
router.post('/websites', validateWebsite('store'), WebsiteController.store);
router.put('/websites/:id', validateWebsite('update'), WebsiteController.update);
router.delete('/websites/:id', WebsiteController.destroy);

module.exports = router;
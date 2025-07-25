const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { validateLead } = require('../middleware/validation');

// Lead routes
router.get('/leads', LeadController.index);
router.get('/leads/:id', LeadController.show);
router.post('/leads', validateLead('store'), LeadController.store);
router.put('/leads/:id', validateLead('update'), LeadController.update);
router.delete('/leads/:id', LeadController.destroy);

module.exports = router;
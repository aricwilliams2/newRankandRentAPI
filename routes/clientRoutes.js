const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');
const { validateClient } = require('../middleware/validation');

// Client routes
router.get('/clients', ClientController.index);
router.get('/clients/:id', ClientController.show);
router.post('/clients', validateClient('store'), ClientController.store);
router.put('/clients/:id', validateClient('update'), ClientController.update);
router.delete('/clients/:id', ClientController.destroy);

module.exports = router;
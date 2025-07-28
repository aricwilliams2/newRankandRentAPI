const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { validateAuth } = require('../middleware/validation');

// Public routes
router.post('/register', validateAuth('register'), AuthController.register);
router.post('/login', validateAuth('login'), AuthController.login);

// Protected routes
router.get('/profile', authenticate, AuthController.profile);

module.exports = router;
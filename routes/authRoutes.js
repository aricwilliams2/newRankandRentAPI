const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { validateAuth } = require('../middleware/validation');

// Public routes
router.post('/register', validateAuth('register'), AuthController.register);
router.post('/login', validateAuth('login'), AuthController.login);
router.post('/forgot-password', validateAuth('forgotPassword'), AuthController.forgotPassword);
router.post('/reset-password', validateAuth('resetPassword'), AuthController.resetPassword);
router.post('/setup-security-questions-forgot', validateAuth('setupSecurityQuestionsForgot'), AuthController.setupSecurityQuestionsForForgotPassword);

// Protected routes
router.get('/profile', authenticate, AuthController.profile);
router.post('/change-password', authenticate, validateAuth('changePassword'), AuthController.changePassword);
router.post('/change-password-simple', authenticate, validateAuth('changePasswordSimple'), AuthController.changePasswordSimple);

module.exports = router;
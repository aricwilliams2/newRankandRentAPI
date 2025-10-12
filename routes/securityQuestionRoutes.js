const express = require('express');
const router = express.Router();
const SecurityQuestionController = require('../controllers/SecurityQuestionController');
const { authenticate } = require('../middleware/auth');
const { validateSecurityQuestion } = require('../middleware/validation');

// Public routes
router.get('/predefined-questions', SecurityQuestionController.getPredefinedQuestions);
router.get('/guidelines', SecurityQuestionController.getQuestionGuidelines);
router.post('/setup-for-forgot-password', validateSecurityQuestion('setupForForgotPassword'), SecurityQuestionController.setupSecurityQuestionsForForgotPassword);

// Protected routes (require authentication)
router.get('/check', authenticate, SecurityQuestionController.checkSecurityQuestions);
router.get('/user-questions', authenticate, SecurityQuestionController.getUserSecurityQuestions);
router.post('/setup', authenticate, validateSecurityQuestion('setup'), SecurityQuestionController.setupSecurityQuestions);
router.put('/update', authenticate, validateSecurityQuestion('update'), SecurityQuestionController.updateSecurityQuestions);
router.post('/verify', authenticate, validateSecurityQuestion('verify'), SecurityQuestionController.verifySecurityQuestions);
router.post('/change-password', authenticate, validateSecurityQuestion('changePassword'), SecurityQuestionController.changePasswordWithSecurityQuestions);

// New authenticated endpoints for managing security questions
router.put('/update-answers', authenticate, validateSecurityQuestion('updateAnswers'), SecurityQuestionController.updateSecurityQuestionAnswers);
router.post('/add', authenticate, validateSecurityQuestion('add'), SecurityQuestionController.addSecurityQuestions);
router.delete('/delete', authenticate, validateSecurityQuestion('delete'), SecurityQuestionController.deleteSecurityQuestions);

module.exports = router;

const User = require('../models/User');
const SecurityQuestion = require('../models/SecurityQuestion');
const PredefinedQuestion = require('../models/PredefinedQuestion');
const { generateToken } = require('../middleware/auth');

class AuthController {
  /**
   * Register a new user
   */
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }

      // Create new user
      const user = await User.create({ name, email, password });
      const token = generateToken(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: 'Registration failed',
        message: error.message 
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Generate token
      const token = generateToken(user.id);

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        message: error.message 
      });
    }
  }

  /**
   * Get current user profile
   */
  async profile(req, res) {
    try {
      res.json({
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profile',
        message: error.message 
      });
    }
  }

  /**
   * Change password (simple version for users without security questions)
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'New password must be at least 8 characters long'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          error: 'Invalid current password',
          message: 'Current password is incorrect'
        });
      }

      // Check if user has security questions
      const hasQuestions = await req.user.hasSecurityQuestions();
      if (hasQuestions) {
        return res.status(400).json({
          error: 'Security questions required',
          message: 'Please use the security questions endpoint to change your password'
        });
      }

      // Update password
      await User.updatePassword(req.user.id, newPassword);

      res.json({
        message: 'Password changed successfully',
        success: true
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        message: error.message
      });
    }
  }

  /**
   * Forgot password - get user's security questions
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validate input
      if (!email) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Email is required'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No user found with this email address'
        });
      }

      // Check if user has security questions
      const hasQuestions = await user.hasSecurityQuestions();
      if (!hasQuestions) {
        return res.status(400).json({
          error: 'No security questions',
          message: 'This user has not set up security questions. Please contact support.'
        });
      }

      // Get user's security questions (without answers)
      const questions = await user.getSecurityQuestions();

      res.json({
        message: 'Security questions retrieved successfully',
        email: user.email,
        questions: questions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Failed to process forgot password request',
        message: error.message
      });
    }
  }

  /**
   * Reset password using security questions
   */
  async resetPassword(req, res) {
    try {
      const { email, newPassword, securityAnswers } = req.body;

      // Validate input
      if (!email || !newPassword || !securityAnswers) {
        return res.status(400).json({
          error: 'Missing required information',
          message: 'Please provide your email address, new password, and security question answers to reset your password'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'Your new password must be at least 8 characters long for security reasons'
        });
      }

      if (!Array.isArray(securityAnswers) || securityAnswers.length === 0) {
        return res.status(400).json({
          error: 'Security answers required',
          message: 'Please provide your security question answers as a list (e.g., ["answer1", "answer2"])'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'Account not found',
          message: 'No account found with this email address. Please check your email address and try again.'
        });
      }

      // Check if user has security questions
      const hasQuestions = await user.hasSecurityQuestions();
      if (!hasQuestions) {
        return res.status(400).json({
          error: 'Security questions not set up',
          message: 'This account has not set up security questions yet. Please set up security questions first before resetting your password.'
        });
      }

      // Verify security question answers
      const SecurityQuestion = require('../models/SecurityQuestion');
      const verification = await SecurityQuestion.verifyUserAnswers(user.id, securityAnswers);
      if (!verification.success) {
        return res.status(400).json({
          error: 'Incorrect security answers',
          message: 'One or more of your security question answers are incorrect. Please check your answers and try again.'
        });
      }

      // Update password
      await User.updatePassword(user.id, newPassword);

      res.json({
        message: 'Password reset successfully',
        success: true
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        message: error.message
      });
    }
  }

  /**
   * Set up security questions for user during forgot password flow (no auth required)
   */
  async setupSecurityQuestionsForForgotPassword(req, res) {
    try {
      const { email, questions } = req.body;

      // Validate input
      if (!email || !questions || !Array.isArray(questions) || questions.length < 1) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Email and at least 1 security question are required'
        });
      }

      if (questions.length > 5) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Maximum 5 security questions allowed'
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No user found with this email address'
        });
      }

      // Validate each question
      for (const q of questions) {
        if (!q.predefined_question_id || !q.answer) {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Each question must have a predefined_question_id and answer'
          });
        }

        if (q.answer.trim().length < 2) {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Answer must be at least 2 characters long'
          });
        }
      }

      // Validate that all predefined question IDs are valid
      const questionIds = questions.map(q => q.predefined_question_id);
      const validation = await PredefinedQuestion.validateQuestionIds(questionIds);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid input',
          message: validation.message
        });
      }

      // Check for duplicate question IDs
      const uniqueIds = new Set(questionIds);
      if (uniqueIds.size !== questionIds.length) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Duplicate questions are not allowed'
        });
      }

      // Check if user already has security questions
      const existingQuestions = await SecurityQuestion.findByUserId(user.id);
      if (existingQuestions.length > 0) {
        return res.status(409).json({
          error: 'Security questions already exist',
          message: 'User already has security questions set up. Please use the reset password endpoint.'
        });
      }

      // Prepare questions data
      const questionsData = questions.map(q => ({
        user_id: user.id,
        predefined_question_id: q.predefined_question_id,
        answer: q.answer.trim()
      }));

      // Create security questions
      const createdQuestions = await SecurityQuestion.createMultiple(questionsData);

      res.status(201).json({
        message: 'Security questions set up successfully for forgot password',
        email: user.email,
        questions: createdQuestions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Setup security questions for forgot password error:', error);
      res.status(500).json({
        error: 'Failed to set up security questions',
        message: error.message
      });
    }
  }

  /**
   * Simple password change for authenticated users (no security questions required)
   */
  async changePasswordSimple(req, res) {
    try {
      const userId = req.user.id;
      const { newPassword } = req.body;

      // Validate input
      if (!newPassword) {
        return res.status(400).json({
          error: 'Missing password',
          message: 'New password is required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'New password must be at least 8 characters long for security reasons'
        });
      }

      if (newPassword.length > 255) {
        return res.status(400).json({
          error: 'Password too long',
          message: 'New password must be less than 255 characters'
        });
      }

      // Update password
      await User.updatePassword(userId, newPassword);

      res.json({
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Simple password change error:', error);
      res.status(500).json({
        error: 'Failed to change password',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();
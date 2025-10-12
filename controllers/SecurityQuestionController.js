const SecurityQuestion = require('../models/SecurityQuestion');
const PredefinedQuestion = require('../models/PredefinedQuestion');
const User = require('../models/User');

class SecurityQuestionController {
  // Predefined security questions
  static getPredefinedQuestions() {
    return [
      "What was the name of your first pet?",
      "What was the name of the street you grew up on?",
      "What was your mother's maiden name?",
      "What was the name of your elementary school?",
      "What was your childhood nickname?",
      "What was the make of your first car?",
      "What was your favorite teacher's name?",
      "What city were you born in?",
      "What was your favorite food as a child?",
      "What was the name of your first employer?",
      "What was your favorite book as a child?",
      "What was the name of your best friend in high school?",
      "What was your first job?",
      "What was the name of your first crush?",
      "What was your favorite subject in school?"
    ];
  }

  /**
   * Get predefined security questions for user to choose from
   */
  async getPredefinedQuestions(req, res) {
    try {
      const questions = await PredefinedQuestion.findAll();
      const categories = await PredefinedQuestion.getCategories();
      
      res.json({
        message: 'Predefined security questions retrieved successfully',
        questions: questions.map(q => q.toJSON()),
        categories,
        info: {
          type: 'predefined',
          description: 'Choose from our secure, tested questions. You must select at least 2 questions.',
          minRequired: 2,
          maxAllowed: 5,
          totalAvailable: questions.length
        }
      });
    } catch (error) {
      console.error('Get predefined questions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve predefined questions',
        message: error.message
      });
    }
  }

  /**
   * Get security question guidelines for custom questions
   */
  async getQuestionGuidelines(req, res) {
    try {
      const guidelines = {
        predefined: {
          description: 'Choose from our curated list of secure questions',
          benefits: [
            'Tested for security',
            'Easy to remember',
            'Hard to guess',
            'No personal information required'
          ],
          endpoint: '/api/security-questions/predefined-questions'
        },
        custom: {
          description: 'Create your own questions',
          requirements: [
            'Minimum 15 characters long',
            'Cannot contain personal information (name, email, password, etc.)',
            'Should be memorable but not easily guessable',
            'Avoid questions that might change over time'
          ],
          examples: {
            good: [
              'What was the name of your favorite childhood book?',
              'What was the first concert you ever attended?',
              'What was the name of your first boss?',
              'What was your favorite subject in college?'
            ],
            bad: [
              'What is your name?',
              'What is your email address?',
              'What is your phone number?',
              'What is your birthday?'
            ]
          },
          warning: 'Custom questions are less secure than predefined ones. Use with caution.'
        }
      };

      res.json({
        message: 'Security question guidelines retrieved successfully',
        guidelines
      });
    } catch (error) {
      console.error('Get question guidelines error:', error);
      res.status(500).json({
        error: 'Failed to retrieve question guidelines',
        message: error.message
      });
    }
  }

  /**
   * Check if user has security questions set up
   */
  async checkSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const hasQuestions = await req.user.hasSecurityQuestions();
      
      res.json({
        hasSecurityQuestions: hasQuestions,
        message: hasQuestions ? 'User has security questions set up' : 'User needs to set up security questions'
      });
    } catch (error) {
      console.error('Check security questions error:', error);
      res.status(500).json({
        error: 'Failed to check security questions',
        message: error.message
      });
    }
  }

  /**
   * Get user's security questions (without answers)
   */
  async getUserSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const questions = await req.user.getSecurityQuestions();
      
      res.json({
        message: 'User security questions retrieved successfully',
        questions: questions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Get user security questions error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user security questions',
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
      if (!email || !questions || !Array.isArray(questions) || questions.length < 2) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Email and at least 2 security questions are required'
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
   * Set up security questions for user (predefined questions only)
   */
  async setupSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { questions } = req.body;

      // Validate input
      if (!questions || !Array.isArray(questions) || questions.length < 1) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'At least 1 security question is required'
        });
      }

      if (questions.length > 5) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Maximum 5 security questions allowed'
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
      const existingQuestions = await SecurityQuestion.findByUserId(userId);
      if (existingQuestions.length > 0) {
        return res.status(409).json({
          error: 'Security questions already exist',
          message: 'User already has security questions set up. Use update endpoint to modify them.'
        });
      }

      // Prepare questions data
      const questionsData = questions.map(q => ({
        user_id: userId,
        predefined_question_id: q.predefined_question_id,
        answer: q.answer.trim()
      }));

      // Create security questions
      const createdQuestions = await SecurityQuestion.createMultiple(questionsData);

      res.status(201).json({
        message: 'Security questions set up successfully',
        questions: createdQuestions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Setup security questions error:', error);
      res.status(500).json({
        error: 'Failed to set up security questions',
        message: error.message
      });
    }
  }

  /**
   * Update security questions for user
   */
  async updateSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { questions } = req.body;

      // Validate input
      if (!questions || !Array.isArray(questions) || questions.length < 1) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'At least 1 security question is required'
        });
      }

      // Validate each question
      for (const q of questions) {
        if (!q.question || !q.answer || q.question.trim().length < 10 || q.answer.trim().length < 2) {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Each question must have a question text (min 10 chars) and answer (min 2 chars)'
          });
        }
      }

      // Delete existing questions
      await SecurityQuestion.deleteByUserId(userId);

      // Prepare questions data
      const questionsData = questions.map(q => ({
        user_id: userId,
        question: q.question.trim(),
        answer: q.answer.trim()
      }));

      // Create new security questions
      const createdQuestions = await SecurityQuestion.createMultiple(questionsData);

      res.json({
        message: 'Security questions updated successfully',
        questions: createdQuestions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Update security questions error:', error);
      res.status(500).json({
        error: 'Failed to update security questions',
        message: error.message
      });
    }
  }

  /**
   * Verify security question answers
   */
  async verifySecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { answers } = req.body;

      // Validate input
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Answers array is required'
        });
      }

      // Verify answers
      const verification = await SecurityQuestion.verifyUserAnswers(userId, answers);

      if (!verification.success) {
        return res.status(400).json({
          error: 'Verification failed',
          message: verification.message
        });
      }

      res.json({
        message: 'Security questions verified successfully',
        verified: true
      });
    } catch (error) {
      console.error('Verify security questions error:', error);
      res.status(500).json({
        error: 'Failed to verify security questions',
        message: error.message
      });
    }
  }

  /**
   * Change password with security question verification
   */
  async changePasswordWithSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, securityAnswers } = req.body;

      // Validate input
      if (!currentPassword || !newPassword || !securityAnswers) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Current password, new password, and security answers are required'
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
      if (!hasQuestions) {
        return res.status(400).json({
          error: 'Security questions not set up',
          message: 'Please set up security questions before changing password'
        });
      }

      // Verify security question answers
      const verification = await SecurityQuestion.verifyUserAnswers(userId, securityAnswers);
      if (!verification.success) {
        return res.status(400).json({
          error: 'Security verification failed',
          message: verification.message
        });
      }

      // Update password
      await User.updatePassword(userId, newPassword);

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
   * Update security question answers only (authenticated user)
   */
  async updateSecurityQuestionAnswers(req, res) {
    try {
      const userId = req.user.id;
      const { answers } = req.body;

      // Validate input
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Answers array is required and cannot be empty'
        });
      }

      // Get user's current security questions
      const currentQuestions = await SecurityQuestion.findByUserId(userId);
      if (currentQuestions.length === 0) {
        return res.status(404).json({
          error: 'No security questions found',
          message: 'You have not set up any security questions yet. Please set them up first.'
        });
      }

      if (answers.length !== currentQuestions.length) {
        return res.status(400).json({
          error: 'Answer count mismatch',
          message: `You have ${currentQuestions.length} security questions. Please provide exactly ${currentQuestions.length} answers.`
        });
      }

      // Update each answer
      for (let i = 0; i < currentQuestions.length; i++) {
        const question = currentQuestions[i];
        const newAnswer = answers[i];

        if (!newAnswer || newAnswer.trim().length < 2) {
          return res.status(400).json({
            error: 'Invalid answer',
            message: `Answer ${i + 1} must be at least 2 characters long`
          });
        }

        await SecurityQuestion.updateAnswer(question.id, newAnswer.trim());
      }

      // Get updated questions
      const updatedQuestions = await SecurityQuestion.findByUserId(userId);

      res.json({
        message: 'Security question answers updated successfully',
        questions: updatedQuestions.map(q => q.toJSON())
      });
    } catch (error) {
      console.error('Update security question answers error:', error);
      res.status(500).json({
        error: 'Failed to update security question answers',
        message: error.message
      });
    }
  }

  /**
   * Add new security questions (authenticated user)
   */
  async addSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { questions } = req.body;

      // Validate input
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'At least 1 new security question is required'
        });
      }

      if (questions.length > 5) {
        return res.status(400).json({
          error: 'Too many questions',
          message: 'You can add up to 5 security questions at once'
        });
      }

      // Get current questions count
      const currentQuestions = await SecurityQuestion.findByUserId(userId);
      const totalQuestions = currentQuestions.length + questions.length;

      if (totalQuestions > 5) {
        return res.status(400).json({
          error: 'Too many total questions',
          message: `You currently have ${currentQuestions.length} questions. Adding ${questions.length} more would exceed the maximum of 5 questions.`
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

      // Check for duplicate question IDs (both new and existing)
      const existingQuestionIds = currentQuestions.map(q => q.predefined_question_id);
      const allQuestionIds = [...existingQuestionIds, ...questionIds];
      const uniqueIds = new Set(allQuestionIds);
      if (uniqueIds.size !== allQuestionIds.length) {
        return res.status(400).json({
          error: 'Duplicate questions',
          message: 'You cannot add questions that you already have set up'
        });
      }

      // Prepare questions data
      const questionsData = questions.map(q => ({
        user_id: userId,
        predefined_question_id: q.predefined_question_id,
        answer: q.answer.trim()
      }));

      // Create new security questions
      await SecurityQuestion.createMultiple(questionsData);

      // Get all questions (existing + new)
      const allQuestions = await SecurityQuestion.findByUserId(userId);

      res.status(201).json({
        message: 'Security questions added successfully',
        questions: allQuestions.map(q => q.toJSON()),
        addedCount: questions.length,
        totalCount: allQuestions.length
      });
    } catch (error) {
      console.error('Add security questions error:', error);
      res.status(500).json({
        error: 'Failed to add security questions',
        message: error.message
      });
    }
  }

  /**
   * Delete specific security questions (authenticated user)
   */
  async deleteSecurityQuestions(req, res) {
    try {
      const userId = req.user.id;
      const { questionIds } = req.body;

      // Validate input
      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Question IDs array is required and cannot be empty'
        });
      }

      // Get current questions
      const currentQuestions = await SecurityQuestion.findByUserId(userId);
      if (currentQuestions.length === 0) {
        return res.status(404).json({
          error: 'No security questions found',
          message: 'You have not set up any security questions yet'
        });
      }

      // Validate that all question IDs belong to the user
      const userQuestionIds = currentQuestions.map(q => q.id);
      const invalidIds = questionIds.filter(id => !userQuestionIds.includes(id));
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: 'Invalid question IDs',
          message: `Question IDs ${invalidIds.join(', ')} do not belong to your account`
        });
      }

      // Check if user would have at least 1 question remaining
      const remainingCount = currentQuestions.length - questionIds.length;
      if (remainingCount < 1) {
        return res.status(400).json({
          error: 'Cannot delete all questions',
          message: 'You must have at least 1 security question. Cannot delete all questions.'
        });
      }

      // Delete the questions
      for (const questionId of questionIds) {
        await SecurityQuestion.deleteById(questionId);
      }

      // Get remaining questions
      const remainingQuestions = await SecurityQuestion.findByUserId(userId);

      res.json({
        message: 'Security questions deleted successfully',
        questions: remainingQuestions.map(q => q.toJSON()),
        deletedCount: questionIds.length,
        remainingCount: remainingQuestions.length
      });
    } catch (error) {
      console.error('Delete security questions error:', error);
      res.status(500).json({
        error: 'Failed to delete security questions',
        message: error.message
      });
    }
  }
}

module.exports = new SecurityQuestionController();

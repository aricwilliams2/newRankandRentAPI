const SavedKeyword = require('../models/SavedKeyword');

class SavedKeywordController {
  constructor() {
    // Bind methods to preserve 'this'
    this.saveKeyword = this.saveKeyword.bind(this);
    this.getSavedKeywords = this.getSavedKeywords.bind(this);
    this.getSavedKeyword = this.getSavedKeyword.bind(this);
    this.updateSavedKeyword = this.updateSavedKeyword.bind(this);
    this.deleteSavedKeyword = this.deleteSavedKeyword.bind(this);
    this.checkIfSaved = this.checkIfSaved.bind(this);
  }

  /**
   * Save a keyword to user's profile
   */
  async saveKeyword(req, res) {
    try {
      const userId = req.user.id;
      const {
        keyword,
        difficulty,
        volume,
        last_updated,
        search_engine = 'google',
        country = 'us',
        category = 'idea',
        notes = null
      } = req.body;

      if (!keyword) {
        return res.status(400).json({
          error: 'Keyword is required',
          message: 'Please provide a keyword to save'
        });
      }

      // Check if keyword is already saved
      const isAlreadySaved = await SavedKeyword.isSaved(userId, keyword, category);
      if (isAlreadySaved) {
        return res.status(409).json({
          error: 'Keyword already saved',
          message: 'This keyword is already saved in your profile'
        });
      }

      const savedKeyword = await SavedKeyword.create({
        user_id: userId,
        keyword,
        difficulty,
        volume,
        last_updated,
        search_engine,
        country,
        category,
        notes
      });

      res.status(201).json({
        message: 'Keyword saved successfully',
        data: savedKeyword
      });

    } catch (error) {
      console.error('Error saving keyword:', error);
      res.status(500).json({
        error: 'Failed to save keyword',
        message: error.message
      });
    }
  }

  /**
   * Get all saved keywords for a user
   */
  async getSavedKeywords(req, res) {
    try {
      const userId = req.user.id;
      const { category, limit = 50, offset = 0, search = '' } = req.query;

      const options = {
        category: category || null,
        limit: parseInt(limit),
        offset: parseInt(offset),
        search: search.trim()
      };

      const savedKeywords = await SavedKeyword.findByUserId(userId, options);
      const totalCount = await SavedKeyword.countByUserId(userId, category);

      res.json({
        data: savedKeywords,
        pagination: {
          total: totalCount,
          limit: options.limit,
          offset: options.offset,
          hasMore: (options.offset + options.limit) < totalCount
        }
      });

    } catch (error) {
      console.error('Error fetching saved keywords:', error);
      res.status(500).json({
        error: 'Failed to fetch saved keywords',
        message: error.message
      });
    }
  }

  /**
   * Get a specific saved keyword by ID
   */
  async getSavedKeyword(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const savedKeyword = await SavedKeyword.findById(id, userId);
      
      if (!savedKeyword) {
        return res.status(404).json({
          error: 'Saved keyword not found',
          message: 'The requested saved keyword does not exist or does not belong to you'
        });
      }

      res.json({
        data: savedKeyword
      });

    } catch (error) {
      console.error('Error fetching saved keyword:', error);
      res.status(500).json({
        error: 'Failed to fetch saved keyword',
        message: error.message
      });
    }
  }

  /**
   * Update a saved keyword
   */
  async updateSavedKeyword(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const {
        difficulty,
        volume,
        last_updated,
        search_engine,
        country,
        category,
        notes
      } = req.body;

      // Check if the saved keyword exists and belongs to the user
      const existingKeyword = await SavedKeyword.findById(id, userId);
      if (!existingKeyword) {
        return res.status(404).json({
          error: 'Saved keyword not found',
          message: 'The requested saved keyword does not exist or does not belong to you'
        });
      }

      const updateData = {
        difficulty: difficulty || existingKeyword.difficulty,
        volume: volume || existingKeyword.volume,
        last_updated: last_updated || existingKeyword.last_updated,
        search_engine: search_engine || existingKeyword.search_engine,
        country: country || existingKeyword.country,
        category: category || existingKeyword.category,
        notes: notes !== undefined ? notes : existingKeyword.notes
      };

      const success = await SavedKeyword.update(id, userId, updateData);

      if (success) {
        const updatedKeyword = await SavedKeyword.findById(id, userId);
        res.json({
          message: 'Saved keyword updated successfully',
          data: updatedKeyword
        });
      } else {
        res.status(500).json({
          error: 'Failed to update saved keyword',
          message: 'No changes were made'
        });
      }

    } catch (error) {
      console.error('Error updating saved keyword:', error);
      res.status(500).json({
        error: 'Failed to update saved keyword',
        message: error.message
      });
    }
  }

  /**
   * Delete a saved keyword
   */
  async deleteSavedKeyword(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if the saved keyword exists and belongs to the user
      const existingKeyword = await SavedKeyword.findById(id, userId);
      if (!existingKeyword) {
        return res.status(404).json({
          error: 'Saved keyword not found',
          message: 'The requested saved keyword does not exist or does not belong to you'
        });
      }

      const success = await SavedKeyword.delete(id, userId);

      if (success) {
        res.json({
          message: 'Saved keyword deleted successfully',
          data: { id: parseInt(id) }
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete saved keyword',
          message: 'No changes were made'
        });
      }

    } catch (error) {
      console.error('Error deleting saved keyword:', error);
      res.status(500).json({
        error: 'Failed to delete saved keyword',
        message: error.message
      });
    }
  }

  /**
   * Check if a keyword is saved by the user
   */
  async checkIfSaved(req, res) {
    try {
      const userId = req.user.id;
      const { keyword, category = 'idea' } = req.query;

      if (!keyword) {
        return res.status(400).json({
          error: 'Keyword parameter is required',
          message: 'Please provide a keyword to check'
        });
      }

      const isSaved = await SavedKeyword.isSaved(userId, keyword, category);

      res.json({
        isSaved,
        keyword,
        category
      });

    } catch (error) {
      console.error('Error checking if keyword is saved:', error);
      res.status(500).json({
        error: 'Failed to check if keyword is saved',
        message: error.message
      });
    }
  }

  /**
   * Bulk save keywords
   */
  async bulkSaveKeywords(req, res) {
    try {
      const userId = req.user.id;
      const { keywords } = req.body;

      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({
          error: 'Keywords array is required',
          message: 'Please provide an array of keywords to save'
        });
      }

      const results = [];
      const errors = [];

      for (const keywordData of keywords) {
        try {
          const {
            keyword,
            difficulty,
            volume,
            last_updated,
            search_engine = 'google',
            country = 'us',
            category = 'idea',
            notes = null
          } = keywordData;

          if (!keyword) {
            errors.push({ keyword: 'N/A', error: 'Keyword is required' });
            continue;
          }

          // Check if already saved
          const isAlreadySaved = await SavedKeyword.isSaved(userId, keyword, category);
          if (isAlreadySaved) {
            errors.push({ keyword, error: 'Already saved' });
            continue;
          }

          const savedKeyword = await SavedKeyword.create({
            user_id: userId,
            keyword,
            difficulty,
            volume,
            last_updated,
            search_engine,
            country,
            category,
            notes
          });

          results.push(savedKeyword);
        } catch (error) {
          errors.push({ keyword: keywordData.keyword || 'Unknown', error: error.message });
        }
      }

      res.status(201).json({
        message: 'Bulk save completed',
        data: {
          saved: results,
          errors: errors,
          summary: {
            total: keywords.length,
            saved: results.length,
            errors: errors.length
          }
        }
      });

    } catch (error) {
      console.error('Error in bulk save keywords:', error);
      res.status(500).json({
        error: 'Failed to bulk save keywords',
        message: error.message
      });
    }
  }
}

module.exports = new SavedKeywordController();

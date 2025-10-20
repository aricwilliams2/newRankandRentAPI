const KeywordTracking = require('../models/KeywordTracking');
const axios = require('axios');
const seoApiKeyService = require('../services/seoApiKeyService');

class KeywordTrackingController {
  constructor() {
    this.rapidApiKey = process.env.RAPIDAPI_KEY;
    this.rankCheckerBaseUrl = 'https://google-rank-checker-by-keyword.p.rapidapi.com';
    this.rankCheckerApiHost = 'google-rank-checker-by-keyword.p.rapidapi.com';
    
    // Bind methods to preserve 'this'
    this.createKeywordTracking = this.createKeywordTracking.bind(this);
    this.getKeywordTracking = this.getKeywordTracking.bind(this);
    this.getKeywordTrackingById = this.getKeywordTrackingById.bind(this);
    this.updateKeywordTracking = this.updateKeywordTracking.bind(this);
    this.deleteKeywordTracking = this.deleteKeywordTracking.bind(this);
    this.checkRanking = this.checkRanking.bind(this);
    this.getRankHistory = this.getRankHistory.bind(this);
    this.bulkCheckRankings = this.bulkCheckRankings.bind(this);
  }

  /**
   * Create a new keyword tracking entry
   */
  async createKeywordTracking(req, res) {
    try {
      const userId = req.user.id;
      const {
        client_id,
        keyword,
        target_url,
        search_engine = 'google',
        country = 'us',
        location = null,
        check_frequency = 'weekly',
        notes = null
      } = req.body;

      // Validate required fields
      if (!client_id || !keyword || !target_url) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'client_id, keyword, and target_url are required'
        });
      }

      // Check if keyword is already being tracked for this client
      const isAlreadyTracked = await KeywordTracking.isTracked(
        userId, 
        client_id, 
        keyword, 
        search_engine, 
        country
      );

      if (isAlreadyTracked) {
        return res.status(409).json({
          error: 'Keyword already tracked',
          message: 'This keyword is already being tracked for this client'
        });
      }

      const keywordTracking = await KeywordTracking.create({
        user_id: userId,
        client_id,
        keyword,
        target_url,
        search_engine,
        country,
        location,
        check_frequency,
        notes
      });

      res.status(201).json({
        message: 'Keyword tracking created successfully',
        data: keywordTracking
      });

    } catch (error) {
      console.error('Error creating keyword tracking:', error);
      res.status(500).json({
        error: 'Failed to create keyword tracking',
        message: error.message
      });
    }
  }

  /**
   * Get all keyword tracking entries for a user
   */
  async getKeywordTracking(req, res) {
    try {
      const userId = req.user.id;
      const {
        client_id,
        is_active,
        search,
        limit = 50,
        offset = 0,
        sort_by = 'created_at',
        sort_dir = 'desc'
      } = req.query;

      const options = {
        client_id: client_id ? parseInt(client_id) : null,
        is_active: is_active !== undefined && is_active !== '' ? is_active === 'true' : null,
        search: search || '',
        limit: parseInt(limit),
        offset: parseInt(offset),
        sort_by,
        sort_dir
      };

      const keywordTracking = await KeywordTracking.findByUserId(userId, options);
      const totalCount = await KeywordTracking.countByUserId(userId, {
        client_id: options.client_id,
        is_active: options.is_active,
        search: options.search
      });

      res.json({
        data: keywordTracking,
        pagination: {
          total: totalCount,
          limit: options.limit,
          offset: options.offset,
          hasMore: (options.offset + options.limit) < totalCount
        }
      });

    } catch (error) {
      console.error('Error fetching keyword tracking:', error);
      res.status(500).json({
        error: 'Failed to fetch keyword tracking',
        message: error.message
      });
    }
  }

  /**
   * Get a specific keyword tracking entry by ID
   */
  async getKeywordTrackingById(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const keywordTracking = await KeywordTracking.findById(id, userId);
      
      if (!keywordTracking) {
        return res.status(404).json({
          error: 'Keyword tracking not found',
          message: 'The requested keyword tracking entry does not exist or does not belong to you'
        });
      }

      res.json({
        data: keywordTracking
      });

    } catch (error) {
      console.error('Error fetching keyword tracking:', error);
      res.status(500).json({
        error: 'Failed to fetch keyword tracking',
        message: error.message
      });
    }
  }

  /**
   * Update a keyword tracking entry
   */
  async updateKeywordTracking(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const {
        keyword,
        target_url,
        search_engine,
        country,
        location,
        check_frequency,
        is_active,
        notes
      } = req.body;

      // Check if the keyword tracking exists and belongs to the user
      const existing = await KeywordTracking.findById(id, userId);
      if (!existing) {
        return res.status(404).json({
          error: 'Keyword tracking not found',
          message: 'The requested keyword tracking entry does not exist or does not belong to you'
        });
      }

      const updateData = {};
      if (keyword !== undefined) updateData.keyword = keyword;
      if (target_url !== undefined) updateData.target_url = target_url;
      if (search_engine !== undefined) updateData.search_engine = search_engine;
      if (country !== undefined) updateData.country = country;
      if (location !== undefined) updateData.location = location;
      if (check_frequency !== undefined) updateData.check_frequency = check_frequency;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (notes !== undefined) updateData.notes = notes;

      const success = await KeywordTracking.update(id, userId, updateData);

      if (success) {
        const updated = await KeywordTracking.findById(id, userId);
        res.json({
          message: 'Keyword tracking updated successfully',
          data: updated
        });
      } else {
        res.status(500).json({
          error: 'Failed to update keyword tracking',
          message: 'No changes were made'
        });
      }

    } catch (error) {
      console.error('Error updating keyword tracking:', error);
      res.status(500).json({
        error: 'Failed to update keyword tracking',
        message: error.message
      });
    }
  }

  /**
   * Delete a keyword tracking entry
   */
  async deleteKeywordTracking(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Check if the keyword tracking exists and belongs to the user
      const existing = await KeywordTracking.findById(id, userId);
      if (!existing) {
        return res.status(404).json({
          error: 'Keyword tracking not found',
          message: 'The requested keyword tracking entry does not exist or does not belong to you'
        });
      }

      const success = await KeywordTracking.delete(id, userId);

      if (success) {
        res.json({
          message: 'Keyword tracking deleted successfully',
          data: { id: parseInt(id) }
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete keyword tracking',
          message: 'No changes were made'
        });
      }

    } catch (error) {
      console.error('Error deleting keyword tracking:', error);
      res.status(500).json({
        error: 'Failed to delete keyword tracking',
        message: error.message
      });
    }
  }

  /**
   * Check ranking for a specific keyword tracking entry
   */
  async checkRanking(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const keywordTracking = await KeywordTracking.findById(id, userId);
      if (!keywordTracking) {
        return res.status(404).json({
          error: 'Keyword tracking not found',
          message: 'The requested keyword tracking entry does not exist or does not belong to you'
        });
      }

      // Use the existing ranking API logic
      const rankingData = await this.getRankingFromAPI(
        keywordTracking.keyword,
        keywordTracking.target_url,
        keywordTracking.country
      );

      // Update the tracking entry with new ranking data
      const updated = await KeywordTracking.updateRanking(id, userId, {
        current_rank: rankingData.rank,
        search_volume: rankingData.search_volume,
        competition_level: rankingData.competition_level,
        cpc: rankingData.cpc,
        notes: `Manual check on ${new Date().toISOString()}. ${rankingData.rank ? `Found at position ${rankingData.rank}` : 'Not found in top 100 results'}`
      });

      if (updated) {
        const updatedTracking = await KeywordTracking.findById(id, userId);
        res.json({
          message: 'Ranking checked successfully',
          data: {
            keyword_tracking: updatedTracking,
            ranking_data: {
              rank: rankingData.rank,
              title: rankingData.title,
              snippet: rankingData.snippet,
              url: rankingData.url,
              search_volume: rankingData.search_volume,
              competition_level: rankingData.competition_level,
              cpc: rankingData.cpc,
              raw_data: rankingData.raw_data
            }
          }
        });
      } else {
        res.status(500).json({
          error: 'Failed to update ranking',
          message: 'Could not update the ranking data'
        });
      }

    } catch (error) {
      console.error('Error checking ranking:', error);
      res.status(500).json({
        error: 'Failed to check ranking',
        message: error.message
      });
    }
  }

  /**
   * Get ranking history for a keyword tracking entry
   */
  async getRankHistory(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { limit = 30 } = req.query;

      // Verify the keyword tracking belongs to the user
      const keywordTracking = await KeywordTracking.findById(id, userId);
      if (!keywordTracking) {
        return res.status(404).json({
          error: 'Keyword tracking not found',
          message: 'The requested keyword tracking entry does not exist or does not belong to you'
        });
      }

      const history = await KeywordTracking.getRankHistory(id, userId, parseInt(limit));

      res.json({
        data: {
          keyword_tracking: keywordTracking,
          rank_history: history
        }
      });

    } catch (error) {
      console.error('Error fetching rank history:', error);
      res.status(500).json({
        error: 'Failed to fetch rank history',
        message: error.message
      });
    }
  }

  /**
   * Bulk check rankings for multiple keyword tracking entries
   */
  async bulkCheckRankings(req, res) {
    try {
      const userId = req.user.id;
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          error: 'IDs array is required',
          message: 'Please provide an array of keyword tracking IDs to check'
        });
      }

      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          const keywordTracking = await KeywordTracking.findById(id, userId);
          if (!keywordTracking) {
            errors.push({ id, error: 'Keyword tracking not found' });
            continue;
          }

          const rankingData = await this.getRankingFromAPI(
            keywordTracking.keyword,
            keywordTracking.target_url,
            keywordTracking.country
          );

          const updated = await KeywordTracking.updateRanking(id, userId, {
            current_rank: rankingData.rank,
            search_volume: rankingData.search_volume,
            competition_level: rankingData.competition_level,
            cpc: rankingData.cpc,
            notes: `Bulk check on ${new Date().toISOString()}`
          });

          if (updated) {
            results.push({ id, success: true, ranking_data: rankingData });
          } else {
            errors.push({ id, error: 'Failed to update ranking' });
          }

        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        message: 'Bulk ranking check completed',
        data: {
          results,
          errors,
          summary: {
            total: ids.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      console.error('Error in bulk check rankings:', error);
      res.status(500).json({
        error: 'Failed to perform bulk ranking check',
        message: error.message
      });
    }
  }

  /**
   * Get ranking data from SerpAPI
   */
  async getRankingFromAPI(keyword, url, country = 'us') {
    try {
      // Use the same API key service as SeoControllerMap
      let serpapiKey = await seoApiKeyService.getAvailableApiKey();
      
      if (!serpapiKey) {
        throw new Error('No available SerpAPI key found');
      }

      const params = new URLSearchParams({
        engine: "google",
        q: keyword,
        google_domain: country === 'us' ? 'google.com' : `google.${country}`,
        hl: "en",
        num: "100", // fetch top 100 results
        api_key: serpapiKey
      });

      const apiUrl = `https://serpapi.com/search.json?${params.toString()}`;
      const response = await axios.get(apiUrl);
      const data = response.data;

      // Track API key usage (same as SeoControllerMap)
      await seoApiKeyService.incrementApiKeyUsage(serpapiKey, 1);

      if (!data.organic_results) {
        throw new Error("No organic results found.");
      }

      // Find the rank where your URL appears
      const match = data.organic_results.find(
        (result) =>
          result.link &&
          result.link.toLowerCase().includes(url.toLowerCase())
      );

      if (match) {
        return {
          rank: match.position,
          title: match.title,
          snippet: match.snippet,
          url: match.link,
          search_volume: null, // SerpAPI doesn't provide this
          competition_level: null, // SerpAPI doesn't provide this
          cpc: null, // SerpAPI doesn't provide this
          raw_data: {
            keyword,
            target_url: url,
            position: match.position,
            title: match.title,
            snippet: match.snippet,
            link: match.link
          }
        };
      } else {
        return {
          rank: null,
          title: null,
          snippet: null,
          url: null,
          search_volume: null,
          competition_level: null,
          cpc: null,
          raw_data: {
            keyword,
            target_url: url,
            position: null,
            message: "URL not found in top 100 results."
          }
        };
      }

    } catch (error) {
      console.error('Error getting ranking from SerpAPI:', error);
      throw new Error(`Failed to get ranking data: ${error.message}`);
    }
  }
}

module.exports = new KeywordTrackingController();

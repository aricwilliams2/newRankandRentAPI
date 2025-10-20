const db = require('../config/database');

class KeywordTracking {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.client_id = data.client_id;
    this.keyword = data.keyword;
    this.target_url = data.target_url;
    this.current_rank = data.current_rank;
    this.previous_rank = data.previous_rank;
    this.rank_change = data.rank_change;
    this.search_engine = data.search_engine || 'google';
    this.country = data.country || 'us';
    this.location = data.location;
    this.last_checked = data.last_checked;
    this.check_frequency = data.check_frequency || 'weekly';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Create a new keyword tracking entry
   */
  static async create(data) {
    const {
      user_id,
      client_id,
      keyword,
      target_url,
      search_engine = 'google',
      country = 'us',
      location = null,
      check_frequency = 'weekly',
      notes = null
    } = data;

    const query = `
      INSERT INTO keyword_tracking 
      (user_id, client_id, keyword, target_url, search_engine, country, location, check_frequency, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [user_id, client_id, keyword, target_url, search_engine, country, location, check_frequency, notes];
    
    try {
      const result = await db.query(query, values);
      return await this.findById(result.insertId, user_id);
    } catch (error) {
      console.error('Error creating keyword tracking:', error);
      throw error;
    }
  }

  /**
   * Find keyword tracking by ID and user
   */
  static async findById(id, userId) {
    const query = `
      SELECT kt.*, c.website, c.email, c.phone
      FROM keyword_tracking kt
      LEFT JOIN clients c ON kt.client_id = c.id
      WHERE kt.id = ? AND kt.user_id = ?
    `;
    
    try {
      const rows = await db.query(query, [id, userId]);
      return rows.length > 0 ? new KeywordTracking(rows[0]) : null;
    } catch (error) {
      console.error('Error finding keyword tracking by ID:', error);
      throw error;
    }
  }

  /**
   * Find all keyword tracking entries for a user
   */
  static async findByUserId(userId, options = {}) {
    // --- sanitize helpers ---
    const toNonNegInt = (v, d) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : d;
    };

    const {
      client_id = null,
      is_active = null,
      search = '',
      limit: rawLimit = 50,
      offset: rawOffset = 0,
      sort_by = 'created_at',
      sort_dir = 'desc'
    } = options;

    // Coerce to safe integers (guards "undefined", "NaN", "null", strings, etc.)
    const limit = toNonNegInt(rawLimit, 50);
    const offset = toNonNegInt(rawOffset, 0);

    // Whitelist for ORDER BY
    const validSortFields = ['created_at', 'updated_at', 'keyword', 'current_rank', 'last_checked'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = String(sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Base query (parameterized where it matters)
    let query = `
      SELECT kt.*, c.website, c.email, c.phone
      FROM keyword_tracking kt
      LEFT JOIN clients c ON kt.client_id = c.id
      WHERE kt.user_id = ?
    `;
    const values = [userId];

    if (client_id && client_id !== '') {
      query += ' AND kt.client_id = ?';
      values.push(client_id);
    }

    if (is_active !== null && is_active !== undefined) {
      query += ' AND kt.is_active = ?';
      values.push(!!is_active); // cast to boolean -> mysql2 maps to tinyint
    }

    if (String(search).trim()) {
      const s = `%${String(search).trim()}%`;
      query += ' AND (kt.keyword LIKE ? OR kt.target_url LIKE ? OR c.website LIKE ?)';
      values.push(s, s, s);
    }

    // Sorting (whitelisted above)
    query += ` ORDER BY kt.${sortField} ${sortDirection}`;

    // IMPORTANT:
    // MySQL drivers can be finicky with placeholders in LIMIT/OFFSET.
    // We inline *validated integers* to keep safety + compatibility.
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    try {
      console.log('=== DEBUG INFO ===');
      console.log('Query:', query);
      console.log('Values:', values);
      console.log('Values length:', values.length);
      console.log('Placeholders count:', (query.match(/\?/g) || []).length);
      console.log('==================');

      const rows = await db.query(query, values);
      return rows.map(row => new KeywordTracking(row));
    } catch (error) {
      console.error('Error finding keyword tracking by user ID:', error);
      throw error;
    }
  }

  /**
   * Count keyword tracking entries for a user
   */
  static async countByUserId(userId, filters = {}) {
    const { client_id = null, is_active = null, search = '' } = filters;

    let query = 'SELECT COUNT(*) as count FROM keyword_tracking WHERE user_id = ?';
    const values = [userId];

    if (client_id && client_id !== '') {
      query += ' AND client_id = ?';
      values.push(client_id);
    }

    if (is_active !== null && is_active !== undefined) {
      query += ' AND is_active = ?';
      values.push(is_active);
    }

    if (search.trim()) {
      query += ' AND (keyword LIKE ? OR target_url LIKE ?)';
      values.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    try {
      const rows = await db.query(query, values);
      return rows[0].count;
    } catch (error) {
      console.error('Error counting keyword tracking entries:', error);
      throw error;
    }
  }

  /**
   * Update keyword tracking entry
   */
  static async update(id, userId, data) {
    const allowedFields = [
      'keyword', 'target_url', 'current_rank', 'previous_rank', 'rank_change',
      'search_engine', 'country', 'location', 'last_checked', 'check_frequency',
      'is_active', 'notes'
    ];

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      return false;
    }

    values.push(id, userId);

    const query = `
      UPDATE keyword_tracking 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    try {
      const result = await db.query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating keyword tracking:', error);
      throw error;
    }
  }

  /**
   * Delete keyword tracking entry
   */
  static async delete(id, userId) {
    const query = 'DELETE FROM keyword_tracking WHERE id = ? AND user_id = ?';
    
    try {
      const result = await db.query(query, [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting keyword tracking:', error);
      throw error;
    }
  }

  /**
   * Check if keyword is already being tracked for a website
   */
  static async isTracked(userId, clientId, keyword, searchEngine = 'google', country = 'us') {
    const query = `
      SELECT id FROM keyword_tracking 
      WHERE user_id = ? AND client_id = ? AND keyword = ? AND search_engine = ? AND country = ?
    `;
    
    try {
      const rows = await db.query(query, [userId, clientId, keyword, searchEngine, country]);
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking if keyword is tracked:', error);
      throw error;
    }
  }

  /**
   * Update ranking data
   */
  static async updateRanking(id, userId, rankingData) {
    const { current_rank, search_volume = null, competition_level = null, cpc = null, notes = null } = rankingData;
    
    // Get current rank to calculate change
    const current = await this.findById(id, userId);
    if (!current) {
      throw new Error('Keyword tracking entry not found');
    }

    const previous_rank = current.current_rank;
    const rank_change = current_rank !== null && previous_rank !== null ? 
      previous_rank - current_rank : null;

    // Update the main tracking record
    const updateData = {
      current_rank,
      previous_rank,
      rank_change,
      last_checked: new Date()
    };

    const updated = await this.update(id, userId, updateData);
    
    if (updated && current_rank !== null) {
      // Add to history
      await this.addRankHistory(id, {
        rank_position: current_rank,
        search_volume,
        competition_level,
        cpc,
        notes
      });
    }

    return updated;
  }

  /**
   * Add ranking history entry
   */
  static async addRankHistory(keywordTrackingId, data) {
    const {
      rank_position,
      search_volume = null,
      competition_level = null,
      cpc = null,
      notes = null
    } = data;

    const query = `
      INSERT INTO keyword_rank_history 
      (keyword_tracking_id, rank_position, check_date, search_volume, competition_level, cpc, notes)
      VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    
    const values = [keywordTrackingId, rank_position, search_volume, competition_level, cpc, notes];
    
    try {
      const result = await db.query(query, values);
      return result.insertId;
    } catch (error) {
      console.error('Error adding rank history:', error);
      throw error;
    }
  }

  /**
   * Get ranking history for a keyword tracking entry
   */
  static async getRankHistory(keywordTrackingId, userId, limit = 30) {
    // Coerce to safe integer (guards against undefined, NaN, null, strings, etc.)
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) >= 0 ? Math.trunc(Number(limit)) : 30;
    
    const query = `
      SELECT krh.*
      FROM keyword_rank_history krh
      JOIN keyword_tracking kt ON krh.keyword_tracking_id = kt.id
      WHERE kt.id = ? AND kt.user_id = ?
      ORDER BY krh.check_date DESC
      LIMIT ${safeLimit}
    `;
    
    try {
      const rows = await db.query(query, [keywordTrackingId, userId]);
      return rows;
    } catch (error) {
      console.error('Error getting rank history:', error);
      throw error;
    }
  }

  /**
   * Get keywords that need to be checked based on frequency
   */
  static async getKeywordsToCheck() {
    const query = `
      SELECT kt.*, c.website
      FROM keyword_tracking kt
      JOIN clients c ON kt.client_id = c.id
      WHERE kt.is_active = TRUE
      AND (
        kt.last_checked IS NULL 
        OR (
          kt.check_frequency = 'daily' AND kt.last_checked < DATE_SUB(NOW(), INTERVAL 1 DAY)
        )
        OR (
          kt.check_frequency = 'weekly' AND kt.last_checked < DATE_SUB(NOW(), INTERVAL 1 WEEK)
        )
        OR (
          kt.check_frequency = 'monthly' AND kt.last_checked < DATE_SUB(NOW(), INTERVAL 1 MONTH)
        )
      )
      ORDER BY kt.last_checked ASC
    `;
    
    try {
      const rows = await db.query(query);
      return rows.map(row => new KeywordTracking(row));
    } catch (error) {
      console.error('Error getting keywords to check:', error);
      throw error;
    }
  }

  /**
   * Save the model instance
   */
  async save() {
    if (this.id) {
      // Update existing
      const updateData = {
        keyword: this.keyword,
        target_url: this.target_url,
        current_rank: this.current_rank,
        previous_rank: this.previous_rank,
        rank_change: this.rank_change,
        search_engine: this.search_engine,
        country: this.country,
        location: this.location,
        last_checked: this.last_checked,
        check_frequency: this.check_frequency,
        is_active: this.is_active,
        notes: this.notes
      };

      return await KeywordTracking.update(this.id, this.user_id, updateData);
    } else {
      // Create new
      const data = {
        user_id: this.user_id,
        client_id: this.client_id,
        keyword: this.keyword,
        target_url: this.target_url,
        search_engine: this.search_engine,
        country: this.country,
        location: this.location,
        check_frequency: this.check_frequency,
        notes: this.notes
      };

      const created = await KeywordTracking.create(data);
      if (created) {
        Object.assign(this, created);
        return true;
      }
      return false;
    }
  }
}

module.exports = KeywordTracking;

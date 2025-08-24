const db = require('../config/database');

class SavedKeyword {
  static async create(data) {
    const {
      user_id,
      keyword,
      difficulty = null,
      volume = null,
      last_updated,
      search_engine = 'google',
      country = 'us',
      category = 'idea',
      notes = null
    } = data;

    const uid = Number(user_id);
    if (!Number.isInteger(uid)) throw new Error('Invalid user_id');
    const kw = (keyword ?? '').trim();
    if (!kw) throw new Error('Keyword is required');

    // Coerce numerics
    const diffVal = (difficulty === undefined) ? null : Number(difficulty);
    const volVal = (volume === undefined) ? null : Number(volume);

    // Normalize dates (null if bad)
    let formattedLastUpdated = null;
    if (last_updated) {
      const dt = new Date(last_updated);
      if (!isNaN(dt.getTime())) {
        formattedLastUpdated = dt.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const query = `
      INSERT INTO saved_keywords
      (user_id, keyword, difficulty, volume, last_updated, search_engine, country, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      uid,
      kw,
      diffVal,
      volVal,
      formattedLastUpdated,
      String(search_engine || 'google'),
      String(country || 'us'),
      String(category || 'idea'),
      (notes === undefined ? null : notes)
    ];

    try {
      const result = await db.query(query, values);
      return { id: result.insertId, ...data };
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Keyword already saved by this user');
      }
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    const { category, limit = 50, offset = 0, search = '' } = options;

    // Coerce/validate inputs
    const uid = Number(userId);
    if (!Number.isInteger(uid)) throw new Error('Invalid userId');

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    let query = `
      SELECT * FROM saved_keywords
      WHERE user_id = ?
    `;
    const values = [uid];

    if (category) {
      query += ' AND category = ?';
      values.push(String(category));
    }

    if (search) {
      query += ' AND keyword LIKE ?';
      values.push(`%${String(search)}%`);
    }

    // Inline the *validated integers* to avoid LIMIT/OFFSET binding issues
    query += ` ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`;

    try {
      const rows = await db.query(query, values);
      return rows;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async findById(id, userId) {
    const kid = Number(id);
    const uid = Number(userId);
    if (!Number.isInteger(kid) || !Number.isInteger(uid)) throw new Error('Invalid ids');

    const query = `
      SELECT * FROM saved_keywords 
      WHERE id = ? AND user_id = ?
    `;

    try {
      const rows = await db.query(query, [kid, uid]);
      return rows[0] || null;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async update(id, userId, data) {
    const {
      difficulty = null,
      volume = null,
      last_updated,
      search_engine = 'google',
      country = 'us',
      category = 'idea',
      notes = null
    } = data;

    const uid = Number(userId);
    const kid = Number(id);
    if (!Number.isInteger(uid) || !Number.isInteger(kid)) throw new Error('Invalid ids');

    const diffVal = (difficulty === undefined) ? null : Number(difficulty);
    const volVal = (volume === undefined) ? null : Number(volume);

    let formattedLastUpdated = null;
    if (last_updated) {
      const dt = new Date(last_updated);
      if (!isNaN(dt.getTime())) {
        formattedLastUpdated = dt.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const query = `
      UPDATE saved_keywords
      SET difficulty = ?, volume = ?, last_updated = ?,
          search_engine = ?, country = ?, category = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `;

    const values = [
      diffVal,
      volVal,
      formattedLastUpdated,
      String(search_engine || 'google'),
      String(country || 'us'),
      String(category || 'idea'),
      (notes === undefined ? null : notes),
      kid,
      uid
    ];

    try {
      const result = await db.query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async delete(id, userId) {
    const kid = Number(id);
    const uid = Number(userId);
    if (!Number.isInteger(kid) || !Number.isInteger(uid)) throw new Error('Invalid ids');

    const query = `
      DELETE FROM saved_keywords 
      WHERE id = ? AND user_id = ?
    `;

    try {
      const result = await db.query(query, [kid, uid]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async deleteByKeyword(userId, keyword, category) {
    const uid = Number(userId);
    if (!Number.isInteger(uid)) throw new Error('Invalid userId');
    const kw = (keyword ?? '').trim();
    if (!kw) throw new Error('Keyword is required');

    const query = `
      DELETE FROM saved_keywords 
      WHERE user_id = ? AND keyword = ? AND category = ?
    `;

    try {
      const result = await db.query(query, [uid, kw, String(category || 'idea')]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async countByUserId(userId, category = null) {
    const uid = Number(userId);
    if (!Number.isInteger(uid)) throw new Error('Invalid userId');

    let query = 'SELECT COUNT(*) as count FROM saved_keywords WHERE user_id = ?';
    const values = [uid];
    
    if (category) {
      query += ' AND category = ?';
      values.push(String(category));
    }

    try {
      const rows = await db.query(query, values);
      return rows[0].count;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }

  static async isSaved(userId, keyword, category) {
    const uid = Number(userId);
    if (!Number.isInteger(uid)) throw new Error('Invalid userId');
    const kw = (keyword ?? '').trim();
    if (!kw) throw new Error('Keyword is required');

    const query = `
      SELECT id FROM saved_keywords 
      WHERE user_id = ? AND keyword = ? AND category = ?
    `;

    try {
      const rows = await db.query(query, [uid, kw, String(category || 'idea')]);
      return rows.length > 0;
    } catch (error) {
      console.error('MySQL error:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      throw error;
    }
  }
}

module.exports = SavedKeyword;

const db = require('../config/database');

// Safe JSON parsing function - only parse strings, return objects as-is
function safeJSON(value) {
  if (value == null) return {};
  if (typeof value === 'string') {
    try { 
      return JSON.parse(value); 
    } catch { 
      return {}; 
    }
  }
  // Already an object (mysql2 deserializes JSON columns)
  return value || {};
}

class VideoRecording {
  static async create(recordingData) {
    const {
      user_id,
      title,
      description,
      file_path,
      file_size,
      duration,
      recording_type, // 'screen', 'webcam', 'both'
      thumbnail_path,
      shareable_id,
      is_public,
      metadata
    } = recordingData;

    const sql = `
      INSERT INTO railway.video_recordings (
        user_id, title, description, file_path, file_size, duration,
        recording_type, thumbnail_path, shareable_id, is_public, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      user_id, title, description, file_path, file_size, duration,
      recording_type, thumbnail_path, shareable_id, is_public,
      JSON.stringify(metadata)
    ];

    try {
      const result = await db.query(sql, params);
      return { id: result.insertId, ...recordingData };
    } catch (error) {
      console.error('Error creating video recording:', error);
      throw error;
    }
  }

  static async findById(id, userId = null) {
    let sql = `
      SELECT vr.*, u.name as user_name, u.email as user_email
      FROM railway.video_recordings vr
      LEFT JOIN railway.users u ON vr.user_id = u.id
      WHERE vr.id = ?
    `;
    let params = [id];

    if (userId) {
      sql += ' AND (vr.user_id = ? OR vr.is_public = 1)';
      params.push(userId);
    }

    try {
      const results = await db.query(sql, params);
      if (results.length > 0) {
        const recording = results[0];
        recording.metadata = safeJSON(recording.metadata);
        return recording;
      }
      return null;
    } catch (error) {
      console.error('Error finding video recording:', error);
      throw error;
    }
  }

  static async findByShareableId(shareableId) {
    const sql = `
      SELECT vr.*, u.name as user_name, u.email as user_email
      FROM railway.video_recordings vr
      LEFT JOIN railway.users u ON vr.user_id = u.id
      WHERE vr.shareable_id = ? AND vr.is_public = 1
    `;

    try {
      const results = await db.query(sql, [shareableId]);
      if (results.length > 0) {
        const recording = results[0];
        recording.metadata = safeJSON(recording.metadata);
        return recording;
      }
      return null;
    } catch (error) {
      console.error('Error finding video recording by shareable ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const { page = 1, limit = 10, sort_by = 'created_at', sort_dir = 'DESC' } = options;
      
      // Sanitize to safe integers - inline LIMIT/OFFSET to avoid MySQL placeholder issues
      const lim = Math.max(1, Number.isFinite(+limit) ? +limit : 10);
      const pg = Math.max(1, Number.isFinite(+page) ? +page : 1);
      const offset = (pg - 1) * lim;
      const uid = parseInt(userId, 10);
      
      // Validate sort parameters to prevent SQL injection
      const allowedSortFields = ['created_at', 'title', 'duration', 'file_size'];
      const allowedSortDirs = ['ASC', 'DESC'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = allowedSortDirs.includes(sort_dir.toUpperCase()) ? sort_dir.toUpperCase() : 'DESC';
      
      const query = `
        SELECT vr.*, 
               COUNT(vv.id) as view_count,
               COUNT(DISTINCT vv.viewer_id) as unique_viewers
        FROM railway.video_recordings vr
        LEFT JOIN railway.video_views vv ON vr.id = vv.video_id
        WHERE vr.user_id = ?
        GROUP BY vr.id
        ORDER BY vr.${sortField} ${sortDirection}
        LIMIT ${lim} OFFSET ${offset}
      `;
      
      console.log('[VideoRecording.findByUserId] Query params:', { userId: uid, limit: lim, offset });
      console.log('[VideoRecording.findByUserId] Types:', { userId: typeof uid, limit: typeof lim, offset: typeof offset });
      
      // Only ONE placeholder now - just the user_id
      const rows = await db.query(query, [uid]);
      
      // Debug: log sample row types to understand data structure
      if (rows.length > 0) {
        console.log('[VideoRecording.findByUserId] sample row keys/types:',
          Object.fromEntries(Object.entries(rows[0]).map(([k,v]) => [k, typeof v])));
      }
      
      // Parse metadata safely for each recording
      return rows.map(row => ({
        ...row,
        metadata: safeJSON(row.metadata)
      }));
    } catch (error) {
      console.error('Error finding video recordings by user:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const sql = `
      UPDATE railway.video_recordings 
      SET ${fields}, updated_at = NOW()
      WHERE id = ?
    `;

    const params = [...Object.values(updateData), id];

    try {
      const result = await db.query(sql, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating video recording:', error);
      throw error;
    }
  }

  static async delete(id, userId) {
    const sql = 'DELETE FROM railway.video_recordings WHERE id = ? AND user_id = ?';

    try {
      const result = await db.query(sql, [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting video recording:', error);
      throw error;
    }
  }

  static async getAnalytics(videoId, userId) {
    const sql = `
      SELECT 
        vr.id,
        vr.title,
        vr.duration,
        COUNT(vv.id) as total_views,
        COUNT(DISTINCT vv.viewer_id) as unique_viewers,
        AVG(vv.watch_percentage) as avg_watch_percentage,
        AVG(vv.watch_duration) as avg_watch_duration,
        MIN(vv.created_at) as first_view,
        MAX(vv.created_at) as last_view
      FROM railway.video_recordings vr
      LEFT JOIN railway.video_views vv ON vr.id = vv.video_id
      WHERE vr.id = ? AND vr.user_id = ?
      GROUP BY vr.id
    `;

    try {
      const results = await db.query(sql, [videoId, userId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting video analytics:', error);
      throw error;
    }
  }

  static async generateShareableId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = VideoRecording;

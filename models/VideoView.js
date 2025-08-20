const db = require('../config/database');

class VideoView {
  static async create(viewData) {
    const {
      video_id,
      viewer_id,
      viewer_email,
      viewer_ip,
      user_agent,
      watch_duration,
      watch_percentage,
      engagement_data
    } = viewData;

    const sql = `
      INSERT INTO railway.video_views (
        video_id, viewer_id, viewer_email, viewer_ip, user_agent,
        watch_duration, watch_percentage, engagement_data, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      video_id, viewer_id, viewer_email, viewer_ip, user_agent,
      watch_duration, watch_percentage, JSON.stringify(engagement_data)
    ];

    try {
      const result = await db.query(sql, params);
      return { id: result.insertId, ...viewData };
    } catch (error) {
      console.error('Error creating video view:', error);
      throw error;
    }
  }

  static async findByVideoId(videoId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM railway.video_views 
      WHERE video_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    try {
      const results = await db.query(sql, [videoId, limit, offset]);
      return results.map(view => ({
        ...view,
        engagement_data: JSON.parse(view.engagement_data || '{}')
      }));
    } catch (error) {
      console.error('Error finding video views:', error);
      throw error;
    }
  }

  static async getViewerStats(videoId) {
    const sql = `
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT viewer_id) as unique_viewers,
        COUNT(DISTINCT viewer_email) as unique_emails,
        AVG(watch_percentage) as avg_watch_percentage,
        AVG(watch_duration) as avg_watch_duration,
        MIN(created_at) as first_view,
        MAX(created_at) as last_view
      FROM railway.video_views
      WHERE video_id = ?
    `;

    try {
      const results = await db.query(sql, [videoId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting viewer stats:', error);
      throw error;
    }
  }

  static async getEngagementHeatmap(videoId) {
    const sql = `
      SELECT 
        watch_percentage,
        COUNT(*) as viewer_count
      FROM railway.video_views
      WHERE video_id = ?
      GROUP BY FLOOR(watch_percentage / 10) * 10
      ORDER BY watch_percentage
    `;

    try {
      const results = await db.query(sql, [videoId]);
      return results;
    } catch (error) {
      console.error('Error getting engagement heatmap:', error);
      throw error;
    }
  }

  static async getTopViewers(videoId, limit = 10) {
    const sql = `
      SELECT 
        viewer_email,
        COUNT(*) as view_count,
        AVG(watch_percentage) as avg_watch_percentage,
        MAX(watch_percentage) as best_watch_percentage,
        MAX(created_at) as last_view
      FROM railway.video_views
      WHERE video_id = ? AND viewer_email IS NOT NULL
      GROUP BY viewer_email
      ORDER BY avg_watch_percentage DESC, view_count DESC
      LIMIT ?
    `;

    try {
      const results = await db.query(sql, [videoId, limit]);
      return results;
    } catch (error) {
      console.error('Error getting top viewers:', error);
      throw error;
    }
  }

  static async updateView(viewId, updateData) {
    const fields = Object.keys(updateData)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    const sql = `
      UPDATE railway.video_views 
      SET ${fields}
      WHERE id = ?
    `;

    const params = [...Object.values(updateData), viewId];

    try {
      const result = await db.query(sql, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating video view:', error);
      throw error;
    }
  }

  static async getViewerByEmail(videoId, email) {
    const sql = `
      SELECT * FROM railway.video_views
      WHERE video_id = ? AND viewer_email = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const results = await db.query(sql, [videoId, email]);
      if (results.length > 0) {
        const view = results[0];
        view.engagement_data = JSON.parse(view.engagement_data || '{}');
        return view;
      }
      return null;
    } catch (error) {
      console.error('Error finding viewer by email:', error);
      throw error;
    }
  }

  static async generateViewerId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = VideoView;

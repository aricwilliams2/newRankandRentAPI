const db = require('../config/database');

class Activity {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.description = data.description;
    this.website_id = data.website_id;
    this.user_id = data.user_id;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
  }

  static async findRecent(limit = 10, userId) {
    // Ensure limit is a valid number
    const validLimit = parseInt(limit) || 10;
    
    // Ensure userId is valid
    if (!userId || isNaN(userId)) {
      throw new Error('Invalid user ID provided');
    }
    
    const sql = `
      SELECT a.*, w.domain as website_domain 
      FROM activity_log a 
      LEFT JOIN websites w ON a.website_id = w.id 
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC 
      LIMIT ?
    `;
    
    // Debug logging
    console.log('Activity.findRecent called with:', { limit, userId, validLimit });
    console.log('SQL params:', [parseInt(userId), validLimit]);
    
    const results = await db.query(sql, [parseInt(userId), validLimit]);
    return results.map(row => ({
      ...new Activity(row),
      website_domain: row.website_domain
    }));
  }

  static async create(data) {
    const activity = new Activity(data);
    const now = new Date();
    activity.created_at = now;

    const sql = `
      INSERT INTO activity_log (
        user_id, type, title, description, website_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      activity.user_id,
      activity.type, activity.title, activity.description,
      activity.website_id,
      activity.metadata ? JSON.stringify(activity.metadata) : null,
      activity.created_at
    ];
    const result = await db.query(sql, params);
    activity.id = result.insertId;
    return activity;
  }

  static async logActivity(type, title, description = null, websiteId = null, userId, metadata = null) {
    return await this.create({
      user_id: userId,
      type,
      title,
      description,
      website_id: websiteId,
      metadata
    });
  }
}

module.exports = Activity;
const db = require('../config/database');

class AnalyticsSnapshot {
  constructor(row = {}) {
    this.id = row.id;
    this.user_id = row.user_id;
    this.url = row.url;
    this.mode = row.mode;
    this.snapshot_json = row.snapshot_json; // stringified JSON
    this.created_at = row.created_at;
  }

  static async create({ user_id, url, mode, snapshot }) {
    const jsonString = JSON.stringify(snapshot ?? {});
    const sql = `
      INSERT INTO analytics_snapshots (user_id, url, mode, snapshot_json, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const result = await db.query(sql, [user_id, url, mode || null, jsonString]);
    const rows = await db.query('SELECT * FROM analytics_snapshots WHERE id = ?', [result.insertId]);
    return rows.length ? new AnalyticsSnapshot(rows[0]) : null;
  }

  static async listByUser(user_id, limit = 50, offset = 0) {
    const lim = Math.max(1, Math.min(200, parseInt(limit)));
    const off = Math.max(0, parseInt(offset));
    const rows = await db.query(
      `SELECT id, url, mode, created_at FROM analytics_snapshots
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${off}`,
      [user_id]
    );
    return rows.map(r => new AnalyticsSnapshot(r));
  }

  static async findByIdForUser(id, user_id) {
    const rows = await db.query('SELECT * FROM analytics_snapshots WHERE id = ? AND user_id = ?', [id, user_id]);
    return rows.length ? new AnalyticsSnapshot(rows[0]) : null;
  }

  static async deleteForUser(id, user_id) {
    const result = await db.query('DELETE FROM analytics_snapshots WHERE id = ? AND user_id = ?', [id, user_id]);
    return result.affectedRows > 0;
  }
}

module.exports = AnalyticsSnapshot;



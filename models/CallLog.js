const db = require("../config/database");

class CallLog {
  constructor(data = {}) {
    this.id = data.id;
    this.lead_id = data.lead_id;
    this.outcome = data.outcome; // 'follow_up_1_day', 'follow_up_72_hours', 'follow_up_next_week', 'follow_up_next_month', 'follow_up_3_months'
    this.notes = data.notes;
    this.next_follow_up = data.next_follow_up;
    this.duration = data.duration; // in seconds
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByLeadId(leadId) {
    const sql = `
      SELECT * FROM call_logs 
      WHERE lead_id = ?
      ORDER BY created_at DESC
    `;
    const results = await db.query(sql, [leadId]);
    return results.map(row => new CallLog(row));
  }

  static async findById(id) {
    const sql = "SELECT * FROM call_logs WHERE id = ?";
    const results = await db.query(sql, [id]);
    return results.length ? new CallLog(results[0]) : null;
  }

  static async create(data) {
    const now = new Date();
    
    // Convert ISO datetime string to MySQL format
    let nextFollowUp = null;
    if (data.next_follow_up) {
      try {
        const followUpDate = new Date(data.next_follow_up);
        nextFollowUp = followUpDate.toISOString().slice(0, 19).replace('T', ' ');
      } catch (error) {
        console.error('Error parsing next_follow_up date:', error);
        nextFollowUp = null;
      }
    }
    
    const sql = `
      INSERT INTO call_logs (
        lead_id, outcome, notes, next_follow_up, duration, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.lead_id,
      data.outcome,
      data.notes,
      nextFollowUp,
      data.duration || 0,
      now,
      now
    ];

    const result = await db.query(sql, params);
    return await CallLog.findById(result.insertId);
  }

  async update(data) {
    const now = new Date();
    
    // Convert ISO datetime string to MySQL format
    let nextFollowUp = this.next_follow_up;
    if (data.next_follow_up) {
      try {
        const followUpDate = new Date(data.next_follow_up);
        nextFollowUp = followUpDate.toISOString().slice(0, 19).replace('T', ' ');
      } catch (error) {
        console.error('Error parsing next_follow_up date:', error);
        nextFollowUp = this.next_follow_up;
      }
    }
    
    const sql = `
      UPDATE call_logs SET 
        outcome = ?, notes = ?, next_follow_up = ?, 
        duration = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const params = [
      data.outcome || this.outcome,
      data.notes || this.notes,
      nextFollowUp,
      data.duration || this.duration,
      now,
      this.id
    ];

    await db.query(sql, params);
    return await CallLog.findById(this.id);
  }

  async delete() {
    const sql = "DELETE FROM call_logs WHERE id = ?";
    await db.query(sql, [this.id]);
  }

  static async getUpcomingFollowUps(limit = 10) {
    const sql = `
      SELECT cl.*, l.name as lead_name, l.email as lead_email
      FROM call_logs cl
      LEFT JOIN leads l ON cl.lead_id = l.id
      WHERE cl.next_follow_up IS NOT NULL 
        AND cl.next_follow_up >= NOW()
      ORDER BY cl.next_follow_up ASC
      LIMIT ?
    `;
    const results = await db.query(sql, [limit]);
    return results.map(row => new CallLog(row));
  }
}

module.exports = CallLog; 
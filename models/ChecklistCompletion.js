const db = require("../config/database");

class ChecklistCompletion {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.client_id = data.client_id;
    this.checklist_item_id = data.checklist_item_id;
    this.is_completed = data.is_completed || false;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByUserAndClient(userId, clientId) {
    const sql = "SELECT * FROM checklist_completion WHERE user_id = ? AND client_id = ?";
    const results = await db.query(sql, [userId, clientId]);
    return results.map(row => new ChecklistCompletion(row));
  }

  static async findByUserAndClientAndItem(userId, clientId, checklistItemId) {
    const sql = "SELECT * FROM checklist_completion WHERE user_id = ? AND client_id = ? AND checklist_item_id = ?";
    const results = await db.query(sql, [userId, clientId, checklistItemId]);
    return results.length ? new ChecklistCompletion(results[0]) : null;
  }

  static async toggleCompletion(userId, clientId, checklistItemId, isCompleted = null) {
    const now = new Date();
    
    // Check if record exists
    const existing = await this.findByUserAndClientAndItem(userId, clientId, checklistItemId);
    
    if (existing) {
      // Update existing record
      const newIsCompleted = isCompleted !== null ? isCompleted : !existing.is_completed;
      const completedAt = newIsCompleted ? now : null;
      
      const sql = `
        UPDATE checklist_completion 
        SET is_completed = ?, completed_at = ?, updated_at = ? 
        WHERE user_id = ? AND client_id = ? AND checklist_item_id = ?
      `;
      
      await db.query(sql, [newIsCompleted, completedAt, now, userId, clientId, checklistItemId]);
      
      return await this.findByUserAndClientAndItem(userId, clientId, checklistItemId);
    } else {
      // Create new record
      const newIsCompleted = isCompleted !== null ? isCompleted : true;
      const completedAt = newIsCompleted ? now : null;
      
      const sql = `
        INSERT INTO checklist_completion (
          user_id, client_id, checklist_item_id, is_completed, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await db.query(sql, [
        userId, 
        clientId, 
        checklistItemId, 
        newIsCompleted, 
        completedAt, 
        now, 
        now
      ]);
      
      return await this.findById(result.insertId);
    }
  }

  static async markAsCompleted(userId, clientId, checklistItemId) {
    return await this.toggleCompletion(userId, clientId, checklistItemId, true);
  }

  static async markAsIncomplete(userId, clientId, checklistItemId) {
    return await this.toggleCompletion(userId, clientId, checklistItemId, false);
  }

  static async findById(id) {
    const sql = "SELECT * FROM checklist_completion WHERE id = ?";
    const results = await db.query(sql, [id]);
    return results.length ? new ChecklistCompletion(results[0]) : null;
  }

  static async getCompletionStats(userId, clientId) {
    const sql = `
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_items,
        SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) as incomplete_items
      FROM checklist_completion 
      WHERE user_id = ? AND client_id = ?
    `;
    
    const results = await db.query(sql, [userId, clientId]);
    return results[0] || { total_items: 0, completed_items: 0, incomplete_items: 0 };
  }

  static async getCompletedItems(userId, clientId) {
    const sql = "SELECT * FROM checklist_completion WHERE user_id = ? AND client_id = ? AND is_completed = 1";
    const results = await db.query(sql, [userId, clientId]);
    return results.map(row => new ChecklistCompletion(row));
  }

  static async getIncompleteItems(userId, clientId) {
    const sql = "SELECT * FROM checklist_completion WHERE user_id = ? AND client_id = ? AND is_completed = 0";
    const results = await db.query(sql, [userId, clientId]);
    return results.map(row => new ChecklistCompletion(row));
  }

  static async deleteByUserAndClient(userId, clientId) {
    const sql = "DELETE FROM checklist_completion WHERE user_id = ? AND client_id = ?";
    await db.query(sql, [userId, clientId]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      client_id: this.client_id,
      checklist_item_id: this.checklist_item_id,
      is_completed: this.is_completed,
      completed_at: this.completed_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ChecklistCompletion;

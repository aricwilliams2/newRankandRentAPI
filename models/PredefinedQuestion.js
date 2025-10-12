const db = require("../config/database");

class PredefinedQuestion {
  constructor(data = {}) {
    this.id = data.id;
    this.question = data.question;
    this.category = data.category;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findAll() {
    const sql = "SELECT * FROM predefined_questions WHERE is_active = TRUE ORDER BY category, question";
    const results = await db.query(sql);
    return results.map(row => new PredefinedQuestion(row));
  }

  static async findById(id) {
    const sql = "SELECT * FROM predefined_questions WHERE id = ? AND is_active = TRUE";
    const results = await db.query(sql, [id]);
    return results.length ? new PredefinedQuestion(results[0]) : null;
  }

  static async findByCategory(category) {
    const sql = "SELECT * FROM predefined_questions WHERE category = ? AND is_active = TRUE ORDER BY question";
    const results = await db.query(sql, [category]);
    return results.map(row => new PredefinedQuestion(row));
  }

  static async getCategories() {
    const sql = "SELECT DISTINCT category FROM predefined_questions WHERE is_active = TRUE ORDER BY category";
    const results = await db.query(sql);
    return results.map(row => row.category);
  }

  static async validateQuestionIds(questionIds) {
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return { valid: false, message: 'Question IDs array is required' };
    }

    const placeholders = questionIds.map(() => '?').join(',');
    const sql = `SELECT id FROM predefined_questions WHERE id IN (${placeholders}) AND is_active = TRUE`;
    const results = await db.query(sql, questionIds);

    if (results.length !== questionIds.length) {
      return { valid: false, message: 'One or more question IDs are invalid or inactive' };
    }

    return { valid: true, message: 'All question IDs are valid' };
  }

  toJSON() {
    return {
      id: this.id,
      question: this.question,
      category: this.category,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = PredefinedQuestion;

const db = require("../config/database");
const bcrypt = require("bcryptjs");

class SecurityQuestion {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.predefined_question_id = data.predefined_question_id;
    this.question = data.question; // This will be populated from predefined_questions table
    this.answer_hash = data.answer_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByUserId(userId) {
    const sql = `
      SELECT sq.*, pq.question 
      FROM security_questions sq 
      JOIN predefined_questions pq ON sq.predefined_question_id = pq.id 
      WHERE sq.user_id = ? AND pq.is_active = TRUE
    `;
    const results = await db.query(sql, [userId]);
    return results.map(row => new SecurityQuestion(row));
  }

  static async findById(id) {
    const sql = "SELECT * FROM security_questions WHERE id = ?";
    const results = await db.query(sql, [id]);
    return results.length ? new SecurityQuestion(results[0]) : null;
  }

  static async create(data) {
    const hashedAnswer = await bcrypt.hash(data.answer.toLowerCase().trim(), 12);
    const now = new Date();

    const sql = `
      INSERT INTO security_questions (user_id, predefined_question_id, answer_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.query(sql, [
      data.user_id,
      data.predefined_question_id,
      hashedAnswer,
      now,
      now
    ]);

    return await SecurityQuestion.findById(result.insertId);
  }

  static async createMultiple(questionsData) {
    const now = new Date();
    const values = [];
    const params = [];

    for (const data of questionsData) {
      const hashedAnswer = await bcrypt.hash(data.answer.toLowerCase().trim(), 12);
      values.push("(?, ?, ?, ?, ?)");
      params.push(data.user_id, data.predefined_question_id, hashedAnswer, now, now);
    }

    const sql = `
      INSERT INTO security_questions (user_id, predefined_question_id, answer_hash, created_at, updated_at)
      VALUES ${values.join(", ")}
    `;

    await db.query(sql, params);
    return await SecurityQuestion.findByUserId(questionsData[0].user_id);
  }

  async verifyAnswer(answer) {
    return await bcrypt.compare(answer.toLowerCase().trim(), this.answer_hash);
  }

  static async verifyUserAnswers(userId, answers) {
    const questions = await SecurityQuestion.findByUserId(userId);
    
    if (questions.length === 0) {
      return { success: false, message: "No security questions found" };
    }

    if (questions.length !== answers.length) {
      return { success: false, message: "Number of answers doesn't match number of questions" };
    }

    // Verify each answer
    for (let i = 0; i < questions.length; i++) {
      const isValid = await questions[i].verifyAnswer(answers[i]);
      if (!isValid) {
        return { success: false, message: "One or more security question answers are incorrect" };
      }
    }

    return { success: true, message: "All security questions answered correctly" };
  }

  static async deleteByUserId(userId) {
    const sql = "DELETE FROM security_questions WHERE user_id = ?";
    await db.query(sql, [userId]);
  }

  static async updateAnswer(id, newAnswer) {
    const hashedAnswer = await bcrypt.hash(newAnswer.toLowerCase().trim(), 12);
    const now = new Date();
    
    const sql = "UPDATE security_questions SET answer_hash = ?, updated_at = ? WHERE id = ?";
    await db.query(sql, [hashedAnswer, now, id]);
    
    return await SecurityQuestion.findById(id);
  }

  static async deleteById(id) {
    const sql = "DELETE FROM security_questions WHERE id = ?";
    await db.query(sql, [id]);
  }

  toJSON() {
    const { answer_hash, ...questionWithoutAnswer } = this;
    return questionWithoutAnswer;
  }
}

module.exports = SecurityQuestion;

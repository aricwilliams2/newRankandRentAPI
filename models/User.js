const db = require("../config/database");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByEmail(email) {
    const sql = "SELECT * FROM users WHERE email = ?";
    const results = await db.query(sql, [email]);
    return results.length ? new User(results[0]) : null;
  }

  static async findById(id) {
    const sql = "SELECT * FROM users WHERE id = ?";
    const results = await db.query(sql, [id]);
    return results.length ? new User(results[0]) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const now = new Date();

    const sql = `
    INSERT INTO users (name, email, password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `;

    const result = await db.query(sql, [data.name, data.email, hashedPassword, now, now]);

    return await User.findById(result.insertId);
  }

  async comparePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  static async updateIsPaid(id, isPaid = true) {
    const sql = "UPDATE users SET is_paid = ?, updated_at = ? WHERE id = ?";
    const now = new Date();
    await db.query(sql, [isPaid, now, id]);
    return await User.findById(id);
  }
  static async updateStripeData(id, { is_paid, stripe_customer_id }) {
    const sql = "UPDATE users SET is_paid = ?, stripe_customer_id = ?, updated_at = ? WHERE id = ?";
    const now = new Date();
    await db.query(sql, [is_paid, stripe_customer_id, now, id]);
    return await User.findById(id);
  }
  static async downgradeByCustomerId(stripeCustomerId) {
    const sql = "UPDATE users SET is_paid = false, updated_at = ? WHERE stripe_customer_id = ?";
    const now = new Date();
    await db.query(sql, [now, stripeCustomerId]);
  }

  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;

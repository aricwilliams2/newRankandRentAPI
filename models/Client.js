const db = require('../config/database');

class Client {
  constructor(data = {}) {
    this.id = data.id; // auto-incremented in DB
    this.name = data.name;
    this.city = data.city;
    this.reviews = data.reviews || 0;
    this.phone = data.phone;
    this.website = data.website;
    this.contacted = data.contacted || false;
    this.follow_up_at = data.follow_up_at;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.email = data.email;
    this.user_id = data.user_id;
  }

  static async findAll(filters = {}, userId) {
    let sql = 'SELECT * FROM clients WHERE user_id = ?';
    const params = [userId];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    const allowedSorts = ['created_at', 'name', 'email', 'city'];
    let sortBy = filters.sort_by;
    if (!allowedSorts.includes(sortBy)) sortBy = 'created_at';

    let sortDir = filters.sort_dir?.toLowerCase();
    if (!['asc', 'desc'].includes(sortDir)) sortDir = 'desc';

    sql += ` ORDER BY \`${sortBy}\` ${sortDir}`;

    const results = await db.query(sql, params);
    return {
      data: results.map(row => new Client(row)),
      pagination: null,
    };
  }

  static async findById(id, userId) {
    const sql = 'SELECT * FROM clients WHERE id = ? AND user_id = ?';
    const results = await db.query(sql, [id, userId]);
    return results.length ? new Client(results[0]) : null;
  }

  sanitize(value) {
    return value === undefined ? null : value;
  }

  async save() {
    const now = new Date();

    if (this.id) {
      const existing = await db.query('SELECT id FROM clients WHERE id = ?', [this.id]);
      if (existing.length > 0) {
        this.updated_at = now;
        const sql = `
          UPDATE clients SET
            name = ?, city = ?, reviews = ?, phone = ?, website = ?,
            contacted = ?, follow_up_at = ?, notes = ?, created_at = ?, updated_at = ?,
            email = ?, user_id = ?
          WHERE id = ?
        `;
     const params = [
  this.name,
  this.city,
  this.reviews,
  this.phone,
  this.website,
  this.contacted,
  this.follow_up_at,
  this.notes,
  this.created_at,
  this.updated_at,
  this.email,
  this.user_id,
  this.id
];

        await db.query(sql, params);
        return this;
      }
    }

    this.created_at = now;
    this.updated_at = now;

    const sql = `
      INSERT INTO clients (
        name, city, reviews, phone, website,
        contacted, follow_up_at, notes, created_at, updated_at, email, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

   const params = [
  this.name,
  this.city,
  this.reviews,
  this.phone,
  this.website,
  this.contacted,
  this.follow_up_at,
  this.notes,
  this.created_at,
  this.updated_at,
  this.email,
  this.user_id
];


    const result = await db.query(sql, params);
    this.id = result.insertId;

    return this;
  }

  async delete() {
    const sql = 'DELETE FROM clients WHERE id = ? AND user_id = ?';
    await db.query(sql, [this.id, this.user_id]);
    return true;
  }

  static async create(data) {
    const client = new Client(data);
    return await client.save();
  }

  async update(data) {
    for (const key of Object.keys(data)) {
      if (this.hasOwnProperty(key) && key !== 'id' && key !== 'created_at') {
        this[key] = data[key];
      }
    }
    return await this.save();
  }
}

module.exports = Client;

const db = require('../config/database');

class Lead {
  constructor(data = {}) {
    this.id = data.id; // only used for existing rows
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.company = data.company;
    this.status = data.status || 'New';
    this.notes = data.notes;
    this.reviews = data.reviews;
    this.website = data.website;
    this.contacted = data.contacted || false;
    this.city = data.city;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const allowedSorts = ['created_at', 'name', 'email', 'company'];
    let sortBy = filters.sort_by;
    if (!allowedSorts.includes(sortBy)) sortBy = 'created_at';

    let sortDir = filters.sort_dir?.toLowerCase();
    if (!['asc', 'desc'].includes(sortDir)) sortDir = 'desc';

    sql += ` ORDER BY \`${sortBy}\` ${sortDir}`;

    const results = await db.query(sql, params);
    return {
      data: results.map(row => new Lead(row)),
      pagination: null,
    };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM leads WHERE id = ?';
    const results = await db.query(sql, [id]);
    return results.length ? new Lead(results[0]) : null;
  }

  async save() {
    const now = new Date();

    if (this.id) {
      // Check if row exists
      const existing = await db.query('SELECT id FROM leads WHERE id = ?', [this.id]);
      if (existing.length > 0) {
        // Do update
        this.updated_at = now;
        const sql = `
          UPDATE leads SET 
            name = ?, email = ?, phone = ?, company = ?, status = ?, 
            notes = ?, reviews = ?, website = ?, contacted = ?, city = ?, 
            updated_at = ?
          WHERE id = ?
        `;
        const params = [
          this.name, this.email, this.phone, this.company, this.status,
          this.notes, this.reviews, this.website, this.contacted, this.city,
          this.updated_at, this.id
        ];
        await db.query(sql, params);
        return this;
      }
    }

    // Do insert
    this.created_at = now;
    this.updated_at = now;
    const sql = `
      INSERT INTO leads (
        name, email, phone, company, status, notes, reviews,
        website, contacted, city, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      this.name, this.email, this.phone, this.company, this.status,
      this.notes, this.reviews, this.website, this.contacted, this.city,
      this.created_at, this.updated_at
    ];
    const result = await db.query(sql, params);
    this.id = result.insertId;
    return this;
  }

  async delete() {
    const sql = 'DELETE FROM leads WHERE id = ?';
    await db.query(sql, [this.id]);
    return true;
  }

  static async create(data) {
    const lead = new Lead(data);
    return await lead.save();
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

module.exports = Lead;

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Client {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.website = data.website;
    this.phone = data.phone;
    this.email = data.email;
    this.status = data.status || 'new';
    this.revenue = data.revenue || 0;
    this.history = data.history;
    this.note = data.note;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM clients WHERE 1=1';
    const params = [];
    
    // Apply filters
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.search) {
      sql += ' AND (website LIKE ? OR email LIKE ? OR note LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Apply sorting
    const allowedSorts = ['created_at', 'website', 'email', 'status', 'revenue'];
    let sortBy = filters.sort_by;
    if (!allowedSorts.includes(sortBy)) {
      sortBy = 'created_at';
    }

    let sortDir = filters.sort_dir?.toLowerCase();
    if (!['asc', 'desc'].includes(sortDir)) {
      sortDir = 'desc';
    }
    sql += ` ORDER BY \`${sortBy}\` ${sortDir}`;
    
    // Apply pagination
    const page = parseInt(filters.page) || 1;
    const perPage = parseInt(filters.per_page) || 15;
    const offset = (page - 1) * perPage;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(perPage, offset);
    
    const clients = await db.query(sql, params);
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM clients WHERE 1=1';
    const countParams = [];
    
    if (filters.status) {
      countSql += ' AND status = ?';
      countParams.push(filters.status);
    }
    
    if (filters.search) {
      countSql += ' AND (website LIKE ? OR email LIKE ? OR note LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await db.query(countSql, countParams);
    const total = countResult[0].total;
    
    return {
      data: clients.map(client => new Client(client)),
      pagination: {
        current_page: page,
        per_page: perPage,
        total: total,
        last_page: Math.ceil(total / perPage),
        from: offset + 1,
        to: Math.min(offset + perPage, total)
      }
    };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM clients WHERE id = ?';
    const results = await db.query(sql, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new Client(results[0]);
  }

  async save() {
    const now = new Date();
    
    if (this.created_at) {
      // Update existing client
      this.updated_at = now;
      const sql = `
        UPDATE clients SET 
          website = ?, phone = ?, email = ?, status = ?, 
          revenue = ?, history = ?, note = ?, updated_at = ?
        WHERE id = ?
      `;
      const params = [
        this.website, this.phone, this.email, this.status,
        this.revenue, this.history, this.note, this.updated_at, this.id
      ];
      
      await db.query(sql, params);
    } else {
      // Create new client
      this.created_at = now;
      this.updated_at = now;
      const sql = `
        INSERT INTO clients (
          id, website, phone, email, status, revenue, history, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        this.id, this.website, this.phone, this.email, this.status,
        this.revenue, this.history, this.note, this.created_at, this.updated_at
      ];
      
      await db.query(sql, params);
    }
    
    return this;
  }

  async delete() {
    const sql = 'DELETE FROM clients WHERE id = ?';
    await db.query(sql, [this.id]);
    return true;
  }

  static async create(data) {
    const client = new Client(data);
    return await client.save();
  }

  async update(data) {
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key) && key !== 'id' && key !== 'created_at') {
        this[key] = data[key];
      }
    });
    
    return await this.save();
  }
}

module.exports = Client;
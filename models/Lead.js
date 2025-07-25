const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Lead {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
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
    
    // Apply filters
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.search) {
      sql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Apply sorting

const allowedSorts = ['created_at', 'name', 'email', 'company'];

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
    
    const leads = await db.query(sql, params);
    
    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM leads WHERE 1=1';
    const countParams = [];
    
    if (filters.status) {
      countSql += ' AND status = ?';
      countParams.push(filters.status);
    }
    
    if (filters.search) {
      countSql += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await db.query(countSql, countParams);
    const total = countResult[0].total;
    
    return {
      data: leads.map(lead => new Lead(lead)),
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
    const sql = 'SELECT * FROM leads WHERE id = ?';
    const results = await db.query(sql, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new Lead(results[0]);
  }

  async save() {
    const now = new Date();
    
    if (this.created_at) {
      // Update existing lead
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
    } else {
      // Create new lead
      this.created_at = now;
      this.updated_at = now;
      const sql = `
        INSERT INTO leads (
          id, name, email, phone, company, status, notes, reviews, 
          website, contacted, city, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        this.id, this.name, this.email, this.phone, this.company, this.status,
        this.notes, this.reviews, this.website, this.contacted, this.city,
        this.created_at, this.updated_at
      ];
      
      await db.query(sql, params);
    }
    
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
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key) && key !== 'id' && key !== 'created_at') {
        this[key] = data[key];
      }
    });
    
    return await this.save();
  }
}

module.exports = Lead;
const db = require('../config/database');

class Website {
  constructor(data = {}) {
    this.id = data.id;
    this.domain = data.domain;
    this.niche = data.niche;
    this.status = data.status || 'active';
    this.monthly_revenue = data.monthly_revenue || 0;
    this.domain_authority = data.domain_authority || 0;
    this.backlinks = data.backlinks || 0;
    this.organic_keywords = data.organic_keywords || 0;
    this.organic_traffic = data.organic_traffic || 0;
    this.top_keywords = data.top_keywords;
    this.competitors = data.competitors;
    this.seo_last_updated = data.seo_last_updated;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM websites WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ' AND (domain LIKE ? OR niche LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const allowedSorts = ['created_at', 'domain', 'monthly_revenue', 'domain_authority'];
    let sortBy = filters.sort_by;
    if (!allowedSorts.includes(sortBy)) sortBy = 'created_at';

    let sortDir = filters.sort_dir?.toLowerCase();
    if (!['asc', 'desc'].includes(sortDir)) sortDir = 'desc';

    sql += ` ORDER BY \`${sortBy}\` ${sortDir}`;

    const results = await db.query(sql, params);
    return {
      data: results.map(row => new Website(row)),
      pagination: null,
    };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM websites WHERE id = ?';
    const results = await db.query(sql, [id]);
    return results.length ? new Website(results[0]) : null;
  }

  async save() {
    const now = new Date();

    const topKeywords = this.top_keywords !== undefined ? JSON.stringify(this.top_keywords) : null;
    const competitors = this.competitors !== undefined ? JSON.stringify(this.competitors) : null;
    const seoLastUpdated = this.seo_last_updated !== undefined ? this.seo_last_updated : null;

    if (this.id) {
      const existing = await db.query('SELECT id FROM websites WHERE id = ?', [this.id]);
      if (existing.length > 0) {
        this.updated_at = now;
        const sql = `
          UPDATE websites SET 
            domain = ?, niche = ?, status = ?, monthly_revenue = ?, 
            domain_authority = ?, backlinks = ?, organic_keywords = ?, 
            organic_traffic = ?, top_keywords = ?, competitors = ?, 
            seo_last_updated = ?, updated_at = ?
          WHERE id = ?
        `;
        const params = [
          this.domain, this.niche, this.status, this.monthly_revenue,
          this.domain_authority, this.backlinks, this.organic_keywords,
          this.organic_traffic, topKeywords, competitors,
          seoLastUpdated, this.updated_at, this.id
        ];
        await db.query(sql, params);
        return this;
      }
    }

    this.created_at = now;
    this.updated_at = now;
    const sql = `
      INSERT INTO websites (
        domain, niche, status, monthly_revenue, domain_authority, 
        backlinks, organic_keywords, organic_traffic, top_keywords, 
        competitors, seo_last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      this.domain, this.niche, this.status, this.monthly_revenue,
      this.domain_authority, this.backlinks, this.organic_keywords,
      this.organic_traffic, topKeywords, competitors,
      seoLastUpdated, this.created_at, this.updated_at
    ];
    const result = await db.query(sql, params);
    this.id = result.insertId;
    return this;
  }

  async delete() {
    const sql = 'DELETE FROM websites WHERE id = ?';
    await db.query(sql, [this.id]);
    return true;
  }

  static async create(data) {
    const website = new Website(data);
    return await website.save();
  }

  async update(data) {
    for (const key of Object.keys(data)) {
      if (this.hasOwnProperty(key) && key !== 'id' && key !== 'created_at') {
        this[key] = data[key];
      }
    }
    return await this.save();
  }

  static async getStats(userId) {
    const [
      totalRevenue,
      activeWebsites,
      totalLeads,
      activeClients,
      totalPhones
    ] = await Promise.all([
      db.query('SELECT SUM(monthly_revenue) as total FROM websites WHERE status = "active" AND user_id = ?', [userId]),
      db.query('SELECT COUNT(*) as count FROM websites WHERE status = "active" AND user_id = ?', [userId]),
      db.query('SELECT COUNT(*) as count FROM leads WHERE user_id = ?', [userId]),
      db.query('SELECT COUNT(*) as count FROM clients WHERE user_id = ?', [userId]),
      db.query('SELECT COUNT(*) as count FROM phone_numbers WHERE status = "active" AND user_id = ?', [userId])
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      activeWebsites: activeWebsites[0]?.count || 0,
      totalLeads: totalLeads[0]?.count || 0,
      activeClients: activeClients[0]?.count || 0,
      totalPhones: totalPhones[0]?.count || 0
    };
  }
}

module.exports = Website;

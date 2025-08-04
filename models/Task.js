const db = require("../config/database");

class Task {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status || "todo";
    this.priority = data.priority || "medium";
    this.assignee = data.assignee;
    this.due_date = data.due_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.user_id = data.user_id;
  }

  static async findAll(filters = {}, userId) {
    let sql = `
      SELECT t.*
      FROM tasks t 
      WHERE t.user_id = ?
    `;
    const params = [userId];

    if (filters.status) {
      sql += " AND t.status = ?";
      params.push(filters.status);
    }

    if (filters.priority) {
      sql += " AND t.priority = ?";
      params.push(filters.priority);
    }

    if (filters.assignee) {
      sql += " AND t.assignee LIKE ?";
      params.push(`%${filters.assignee}%`);
    }

    if (filters.search) {
      sql += " AND (t.title LIKE ? OR t.description LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const allowedSorts = ["created_at", "due_date", "title", "priority", "status"];
    let sortBy = filters.sort_by;
    if (!allowedSorts.includes(sortBy)) sortBy = "created_at";

    let sortDir = filters.sort_dir?.toLowerCase();
    if (!["asc", "desc"].includes(sortDir)) sortDir = "desc";

    sql += ` ORDER BY t.\`${sortBy}\` ${sortDir}`;

    const results = await db.query(sql, params);
    return {
      data: results.map((row) => new Task(row)),
      pagination: null,
    };
  }

  static async findById(id, userId) {
    const sql = `
      SELECT t.*
      FROM tasks t 
      WHERE t.id = ? AND t.user_id = ?
    `;
    const results = await db.query(sql, [id, userId]);
    if (results.length) {
      return new Task(results[0]);
    }
    return null;
  }

  async save() {
    const now = new Date();

    if (this.id) {
      const existing = await db.query("SELECT id FROM tasks WHERE id = ?", [this.id]);
      if (existing.length > 0) {
        this.updated_at = now;
        const sql = `
          UPDATE tasks SET 
            title = ?, description = ?, status = ?, 
            priority = ?, assignee = ?, due_date = ?, updated_at = ?
          WHERE id = ?
        `;
        const params = [
          this.title || null, 
          this.description || null, 
          this.status || null, 
          this.priority || null, 
          this.assignee || null, 
          this.due_date || null, 
          this.updated_at, 
          this.id
        ];
        await db.query(sql, params);
        return this;
      }
    }

    this.created_at = now;
    this.updated_at = now;
    const sql = `
      INSERT INTO tasks (
        user_id, title, description, status, priority, 
        assignee, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      this.user_id, 
      this.title || null, 
      this.description || null, 
      this.status || null, 
      this.priority || null, 
      this.assignee || null, 
      this.due_date || null, 
      this.created_at, 
      this.updated_at
    ];
    const result = await db.query(sql, params);
    this.id = result.insertId;
    return this;
  }

  async delete() {
    const sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
    await db.query(sql, [this.id, this.user_id]);
    return true;
  }

  static async create(data) {
    const task = new Task(data);
    return await task.save();
  }

  async update(data) {
    for (const key of Object.keys(data)) {
      if (this.hasOwnProperty(key) && key !== "id" && key !== "created_at") {
        this[key] = data[key];
      }
    }
    return await this.save();
  }
}

module.exports = Task;

const mysql = require('mysql2/promise');
require('dotenv').config();

class SEOApiKeyService {
  constructor() {
    this.connection = null;
  }

  async getConnection() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
      });
    }
    return this.connection;
  }

  /**
   * Get the next available API key that hasn't exceeded 249 calls in the last 30 days
   * @returns {string} Available API key
   */
  async getAvailableApiKey() {
    try {
      const connection = await this.getConnection();
      
      // Get API keys that haven't exceeded 249 calls in the last 30 days
      // Order by ID first to use keys in sequence (1, 2, 3, etc.)
      const getAvailableKeySQL = `
        SELECT api_key, count, id
        FROM heatmap 
        WHERE date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND count < 249
        ORDER BY id ASC
        LIMIT 1
      `;
      
      const [rows] = await connection.execute(getAvailableKeySQL);
      
      if (rows.length > 0) {
        console.log(`✅ Using API key ID ${rows[0].id} with ${rows[0].count}/249 calls used`);
        return rows[0].api_key;
      }
      
      // If no keys available, check if we have any keys at all
      const getAllKeysSQL = 'SELECT COUNT(*) as total FROM heatmap';
      const [countRows] = await connection.execute(getAllKeysSQL);
      
      if (countRows[0].total === 0) {
        // No keys in database
        console.log('❌ No API keys found in database. Please add API keys using the addApiKey method.');
        return null;
      }
      
      // All keys are at limit, return null to indicate no keys available
      console.log('❌ All API keys have reached the 249 call limit');
      return null;
      
    } catch (error) {
      console.error('Error getting available API key:', error);
      return null;
    }
  }

  /**
   * Increment the usage count for an API key
   * @param {string} apiKey - The API key to increment
   * @param {number} callsMade - Number of API calls made (default: 1)
   */
  async incrementApiKeyUsage(apiKey, callsMade = 1) {
    try {
      const connection = await this.getConnection();
      
      // Check if key exists in the last 30 days
      const checkKeySQL = `
        SELECT id, count 
        FROM heatmap 
        WHERE api_key = ? 
        AND date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY id DESC
        LIMIT 1
      `;
      
      const [rows] = await connection.execute(checkKeySQL, [apiKey]);
      
      if (rows.length > 0) {
        // Key exists, increment count by the number of calls made
        const updateSQL = `
          UPDATE heatmap 
          SET count = count + ?, date_updated = NOW()
          WHERE id = ?
        `;
        await connection.execute(updateSQL, [callsMade, rows[0].id]);
        console.log(`📊 Incremented API key usage by ${callsMade} calls: ${rows[0].count + callsMade}/249 calls`);
      } else {
        // Key doesn't exist in last 30 days, create new record
        const insertSQL = `
          INSERT INTO heatmap (api_key, count) 
          VALUES (?, ?)
        `;
        await connection.execute(insertSQL, [apiKey, callsMade]);
        console.log(`📊 Created new API key record: ${callsMade}/249 calls`);
      }
      
    } catch (error) {
      console.error('Error incrementing API key usage:', error);
    }
  }

  /**
   * Add a new API key to the rotation
   * @param {string} apiKey - The API key to add
   */
  async addApiKey(apiKey) {
    try {
      const connection = await this.getConnection();
      
      // Check if key already exists
      const checkSQL = 'SELECT COUNT(*) as count FROM heatmap WHERE api_key = ?';
      const [rows] = await connection.execute(checkSQL, [apiKey]);
      
      if (rows[0].count === 0) {
        const insertSQL = 'INSERT INTO heatmap (api_key, count) VALUES (?, 0)';
        await connection.execute(insertSQL, [apiKey]);
        console.log(`✅ Added new API key to rotation`);
        return true;
      } else {
        console.log(`⚠️  API key already exists in rotation`);
        return false;
      }
      
    } catch (error) {
      console.error('Error adding API key:', error);
      return false;
    }
  }

  /**
   * Get usage statistics for all API keys
   * @returns {Array} Array of API key usage stats
   */
  async getUsageStats() {
    try {
      const connection = await this.getConnection();
      
      const statsSQL = `
        SELECT 
          api_key,
          count,
          date_created,
          date_updated,
          CASE 
            WHEN count >= 249 THEN 'LIMIT_REACHED'
            WHEN count >= 200 THEN 'HIGH_USAGE'
            WHEN count >= 100 THEN 'MEDIUM_USAGE'
            ELSE 'LOW_USAGE'
          END as status
        FROM heatmap 
        WHERE date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY count DESC
      `;
      
      const [rows] = await connection.execute(statsSQL);
      return rows;
      
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return [];
    }
  }

  /**
   * Clean up old records (older than 30 days)
   */
  async cleanupOldRecords() {
    try {
      const connection = await this.getConnection();
      
      const deleteSQL = `
        DELETE FROM heatmap 
        WHERE date_created < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `;
      
      const [result] = await connection.execute(deleteSQL);
      console.log(`🧹 Cleaned up ${result.affectedRows} old API key records`);
      
    } catch (error) {
      console.error('Error cleaning up old records:', error);
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

module.exports = new SEOApiKeyService();

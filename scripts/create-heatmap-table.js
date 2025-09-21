const mysql = require('mysql2/promise');
require('dotenv').config();

async function createHeatmapTable() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    console.log('Connected to MySQL database');

    // Create heatmap table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS heatmap (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL,
        count INT NOT NULL DEFAULT 0,
        date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_api_key (api_key),
        INDEX idx_date_created (date_created)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Heatmap table created successfully');

    // Check if any API keys exist
    const [keyCount] = await connection.execute('SELECT COUNT(*) as count FROM heatmap');
    
    if (keyCount[0].count === 0) {
      console.log('⚠️  No API keys found in heatmap table');
      console.log('💡 You can add API keys using the seoApiKeyService.addApiKey() method');
      console.log('💡 Or manually insert them: INSERT INTO heatmap (api_key, count) VALUES ("your_key_here", 0);');
    } else {
      console.log(`✅ Found ${keyCount[0].count} API key(s) in heatmap table`);
    }

    // Show current table structure
    const [tableInfo] = await connection.execute('DESCRIBE heatmap');
    console.log('\n📋 Heatmap table structure:');
    console.table(tableInfo);

    // Show current records
    const [records] = await connection.execute('SELECT * FROM heatmap');
    console.log('\n📊 Current heatmap records:');
    console.table(records);

  } catch (error) {
    console.error('❌ Error creating heatmap table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  createHeatmapTable();
}

module.exports = { createHeatmapTable };

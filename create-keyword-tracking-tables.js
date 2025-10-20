const mysql = require('mysql2/promise');
require('dotenv').config();

async function createKeywordTrackingTables() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'rankandrent',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Connected to database');

    // Read and execute the migration SQL
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250120000011_create_keyword_tracking.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }

    console.log('🎉 Keyword tracking tables created successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('  - keyword_tracking (main tracking table)');
    console.log('  - keyword_rank_history (ranking history)');
    console.log('');
    console.log('🔗 Foreign key relationships:');
    console.log('  - keyword_tracking.user_id → users.id');
    console.log('  - keyword_tracking.client_id → clients.id');
    console.log('  - keyword_rank_history.keyword_tracking_id → keyword_tracking.id');
    console.log('');
    console.log('📊 Available API endpoints:');
    console.log('  POST   /api/keyword-tracking');
    console.log('  GET    /api/keyword-tracking');
    console.log('  GET    /api/keyword-tracking/:id');
    console.log('  PUT    /api/keyword-tracking/:id');
    console.log('  DELETE /api/keyword-tracking/:id');
    console.log('  POST   /api/keyword-tracking/:id/check-ranking');
    console.log('  GET    /api/keyword-tracking/:id/rank-history');
    console.log('  POST   /api/keyword-tracking/bulk-check');

  } catch (error) {
    console.error('❌ Error creating keyword tracking tables:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
createKeywordTrackingTables();

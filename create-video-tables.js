// create-video-tables.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createVideoTables() {
  try {
    // Database connection using your existing config
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    console.log('📊 Connected to database:', process.env.DB_DATABASE);

    // SQL to create video_recordings table
    const createVideoRecordingsTable = `
      CREATE TABLE IF NOT EXISTS video_recordings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Untitled Recording',
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        duration INT NOT NULL COMMENT 'Duration in seconds',
        recording_type ENUM('screen', 'webcam', 'both') NOT NULL DEFAULT 'screen',
        thumbnail_path VARCHAR(500),
        shareable_id VARCHAR(12) UNIQUE NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_shareable_id (shareable_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_public (is_public),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // SQL to create video_views table
    const createVideoViewsTable = `
      CREATE TABLE IF NOT EXISTS video_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL,
        viewer_id VARCHAR(16) NOT NULL COMMENT 'Anonymous viewer identifier',
        viewer_email VARCHAR(255),
        viewer_ip VARCHAR(45),
        user_agent TEXT,
        watch_duration INT DEFAULT 0 COMMENT 'Duration watched in seconds',
        watch_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of video watched (0-100)',
        engagement_data JSON COMMENT 'Additional engagement metrics like pauses, rewinds, etc.',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_video_id (video_id),
        INDEX idx_viewer_id (viewer_id),
        INDEX idx_viewer_email (viewer_email),
        INDEX idx_created_at (created_at),
        INDEX idx_watch_percentage (watch_percentage),
        
        FOREIGN KEY (video_id) REFERENCES video_recordings(id) ON DELETE CASCADE
      )
    `;

    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_video_views_video_created ON video_views(video_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_video_views_watch_percentage ON video_views(video_id, watch_percentage);
      CREATE INDEX IF NOT EXISTS idx_video_recordings_user_created ON video_recordings(user_id, created_at);
    `;

    console.log('📹 Creating video_recordings table...');
    await connection.execute(createVideoRecordingsTable);
    console.log('✅ video_recordings table created');

    console.log('👁️ Creating video_views table...');
    await connection.execute(createVideoViewsTable);
    console.log('✅ video_views table created');

    console.log('🔍 Creating indexes...');
    const indexStatements = createIndexes.split(';').filter(stmt => stmt.trim());
    for (const statement of indexStatements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️ Index already exists, skipping...');
          } else {
            console.log('⚠️ Index creation warning:', error.message);
          }
        }
      }
    }
    console.log('✅ Indexes created');

    console.log('🎉 Video tables created successfully!');
    await connection.end();

  } catch (error) {
    console.error('❌ Failed to create video tables:', error.message);
    console.log('\n📋 Please check your .env file has these database settings:');
    console.log('- DB_HOST');
    console.log('- DB_PORT');
    console.log('- DB_USERNAME');
    console.log('- DB_PASSWORD');
    console.log('- DB_DATABASE');
  }
}

// Run the script
createVideoTables();

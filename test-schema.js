const db = require('./config/database');

async function testSchema() {
  console.log('🔍 Testing database schema...\n');

  try {
    // Test 1: Check current database
    console.log('1. Checking current database...');
    const [dbResult] = await db.query('SELECT DATABASE() as current_db');
    console.log('✅ Current database:', dbResult.current_db);

    // Test 2: Check if we can see the video_recordings table
    console.log('\n2. Checking for video_recordings table...');
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'video_recordings'
    `);
    
    if (tables.length > 0) {
      console.log('✅ video_recordings table exists in current database');
    } else {
      console.log('❌ video_recordings table does not exist in current database');
      
      // Check if it exists in railway schema
      console.log('\n3. Checking railway schema...');
      const [railwayTables] = await db.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'railway' 
        AND TABLE_NAME = 'video_recordings'
      `);
      
      if (railwayTables.length > 0) {
        console.log('✅ video_recordings table exists in railway schema');
        console.log('⚠️ Need to use railway.video_recordings in queries');
      } else {
        console.log('❌ video_recordings table does not exist in railway schema either');
      }
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  }
}

testSchema();

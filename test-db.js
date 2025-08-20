const db = require('./config/database');

async function testDatabase() {
  console.log('🔍 Testing database connection and tables...\n');

  try {
    // Test 1: Check if we can connect
    console.log('1. Testing database connection...');
    const [rows] = await db.query('SELECT 1 as test');
    console.log('✅ Database connection working:', rows[0]);

    // Test 2: Check if video_recordings table exists
    console.log('\n2. Checking video_recordings table...');
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'railway' 
      AND TABLE_NAME = 'video_recordings'
    `);
    
    if (tables.length > 0) {
      console.log('✅ video_recordings table exists');
    } else {
      console.log('❌ video_recordings table does not exist');
      return;
    }

    // Test 3: Check table structure
    console.log('\n3. Checking table structure...');
    const [columns] = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'railway' 
      AND TABLE_NAME = 'video_recordings'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test 4: Test a simple query
    console.log('\n4. Testing simple query...');
    const [recordings] = await db.query(`
      SELECT COUNT(*) as count 
      FROM railway.video_recordings 
      WHERE user_id = 1
    `);
    console.log('✅ Simple query working, count:', recordings[0].count);

    // Test 5: Test the complex query that's failing
    console.log('\n5. Testing complex query...');
    const [complexResult] = await db.query(`
      SELECT vr.*, 
             COUNT(vv.id) as view_count,
             COUNT(DISTINCT vv.viewer_id) as unique_viewers
      FROM railway.video_recordings vr
      LEFT JOIN railway.video_views vv ON vr.id = vv.video_id
      WHERE vr.user_id = 1
      GROUP BY vr.id
      ORDER BY vr.created_at DESC
      LIMIT 10 OFFSET 0
    `);
    console.log('✅ Complex query working, results:', complexResult.length);

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('Error Code:', error.errno);
  }
}

testDatabase();

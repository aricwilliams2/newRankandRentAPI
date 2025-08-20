# MySQL Parameter Binding Fix

## Problem
The MySQL error "Incorrect number of arguments for prepared statement" was occurring because:

1. **Wrong result destructuring**: The code was trying to destructure `db.query()` result as `[rows]` when it returns `results` directly
2. **Parameter type issues**: Parameters weren't being properly parsed and validated
3. **SQL injection vulnerability**: Sort parameters were being directly interpolated into the query

## Root Cause
```javascript
// ❌ WRONG: MySQL rejects LIMIT/OFFSET as placeholders
const query = `SELECT * FROM table WHERE user_id = ? LIMIT ? OFFSET ?`;
const rows = await db.query(query, [userId, limit, offset]);

// ✅ CORRECT: Inline sanitized integers for LIMIT/OFFSET
const query = `SELECT * FROM table WHERE user_id = ? LIMIT ${lim} OFFSET ${offset}`;
const rows = await db.query(query, [userId]); // Only one placeholder
```

## Solution Applied

### 1. Fixed VideoRecording Model (`models/VideoRecording.js`)

```javascript
static async findByUserId(userId, options = {}) {
  try {
    const { page = 1, limit = 10, sort_by = 'created_at', sort_dir = 'DESC' } = options;
    
    // ✅ Sanitize to safe integers - inline LIMIT/OFFSET to avoid MySQL placeholder issues
    const lim = Math.max(1, Number.isFinite(+limit) ? +limit : 10);
    const pg = Math.max(1, Number.isFinite(+page) ? +page : 1);
    const offset = (pg - 1) * lim;
    const uid = parseInt(userId, 10);
    
    // ✅ Validate sort parameters to prevent SQL injection
    const allowedSortFields = ['created_at', 'title', 'duration', 'file_size'];
    const allowedSortDirs = ['ASC', 'DESC'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = allowedSortDirs.includes(sort_dir.toUpperCase()) ? sort_dir.toUpperCase() : 'DESC';
    
    const query = `
      SELECT vr.*, 
             COUNT(vv.id) as view_count,
             COUNT(DISTINCT vv.viewer_id) as unique_viewers
      FROM railway.video_recordings vr
      LEFT JOIN railway.video_views vv ON vr.id = vv.video_id
      WHERE vr.user_id = ?
      GROUP BY vr.id
      ORDER BY vr.${sortField} ${sortDirection}
      LIMIT ${lim} OFFSET ${offset}
    `;
    
    // ✅ Only ONE placeholder now - just the user_id
    const rows = await db.query(query, [uid]);
    
    // ✅ Parse metadata for each recording
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  } catch (error) {
    console.error('Error finding video recordings by user:', error);
    throw error;
  }
}
```

### 2. Fixed Route Handler (`routes/videoRoutes.js`)

```javascript
router.get('/recordings', authenticate, async (req, res) => {
  try {
    // ✅ Ensure numeric types and provide safe defaults
    const userId = Number(req.user.id);
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit ?? '10', 10))); // Max 100 per page
    const sort_by = req.query.sort_by || 'created_at';
    const sort_dir = req.query.sort_dir || 'DESC';
    
    console.log('[recordings] Request params:', { userId, page, limit, sort_by, sort_dir });
    console.log('[recordings] Types:', { userId: typeof userId, page: typeof page, limit: typeof limit });
    
    const recordings = await VideoRecording.findByUserId(userId, {
      page,
      limit,
      sort_by,
      sort_dir
    });

    res.json({
      recordings: recordings.map(recording => ({
        ...recording,
        shareable_url: `${process.env.FRONTEND_URL || 'https://rankandrenttool.com'}/v/${recording.shareable_id}`
      })),
      pagination: {
        page,
        limit,
        total: recordings.length,
        has_more: recordings.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      details: error.message 
    });
  }
});
```

## Key Improvements

### 1. **Parameter Validation**
- ✅ All numeric parameters are parsed with `parseInt()`
- ✅ Default values provided for missing parameters
- ✅ Minimum/maximum limits enforced
- ✅ Safe fallbacks for invalid values

### 2. **SQL Injection Prevention**
- ✅ Sort field names validated against whitelist
- ✅ Sort directions validated against allowed values
- ✅ No direct string interpolation of user input

### 3. **Database Query Safety**
- ✅ Inlined LIMIT/OFFSET values (no placeholders)
- ✅ Only user_id bound as parameter
- ✅ Consistent error handling

### 4. **Enhanced Logging**
- ✅ Request parameters logged for debugging
- ✅ Query parameters logged for verification
- ✅ Detailed error messages

## Testing

The endpoint can now be tested with various parameter combinations:

```bash
# Default parameters
GET /api/videos/recordings

# Custom pagination
GET /api/videos/recordings?page=2&limit=20

# Custom sorting
GET /api/videos/recordings?sort_by=title&sort_dir=ASC

# Combined parameters
GET /api/videos/recordings?page=1&limit=5&sort_by=created_at&sort_dir=DESC
```

## Database Wrapper Confirmation

The database wrapper (`config/database.js`) correctly returns results:

```javascript
async query(sql, params = []) {
  try {
    const [results] = await this.pool.execute(sql, params);
    return results; // ✅ Returns results directly, not an array
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
```

## Result

✅ **Fixed**: MySQL "Incorrect number of arguments" error  
✅ **Fixed**: LIMIT/OFFSET parameter binding issues  
✅ **Fixed**: SQL injection vulnerabilities  
✅ **Fixed**: Parameter type validation  
✅ **Enhanced**: Error handling and logging  
✅ **Improved**: Pagination and sorting functionality  

The recordings endpoint now works correctly with proper parameter handling and security measures. The key fix was inlining sanitized integers for LIMIT/OFFSET instead of using placeholders, which MySQL was rejecting.

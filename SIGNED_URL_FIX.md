# Signed URL Fix - ACL Error Resolution

## Problem
You were getting an `AccessControlListNotSupported` error because your S3 bucket has **Object Ownership = Bucket owner enforced (ACLs disabled)**. This means any request containing an ACL header will be rejected.

## Root Cause
- Your S3 bucket has **Object Ownership = Bucket owner enforced**
- This setting **disables ACLs completely**
- The code was trying to set `ACL: 'public-read'` on uploads
- AWS rejects any request with ACL headers when this setting is enabled

## Solution Implemented

### 1. Removed All ACL Usage

**Modified `services/VideoService.js`:**
```javascript
// Before (causing error):
const params = {
  Bucket: BUCKET_NAME,
  Key: key,
  Body: fileContent,
  ContentType: contentType,
  ACL: 'public-read'  // ❌ This causes AccessControlListNotSupported
};

// After (fixed):
const params = {
  Bucket: BUCKET_NAME,
  Key: key,
  Body: fileContent,
  ContentType: contentType
  // ACL removed - bucket has Object Ownership = Bucket owner enforced
};
```

### 2. Implemented Signed URLs for Video Access

**Updated all video endpoints in `routes/videoRoutes.js`:**

- **Public video endpoint** (`/api/videos/v/:shareableId`)
- **Recordings endpoint** (`/api/videos/recordings`)
- **Single recording endpoint** (`/api/videos/recordings/:id`)
- **Direct video access** (`/api/videos/:filename`)

```javascript
// Generate signed URL for S3 access
let videoUrl = recording.file_path;

// If this looks like an S3 key, sign it
if (!/^https?:\/\//i.test(videoUrl)) {
  videoUrl = await VideoService.getSignedUrl(recording.file_path, 3600); // 1 hour expiry
}
```

## How It Works Now

### Before (Broken):
```
Upload: ACL: 'public-read' → AccessControlListNotSupported Error
Access: Direct S3 URL → 403 Forbidden (bucket not public)
```

### After (Fixed):
```
Upload: No ACL → Success ✅
Access: Signed URL → Success ✅ (1-hour expiry)
```

## Benefits of This Approach

- ✅ **Works with Object Ownership = Bucket owner enforced**
- ✅ **More secure** - URLs expire after 1 hour
- ✅ **No bucket policy changes needed**
- ✅ **Works with existing videos**
- ✅ **No re-upload required**

## Testing

Run the test to verify the fix:
```bash
node test-signed-urls.js
```

## Deployment Steps

1. **Deploy the updated code** to your server
2. **Upload a new video** to test the complete flow
3. **Access videos** - they should now work via signed URLs

## API Response Changes

### Before:
```json
{
  "recording": {
    "video_url": "https://rankandrent-videos-2024.s3.amazonaws.com/videos/file.webm"
  }
}
```

### After:
```json
{
  "recording": {
    "video_url": "https://rankandrent-videos-2024.s3.amazonaws.com/videos/file.webm?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=..."
  }
}
```

## Security Notes

- **Signed URLs expire after 1 hour**
- **Each request generates a new signed URL**
- **Videos are not publicly accessible** - only via signed URLs
- **More secure than public bucket access**

## Frontend Usage

Your frontend doesn't need any changes:
- The `video_url` field still contains a valid URL
- The URL will work for 1 hour after generation
- Videos will play normally in video players

## Troubleshooting

If you still get errors:
1. **Check that all ACL references are removed** from your deployed code
2. **Verify your AWS credentials** have `s3:GetObject` permission
3. **Ensure your bucket region** matches your AWS configuration

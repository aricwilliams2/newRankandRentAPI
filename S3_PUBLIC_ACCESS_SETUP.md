# S3 Public Access Setup Guide

## Problem
You're getting a 403 Forbidden error when accessing S3 URLs directly. This means your S3 bucket doesn't allow public read access.

## Solution Options

### Option 1: Make S3 Bucket Public (Recommended for Video Sharing)

#### Step 1: Update S3 Bucket Policy
Go to your AWS S3 Console → Your Bucket → Permissions → Bucket Policy

Add this bucket policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::rankandrent-videos-2024/*"
        }
    ]
}
```

#### Step 2: Disable Block Public Access
Go to your S3 Bucket → Permissions → Block public access (bucket settings)
- Uncheck "Block all public access"
- Save changes

#### Step 3: Update VideoService to Set Public ACL
Modify your `services/VideoService.js` to set public read access on upload:

```javascript
// In the uploadToS3 method, add ACL: 'public-read'
const params = {
  Bucket: BUCKET_NAME,
  Key: key,
  Body: fileContent,
  ContentType: contentType,
  ACL: 'public-read'  // Add this line
};
```

### Option 2: Use Signed URLs (More Secure)

If you prefer not to make the bucket public, we can modify the code to generate signed URLs instead.

#### Update VideoService.js
```javascript
// In the uploadToS3 method, remove ACL: 'public-read'
const params = {
  Bucket: BUCKET_NAME,
  Key: key,
  Body: fileContent,
  ContentType: contentType
  // Remove ACL line
};
```

#### Update VideoRoutes.js to use signed URLs
```javascript
// Convert file_path to signed S3 URL
const videoUrl = await VideoService.getSignedUrl(recording.file_path, 3600); // 1 hour expiry
```

## Recommended Approach

For a video sharing platform, **Option 1 (Public Access)** is recommended because:
- ✅ Faster video loading (no URL generation overhead)
- ✅ Better caching (browsers can cache public URLs)
- ✅ Works with CDNs
- ✅ Simpler implementation

## Security Considerations

If you choose public access:
- Only upload videos to this bucket
- Use separate buckets for sensitive data
- Consider implementing access controls at the application level
- Monitor bucket access logs

## Testing

After implementing either option, test with:
```bash
node test-video-url-fix.js
```

The S3 URLs should now be accessible without 403 errors.

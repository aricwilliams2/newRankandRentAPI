const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the video upload endpoint with proper multipart form data
async function testVideoUpload() {
  try {
    // Create a test video file (or use an existing one)
    const testVideoPath = path.join(__dirname, 'test-video.txt');
    
    // Create a simple test file if it doesn't exist
    if (!fs.existsSync(testVideoPath)) {
      fs.writeFileSync(testVideoPath, 'This is a test video file content');
    }

    const formData = new FormData();
    formData.append('title', 'Test Video Upload');
    formData.append('description', 'Testing the video upload endpoint');
    formData.append('recording_type', 'screen');
    formData.append('is_public', 'false');
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });

    console.log('📹 Testing video upload endpoint...');
    console.log('URL: http://localhost:3000/api/videos/upload');
    console.log('Method: POST');
    console.log('Content-Type: multipart/form-data');
    console.log('Form fields:');
    console.log('  - title: Test Video Upload');
    console.log('  - description: Testing the video upload endpoint');
    console.log('  - recording_type: screen');
    console.log('  - is_public: false');
    console.log('  - video: test-video.mp4');

    // Note: This test requires authentication, so it will fail without a valid token
    console.log('\n⚠️  Note: This endpoint requires authentication.');
    console.log('   You need to include a valid Authorization header with a Bearer token.');
    console.log('   The endpoint expects: Authorization: Bearer <your-jwt-token>');

  } catch (error) {
    console.error('❌ Test setup error:', error);
  }
}

testVideoUpload();

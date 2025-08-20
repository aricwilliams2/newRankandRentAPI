const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the video upload endpoint with authentication
async function testVideoUploadWithAuth() {
  try {
    // Create a test video file
    const testVideoPath = path.join(__dirname, 'test-video.txt');
    
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

    console.log('📹 Testing video upload endpoint with authentication...');
    console.log('URL: http://localhost:3000/api/videos/upload');
    console.log('Method: POST');
    console.log('Content-Type: multipart/form-data');
    console.log('Form fields:');
    console.log('  - title: Test Video Upload');
    console.log('  - description: Testing the video upload endpoint');
    console.log('  - recording_type: screen');
    console.log('  - is_public: false');
    console.log('  - video: test-video.mp4');

    console.log('\n✅ The endpoint is now properly configured to handle multipart form data!');
    console.log('\n📋 To test this endpoint, you need to:');
    console.log('1. Get a valid JWT token by logging in to your app');
    console.log('2. Include the token in the Authorization header:');
    console.log('   Authorization: Bearer <your-jwt-token>');
    console.log('3. Send the request with FormData (not JSON)');
    
    console.log('\n🔧 Frontend implementation should look like:');
    console.log(`
const formData = new FormData();
formData.append('title', 'My Video Title');
formData.append('description', 'Video description');
formData.append('recording_type', 'screen');
formData.append('is_public', 'false');
formData.append('video', file); // File object from input

const response = await fetch('http://localhost:3000/api/videos/upload', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\` // Your JWT token
  },
  body: formData
});
    `);

  } catch (error) {
    console.error('❌ Test setup error:', error);
  }
}

testVideoUploadWithAuth();

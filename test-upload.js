const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

async function testUpload() {
  console.log('🧪 Testing video upload with multipart form data...\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Create test file
    console.log('\n2. Creating test file...');
    const testVideoPath = path.join(__dirname, 'test-video.txt');
    fs.writeFileSync(testVideoPath, 'This is a test video file for upload testing');
    console.log('✅ Test file created');

    // Step 3: Test upload with FormData
    console.log('\n3. Testing upload...');
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test-video.webm',
      contentType: 'video/webm'
    });
    formData.append('title', 'Test Video Upload');
    formData.append('description', 'Testing multipart form data upload');
    formData.append('is_public', 'true');
    formData.append('recording_type', 'screen');

    const uploadResponse = await axios.post(`${API_BASE}/videos/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('✅ Upload successful!');
    console.log('Response:', uploadResponse.data);

    // Clean up
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testUpload();

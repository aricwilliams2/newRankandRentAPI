const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testEndpoints() {
  console.log('🧪 Testing video endpoints...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    const testResponse = await axios.get(`${API_BASE}/test`);
    console.log('✅ Server is running:', testResponse.data.message);

    // Test 2: Test login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('✅ Login successful');
    const token = loginResponse.data.token;

    // Test 3: Test video recordings endpoint
    console.log('\n3. Testing video recordings endpoint...');
    try {
      const recordingsResponse = await axios.get(`${API_BASE}/videos/recordings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Video recordings endpoint working');
      console.log('Recordings:', recordingsResponse.data);
    } catch (error) {
      console.log('❌ Video recordings endpoint failed:', error.response?.data?.error || error.message);
    }

    // Test 4: Test video upload endpoint (without file)
    console.log('\n4. Testing video upload endpoint...');
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      const path = require('path');

      // Create a simple test file
      const testFile = path.join(__dirname, 'test.txt');
      fs.writeFileSync(testFile, 'test content');

      const formData = new FormData();
      formData.append('video', fs.createReadStream(testFile), {
        filename: 'test.webm',
        contentType: 'video/webm'
      });
      formData.append('title', 'Test Video');
      formData.append('description', 'Test description');
      formData.append('is_public', 'false');
      formData.append('recording_type', 'screen');

      const uploadResponse = await axios.post(`${API_BASE}/videos/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      });
      console.log('✅ Video upload endpoint working');
      console.log('Upload response:', uploadResponse.data);

      // Clean up
      fs.unlinkSync(testFile);
    } catch (error) {
      console.log('❌ Video upload endpoint failed:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();

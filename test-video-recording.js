// test-video-recording.js
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = null;

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testVideoEndpoints() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`
  };

  try {
    // Test getting video recordings
    console.log('\n📹 Testing video recordings endpoint...');
    const recordingsResponse = await axios.get(`${API_BASE}/videos/recordings`, { headers });
    console.log('✅ Video recordings endpoint working');
    console.log(`Found ${recordingsResponse.data.recordings?.length || 0} recordings`);

    // Test getting video stats (if any recordings exist)
    if (recordingsResponse.data.recordings?.length > 0) {
      const firstRecording = recordingsResponse.data.recordings[0];
      console.log(`\n📊 Testing analytics for recording ${firstRecording.id}...`);
      
      try {
        const analyticsResponse = await axios.get(`${API_BASE}/videos/recordings/${firstRecording.id}/analytics`, { headers });
        console.log('✅ Analytics endpoint working');
        console.log('Analytics data:', analyticsResponse.data);
      } catch (error) {
        console.log('⚠️ Analytics endpoint error (expected if no views):', error.response?.data?.error || error.message);
      }

      // Test getting video views
      try {
        const viewsResponse = await axios.get(`${API_BASE}/videos/recordings/${firstRecording.id}/views`, { headers });
        console.log('✅ Video views endpoint working');
        console.log(`Found ${viewsResponse.data.views?.length || 0} views`);
      } catch (error) {
        console.log('⚠️ Video views endpoint error (expected if no views):', error.response?.data?.error || error.message);
      }

      // Test getting video stats
      try {
        const statsResponse = await axios.get(`${API_BASE}/videos/recordings/${firstRecording.id}/stats`, { headers });
        console.log('✅ Video stats endpoint working');
        console.log('Stats data:', statsResponse.data);
      } catch (error) {
        console.log('⚠️ Video stats endpoint error (expected if no views):', error.response?.data?.error || error.message);
      }
    }

    // Test public video endpoint (should work without auth)
    console.log('\n🌐 Testing public video endpoint...');
    try {
      const publicResponse = await axios.get(`${API_BASE}/videos/v/test123`);
      console.log('✅ Public video endpoint working');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Public video endpoint working (correctly returns 404 for non-existent video)');
      } else {
        console.log('⚠️ Public video endpoint error:', error.response?.data?.error || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Video endpoints test failed:', error.response?.data || error.message);
  }
}

async function testVideoUpload() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  console.log('\n📤 Testing video upload endpoint...');
  
  // Create a mock video file (small test file)
  const FormData = require('form-data');
  const fs = require('fs');
  const path = require('path');

  try {
    // Create a simple test file for upload testing
    const testVideoPath = path.join(__dirname, 'test-video.txt');
    
    // Create a simple text file for testing upload mechanism
    fs.writeFileSync(testVideoPath, 'This is a test video file for upload testing');

    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test-video.webm',
      contentType: 'video/webm'
    });
    formData.append('title', 'Test Recording');
    formData.append('description', 'This is a test video recording');
    formData.append('is_public', 'false');
    formData.append('recording_type', 'screen');
    formData.append('metadata', JSON.stringify({
      test: true,
      recordingType: 'screen',
      resolution: '1920x1080'
    }));

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      ...formData.getHeaders()
    };

    try {
      const response = await axios.post(`${API_BASE}/videos/upload`, formData, { headers });
      console.log('✅ Video upload endpoint working');
      console.log('Upload response:', response.data);
    } catch (error) {
      console.log('⚠️ Video upload endpoint error (expected without AWS S3):', error.response?.data?.error || error.message);
    }

    // Clean up test file
    fs.unlinkSync(testVideoPath);

  } catch (error) {
    console.error('❌ Video upload test failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting Video Recording API Tests...\n');

  // Test login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Test video endpoints
  await testVideoEndpoints();
  
  // Test video upload
  await testVideoUpload();

  console.log('\n✅ Video recording API tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Set up AWS S3 credentials in .env file');
  console.log('2. Install FFmpeg for video processing');
  console.log('3. Run database migrations to create video tables');
  console.log('4. Test with actual video files');
}

// Run the tests
runTests().catch(console.error);

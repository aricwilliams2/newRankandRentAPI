const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';

async function testAllVideoEndpoints() {
  console.log('🧪 Testing all video endpoints...\n');
  let token = null;
  let uploadedVideoId = null;

  try {
    // Step 1: Login
    console.log('1. 🔐 Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Test video upload
    console.log('\n2. 📤 Testing video upload...');
    const testVideoPath = path.join(__dirname, 'test-video.txt');
    fs.writeFileSync(testVideoPath, 'This is a test video file for upload testing');

    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test-video.webm',
      contentType: 'video/webm'
    });
    formData.append('title', 'Comprehensive Test Video');
    formData.append('description', 'Testing all video endpoints');
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

    uploadedVideoId = uploadResponse.data.recording.id;
    console.log('✅ Upload successful - Video ID:', uploadedVideoId);

    // Step 3: Test get recordings list
    console.log('\n3. 📋 Testing get recordings list...');
    const recordingsResponse = await axios.get(`${API_BASE}/videos/recordings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Recordings list retrieved - Count:', recordingsResponse.data.recordings.length);

    // Step 4: Test get single recording
    console.log('\n4. 📹 Testing get single recording...');
    const singleRecordingResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Single recording retrieved - Title:', singleRecordingResponse.data.recording.title);

    // Step 5: Test get video analytics
    console.log('\n5. 📊 Testing get video analytics...');
    const analyticsResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Analytics retrieved - Views:', analyticsResponse.data.analytics.total_views);

    // Step 6: Test get video views
    console.log('\n6. 👥 Testing get video views...');
    const viewsResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}/views`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Views retrieved - Count:', viewsResponse.data.views.length);

    // Step 7: Test get video stats
    console.log('\n7. 📈 Testing get video stats...');
    const statsResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Stats retrieved - Total views:', statsResponse.data.stats.total_views);

    // Step 8: Test get engagement heatmap
    console.log('\n8. 🔥 Testing get engagement heatmap...');
    const heatmapResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}/heatmap`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Heatmap retrieved - Data points:', heatmapResponse.data.heatmap.length);

    // Step 9: Test get top viewers
    console.log('\n9. 🏆 Testing get top viewers...');
    const topViewersResponse = await axios.get(`${API_BASE}/videos/recordings/${uploadedVideoId}/top-viewers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Top viewers retrieved - Count:', topViewersResponse.data.top_viewers.length);

    // Step 10: Test update recording
    console.log('\n10. ✏️ Testing update recording...');
    const updateResponse = await axios.put(`${API_BASE}/videos/recordings/${uploadedVideoId}`, {
      title: 'Updated Test Video Title',
      description: 'Updated description for testing'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Recording updated successfully');

    // Clean up
    fs.unlinkSync(testVideoPath);
    console.log('\n✅ Test file cleaned up');

    console.log('\n🎉 All video endpoints tested successfully!');
    console.log('📊 Summary:');
    console.log('   - Upload: ✅');
    console.log('   - List recordings: ✅');
    console.log('   - Get single recording: ✅');
    console.log('   - Analytics: ✅');
    console.log('   - Views: ✅');
    console.log('   - Stats: ✅');
    console.log('   - Heatmap: ✅');
    console.log('   - Top viewers: ✅');
    console.log('   - Update recording: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testAllVideoEndpoints();

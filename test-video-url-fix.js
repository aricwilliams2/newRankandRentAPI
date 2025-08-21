const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testVideoUrlFix() {
  console.log('🧪 Testing Video URL Fix...\n');

  try {
    // Test 1: Get recordings to see if video_url is now a full S3 URL
    console.log('1️⃣ Testing recordings endpoint...');
    const recordingsResponse = await axios.get(`${API_BASE}/api/videos/recordings`);
    
    if (recordingsResponse.data.recordings && recordingsResponse.data.recordings.length > 0) {
      const firstRecording = recordingsResponse.data.recordings[0];
      console.log('✅ Recordings endpoint working');
      console.log('   - video_url:', firstRecording.video_url);
      console.log('   - Is S3 URL:', firstRecording.video_url.startsWith('https://'));
      console.log('   - Shareable URL:', firstRecording.shareable_url);
    } else {
      console.log('⚠️ No recordings found');
    }

    // Test 2: Test public video endpoint
    console.log('\n2️⃣ Testing public video endpoint...');
    if (recordingsResponse.data.recordings && recordingsResponse.data.recordings.length > 0) {
      const firstRecording = recordingsResponse.data.recordings[0];
      const publicResponse = await axios.get(`${API_BASE}/api/videos/v/${firstRecording.shareable_id}`);
      
      console.log('✅ Public video endpoint working');
      console.log('   - video_url:', publicResponse.data.recording.video_url);
      console.log('   - Is S3 URL:', publicResponse.data.recording.video_url.startsWith('https://'));
    }

    // Test 3: Test direct video access (should redirect to S3)
    console.log('\n3️⃣ Testing direct video access...');
    if (recordingsResponse.data.recordings && recordingsResponse.data.recordings.length > 0) {
      const firstRecording = recordingsResponse.data.recordings[0];
      const filename = firstRecording.file_path.split('/').pop(); // Get just the filename
      
      try {
        const directResponse = await axios.get(`${API_BASE}/videos/${filename}`, {
          maxRedirects: 0, // Don't follow redirects
          validateStatus: (status) => status === 302 // Expect redirect
        });
        console.log('✅ Direct video access working (redirects to S3)');
        console.log('   - Redirect location:', directResponse.headers.location);
      } catch (redirectError) {
        if (redirectError.response && redirectError.response.status === 302) {
          console.log('✅ Direct video access working (redirects to S3)');
          console.log('   - Redirect location:', redirectError.response.headers.location);
        } else {
          console.log('❌ Direct video access failed:', redirectError.message);
        }
      }
    }

    console.log('\n🎉 Video URL fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testVideoUrlFix();

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// You'll need to get a valid token from your login endpoint
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_jwt_token_here';

async function testS3Access() {
  console.log('🔍 Testing S3 Access...\n');

  try {
    // Test 1: Get a video recording to get the S3 URL
    console.log('1️⃣ Getting video recording...');
    const recordingsResponse = await axios.get(`${API_BASE}/api/videos/recordings`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (recordingsResponse.data.recordings && recordingsResponse.data.recordings.length > 0) {
      const firstRecording = recordingsResponse.data.recordings[0];
      const s3Url = firstRecording.video_url;
      
      console.log('✅ Found video recording');
      console.log('   - S3 URL:', s3Url);
      console.log('   - File path:', firstRecording.file_path);
      
      // Test 2: Try to access the S3 URL directly
      console.log('\n2️⃣ Testing direct S3 access...');
      try {
        const s3Response = await axios.get(s3Url, {
          timeout: 10000,
          validateStatus: (status) => status < 500 // Accept any status < 500
        });
        
        if (s3Response.status === 200) {
          console.log('✅ S3 access successful!');
          console.log('   - Content-Type:', s3Response.headers['content-type']);
          console.log('   - Content-Length:', s3Response.headers['content-length']);
        } else {
          console.log('⚠️ S3 access returned status:', s3Response.status);
          console.log('   - Response:', s3Response.data);
        }
      } catch (s3Error) {
        console.log('❌ S3 access failed');
        console.log('   - Status:', s3Error.response?.status);
        console.log('   - Error:', s3Error.response?.data || s3Error.message);
        
        if (s3Error.response?.status === 403) {
          console.log('\n🔧 403 Forbidden - S3 bucket needs public access configuration');
          console.log('   Follow the steps in S3_PUBLIC_ACCESS_SETUP.md');
        }
      }
      
      // Test 3: Test the redirect route
      console.log('\n3️⃣ Testing redirect route...');
      const filename = firstRecording.file_path.split('/').pop();
      try {
        const redirectResponse = await axios.get(`${API_BASE}/videos/${filename}`, {
          maxRedirects: 0,
          validateStatus: (status) => status === 302
        });
        
        console.log('✅ Redirect route working');
        console.log('   - Redirect location:', redirectResponse.headers.location);
      } catch (redirectError) {
        console.log('❌ Redirect route failed:', redirectError.message);
      }
      
    } else {
      console.log('⚠️ No recordings found');
    }

    console.log('\n🎉 S3 access test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testS3Access();

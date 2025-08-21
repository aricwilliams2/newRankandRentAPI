const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testS3PublicAccess() {
  console.log('🔍 Testing S3 Public Access...\n');

  try {
    // Test 1: Try to access a known public video (you'll need to replace with a real shareable ID)
    console.log('1️⃣ Testing public video endpoint...');
    
    // You'll need to replace this with a real shareable ID from your database
    const shareableId = 'yFzvO4kv5lwF'; // Replace with actual shareable ID
    
    try {
      const publicResponse = await axios.get(`${API_BASE}/api/videos/v/${shareableId}`);
      
      console.log('✅ Public video endpoint working');
      console.log('   - Video URL:', publicResponse.data.recording.video_url);
      console.log('   - Is S3 URL:', publicResponse.data.recording.video_url.startsWith('https://'));
      
      // Test 2: Try to access the S3 URL directly
      console.log('\n2️⃣ Testing direct S3 access...');
      const s3Url = publicResponse.data.recording.video_url;
      
      try {
        const s3Response = await axios.get(s3Url, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });
        
        if (s3Response.status === 200) {
          console.log('✅ S3 access successful!');
          console.log('   - Content-Type:', s3Response.headers['content-type']);
          console.log('   - Content-Length:', s3Response.headers['content-length']);
        } else {
          console.log('⚠️ S3 access returned status:', s3Response.status);
        }
      } catch (s3Error) {
        console.log('❌ S3 access failed');
        console.log('   - Status:', s3Error.response?.status);
        console.log('   - Error:', s3Error.response?.data || s3Error.message);
        
        if (s3Error.response?.status === 403) {
          console.log('\n🔧 403 Forbidden - S3 bucket needs public access configuration');
          console.log('   Follow the steps in S3_PUBLIC_ACCESS_SETUP.md');
          console.log('\n📋 Quick fix steps:');
          console.log('   1. Go to AWS S3 Console → rankandrent-videos-2024 bucket');
          console.log('   2. Permissions → Block public access → Uncheck "Block all public access"');
          console.log('   3. Permissions → Bucket policy → Add the policy from S3_PUBLIC_ACCESS_SETUP.md');
          console.log('   4. Upload a new video to test (existing videos need to be re-uploaded with public ACL)');
        }
      }
      
    } catch (publicError) {
      console.log('❌ Public video endpoint failed');
      console.log('   - Status:', publicError.response?.status);
      console.log('   - Error:', publicError.response?.data || publicError.message);
      
      if (publicError.response?.status === 404) {
        console.log('\n💡 Tip: Replace the shareableId in this test with a real one from your database');
        console.log('   You can find shareable IDs by checking your video_recordings table');
      }
    }

    console.log('\n🎉 S3 public access test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testS3PublicAccess();

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function debugTest() {
  console.log('🔍 Debug testing video endpoints...\n');

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
      console.log('❌ Video recordings endpoint failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Message:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugTest();

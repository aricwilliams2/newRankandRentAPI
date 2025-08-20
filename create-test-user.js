// create-test-user.js
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    const response = await axios.post(`${API_BASE}/auth/register`, testUser);
    console.log('✅ Test user created successfully');
    console.log('User ID:', response.data.user.id);
    console.log('Email:', response.data.user.email);
    console.log('Token:', response.data.token);
    return true;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Test user already exists');
      return true;
    } else {
      console.error('❌ Failed to create test user:', error.response?.data || error.message);
      return false;
    }
  }
}

// Run the script
createTestUser().catch(console.error);

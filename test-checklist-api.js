const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testClientId = 1; // You'll need to replace this with an actual client ID from your database

// Test data
const testChecklistItemId = 'gmb-1'; // GMB Basic Audit Checklist Completed

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com', // Replace with actual test user email
      password: 'password123'     // Replace with actual test user password
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetClientChecklist() {
  try {
    const response = await axios.get(`${BASE_URL}/checklist/client/${testClientId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get client checklist successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get client checklist failed:', error.response?.data || error.message);
  }
}

async function testToggleChecklistItem() {
  try {
    const response = await axios.put(`${BASE_URL}/checklist/client/${testClientId}/item/${testChecklistItemId}/toggle`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Toggle checklist item successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Toggle checklist item failed:', error.response?.data || error.message);
  }
}

async function testMarkAsCompleted() {
  try {
    const response = await axios.put(`${BASE_URL}/checklist/client/${testClientId}/item/${testChecklistItemId}/complete`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Mark as completed successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Mark as completed failed:', error.response?.data || error.message);
  }
}

async function testMarkAsIncomplete() {
  try {
    const response = await axios.put(`${BASE_URL}/checklist/client/${testClientId}/item/${testChecklistItemId}/incomplete`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Mark as incomplete successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Mark as incomplete failed:', error.response?.data || error.message);
  }
}

async function testGetCompletionStats() {
  try {
    const response = await axios.get(`${BASE_URL}/checklist/client/${testClientId}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get completion stats successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get completion stats failed:', error.response?.data || error.message);
  }
}

async function testGetCompletedItems() {
  try {
    const response = await axios.get(`${BASE_URL}/checklist/client/${testClientId}/completed`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get completed items successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get completed items failed:', error.response?.data || error.message);
  }
}

async function testGetIncompleteItems() {
  try {
    const response = await axios.get(`${BASE_URL}/checklist/client/${testClientId}/incomplete`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get incomplete items successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get incomplete items failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Starting checklist API tests...\n');
  
  try {
    // Login first
    await login();
    
    // Test getting initial checklist state
    console.log('\n📋 Testing get client checklist...');
    await testGetClientChecklist();
    
    // Test marking item as completed
    console.log('\n✅ Testing mark as completed...');
    await testMarkAsCompleted();
    
    // Test getting completion stats
    console.log('\n📊 Testing get completion stats...');
    await testGetCompletionStats();
    
    // Test getting completed items
    console.log('\n✅ Testing get completed items...');
    await testGetCompletedItems();
    
    // Test getting incomplete items
    console.log('\n❌ Testing get incomplete items...');
    await testGetIncompleteItems();
    
    // Test marking item as incomplete
    console.log('\n❌ Testing mark as incomplete...');
    await testMarkAsIncomplete();
    
    // Test toggle functionality
    console.log('\n🔄 Testing toggle functionality...');
    await testToggleChecklistItem();
    await testToggleChecklistItem(); // Toggle back
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  login,
  testGetClientChecklist,
  testToggleChecklistItem,
  testMarkAsCompleted,
  testMarkAsIncomplete,
  testGetCompletionStats,
  testGetCompletedItems,
  testGetIncompleteItems
};

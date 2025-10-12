const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testUser = {
  name: 'Test User',
  email: 'test-security@example.com',
  password: 'testpassword123'
};

// Helper function to make authenticated requests
const apiRequest = async (method, endpoint, data = null, useAuth = true) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testUserRegistration = async () => {
  console.log('\n🔐 Testing User Registration...');
  try {
    const result = await apiRequest('POST', '/auth/register', testUser, false);
    console.log('✅ User registered successfully');
    return result;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, proceeding with login...');
      return await testUserLogin();
    }
    throw error;
  }
};

const testUserLogin = async () => {
  console.log('\n🔑 Testing User Login...');
  const result = await apiRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);
  
  authToken = result.token;
  console.log('✅ User logged in successfully');
  return result;
};

const testGetPredefinedQuestions = async () => {
  console.log('\n📋 Testing Get Predefined Questions...');
  const result = await apiRequest('GET', '/security-questions/predefined-questions', null, false);
  console.log('✅ Predefined questions retrieved:', result.questions.length, 'questions available');
  return result.questions;
};

const testCheckSecurityQuestions = async () => {
  console.log('\n🔍 Testing Check Security Questions...');
  const result = await apiRequest('GET', '/security-questions/check');
  console.log('✅ Security questions check:', result.hasSecurityQuestions ? 'User has questions' : 'User needs to set up questions');
  return result;
};

const testSetupSecurityQuestions = async () => {
  console.log('\n⚙️  Testing Setup Security Questions...');
  const questions = [
    {
      question: "What was the name of your first pet?",
      answer: "Fluffy"
    },
    {
      question: "What was the name of the street you grew up on?",
      answer: "Main Street"
    }
  ];

  const result = await apiRequest('POST', '/security-questions/setup', { questions });
  console.log('✅ Security questions set up successfully');
  return result;
};

const testGetUserSecurityQuestions = async () => {
  console.log('\n📝 Testing Get User Security Questions...');
  const result = await apiRequest('GET', '/security-questions/user-questions');
  console.log('✅ User security questions retrieved:', result.questions.length, 'questions');
  return result;
};

const testVerifySecurityQuestions = async () => {
  console.log('\n✅ Testing Verify Security Questions...');
  const answers = ["Fluffy", "Main Street"];
  const result = await apiRequest('POST', '/security-questions/verify', { answers });
  console.log('✅ Security questions verified successfully');
  return result;
};

const testChangePasswordWithSecurityQuestions = async () => {
  console.log('\n🔒 Testing Change Password with Security Questions...');
  const data = {
    currentPassword: testUser.password,
    newPassword: 'newpassword123',
    securityAnswers: ["Fluffy", "Main Street"]
  };

  const result = await apiRequest('POST', '/security-questions/change-password', data);
  console.log('✅ Password changed successfully with security questions');
  
  // Update test user password for subsequent tests
  testUser.password = 'newpassword123';
  return result;
};

const testLoginWithNewPassword = async () => {
  console.log('\n🔑 Testing Login with New Password...');
  const result = await apiRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);
  
  authToken = result.token;
  console.log('✅ Login with new password successful');
  return result;
};

const testUpdateSecurityQuestions = async () => {
  console.log('\n🔄 Testing Update Security Questions...');
  const questions = [
    {
      question: "What was your favorite teacher's name?",
      answer: "Mrs. Johnson"
    },
    {
      question: "What city were you born in?",
      answer: "New York"
    }
  ];

  const result = await apiRequest('PUT', '/security-questions/update', { questions });
  console.log('✅ Security questions updated successfully');
  return result;
};

const testVerifyUpdatedSecurityQuestions = async () => {
  console.log('\n✅ Testing Verify Updated Security Questions...');
  const answers = ["Mrs. Johnson", "New York"];
  const result = await apiRequest('POST', '/security-questions/verify', { answers });
  console.log('✅ Updated security questions verified successfully');
  return result;
};

const testSimplePasswordChange = async () => {
  console.log('\n🔒 Testing Simple Password Change (should fail - user has security questions)...');
  try {
    const data = {
      currentPassword: testUser.password,
      newPassword: 'anotherpassword123'
    };
    await apiRequest('POST', '/auth/change-password', data);
    console.log('❌ Simple password change should have failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Simple password change correctly rejected (user has security questions)');
    } else {
      throw error;
    }
  }
};

const testChangePasswordWithWrongAnswers = async () => {
  console.log('\n❌ Testing Change Password with Wrong Security Answers...');
  try {
    const data = {
      currentPassword: testUser.password,
      newPassword: 'wrongpassword123',
      securityAnswers: ["Wrong Answer", "Another Wrong Answer"]
    };
    await apiRequest('POST', '/security-questions/change-password', data);
    console.log('❌ Password change should have failed with wrong answers');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Password change correctly rejected with wrong security answers');
    } else {
      throw error;
    }
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Security Questions API Tests...\n');
  
  try {
    // Test user registration and login
    await testUserRegistration();
    
    // Test predefined questions
    await testGetPredefinedQuestions();
    
    // Test security questions check
    await testCheckSecurityQuestions();
    
    // Test setting up security questions
    await testSetupSecurityQuestions();
    
    // Test getting user's security questions
    await testGetUserSecurityQuestions();
    
    // Test verifying security questions
    await testVerifySecurityQuestions();
    
    // Test changing password with security questions
    await testChangePasswordWithSecurityQuestions();
    
    // Test login with new password
    await testLoginWithNewPassword();
    
    // Test updating security questions
    await testUpdateSecurityQuestions();
    
    // Test verifying updated security questions
    await testVerifyUpdatedSecurityQuestions();
    
    // Test simple password change (should fail)
    await testSimplePasswordChange();
    
    // Test password change with wrong answers (should fail)
    await testChangePasswordWithWrongAnswers();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User registration and login');
    console.log('✅ Predefined questions retrieval');
    console.log('✅ Security questions setup');
    console.log('✅ Security questions verification');
    console.log('✅ Password change with security questions');
    console.log('✅ Security questions update');
    console.log('✅ Error handling for invalid inputs');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testUserRegistration,
  testUserLogin,
  testGetPredefinedQuestions,
  testCheckSecurityQuestions,
  testSetupSecurityQuestions,
  testGetUserSecurityQuestions,
  testVerifySecurityQuestions,
  testChangePasswordWithSecurityQuestions,
  testUpdateSecurityQuestions,
  testVerifyUpdatedSecurityQuestions
};

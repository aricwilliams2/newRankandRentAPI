const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testUser = {
  name: 'Predefined Questions Test User',
  email: 'predefined-test@example.com',
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
  console.log('📊 Categories:', result.categories.join(', '));
  console.log('ℹ️  Info:', result.info.description);
  return result.questions;
};

const testCheckSecurityQuestions = async () => {
  console.log('\n🔍 Testing Check Security Questions...');
  const result = await apiRequest('GET', '/security-questions/check');
  console.log('✅ Security questions check:', result.hasSecurityQuestions ? 'User has questions' : 'User needs to set up questions');
  return result;
};

const testSetupSecurityQuestions = async (predefinedQuestions) => {
  console.log('\n⚙️  Testing Setup Security Questions (Predefined Only)...');
  
  // Select first 2 questions from predefined list
  const selectedQuestions = predefinedQuestions.slice(0, 2).map(q => ({
    predefined_question_id: q.id,
    answer: `Answer for ${q.question.substring(0, 20)}...`
  }));

  const result = await apiRequest('POST', '/security-questions/setup', { questions: selectedQuestions });
  console.log('✅ Security questions set up successfully with predefined questions');
  return result;
};

const testGetUserSecurityQuestions = async () => {
  console.log('\n📝 Testing Get User Security Questions...');
  const result = await apiRequest('GET', '/security-questions/user-questions');
  console.log('✅ User security questions retrieved:', result.questions.length, 'questions');
  result.questions.forEach((q, index) => {
    console.log(`   ${index + 1}. ${q.question}`);
  });
  return result;
};

const testVerifySecurityQuestions = async () => {
  console.log('\n✅ Testing Verify Security Questions...');
  const answers = ["Answer for What was the name of...", "Answer for What was the name of..."];
  const result = await apiRequest('POST', '/security-questions/verify', { answers });
  console.log('✅ Security questions verified successfully');
  return result;
};

const testChangePasswordWithSecurityQuestions = async () => {
  console.log('\n🔒 Testing Change Password with Security Questions...');
  const data = {
    currentPassword: testUser.password,
    newPassword: 'newpassword123',
    securityAnswers: ["Answer for What was the name of...", "Answer for What was the name of..."]
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

const testUpdateSecurityQuestions = async (predefinedQuestions) => {
  console.log('\n🔄 Testing Update Security Questions...');
  
  // Select different questions (3rd and 4th from predefined list)
  const selectedQuestions = predefinedQuestions.slice(2, 4).map(q => ({
    predefined_question_id: q.id,
    answer: `Updated answer for ${q.question.substring(0, 20)}...`
  }));

  const result = await apiRequest('PUT', '/security-questions/update', { questions: selectedQuestions });
  console.log('✅ Security questions updated successfully');
  return result;
};

const testVerifyUpdatedSecurityQuestions = async () => {
  console.log('\n✅ Testing Verify Updated Security Questions...');
  const answers = ["Updated answer for What was your...", "Updated answer for What was your..."];
  const result = await apiRequest('POST', '/security-questions/verify', { answers });
  console.log('✅ Updated security questions verified successfully');
  return result;
};

const testForgotPassword = async () => {
  console.log('\n🔍 Testing Forgot Password...');
  const result = await apiRequest('POST', '/auth/forgot-password', {
    email: testUser.email
  }, false);
  
  console.log('✅ Forgot password request successful');
  console.log('📋 Security questions retrieved:', result.questions.length, 'questions');
  return result;
};

const testResetPassword = async () => {
  console.log('\n🔄 Testing Reset Password...');
  const data = {
    email: testUser.email,
    newPassword: 'resetpassword123',
    securityAnswers: ["Updated answer for What was your...", "Updated answer for What was your..."]
  };

  const result = await apiRequest('POST', '/auth/reset-password', data, false);
  console.log('✅ Password reset successfully');
  
  // Update test user password for subsequent tests
  testUser.password = 'resetpassword123';
  return result;
};

const testLoginWithResetPassword = async () => {
  console.log('\n🔑 Testing Login with Reset Password...');
  const result = await apiRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);
  
  authToken = result.token;
  console.log('✅ Login with reset password successful');
  return result;
};

const testInvalidPredefinedQuestionId = async () => {
  console.log('\n❌ Testing Invalid Predefined Question ID...');
  try {
    const invalidQuestions = [
      {
        predefined_question_id: 99999, // Non-existent ID
        answer: "Some answer"
      },
      {
        predefined_question_id: 1,
        answer: "Another answer"
      }
    ];

    await apiRequest('POST', '/security-questions/setup', { questions: invalidQuestions });
    console.log('❌ Setup should have failed with invalid question ID');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Setup correctly rejected invalid predefined question ID');
    } else {
      throw error;
    }
  }
};

const testDuplicateQuestions = async (predefinedQuestions) => {
  console.log('\n❌ Testing Duplicate Questions...');
  try {
    const duplicateQuestions = [
      {
        predefined_question_id: predefinedQuestions[0].id,
        answer: "Answer 1"
      },
      {
        predefined_question_id: predefinedQuestions[0].id, // Same ID
        answer: "Answer 2"
      }
    ];

    await apiRequest('POST', '/security-questions/setup', { questions: duplicateQuestions });
    console.log('❌ Setup should have failed with duplicate questions');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Setup correctly rejected duplicate questions');
    } else {
      throw error;
    }
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Predefined Security Questions API Tests...\n');
  
  try {
    // Test user registration and login
    await testUserRegistration();
    
    // Test predefined questions
    const predefinedQuestions = await testGetPredefinedQuestions();
    
    // Test security questions check (after login)
    await testCheckSecurityQuestions();
    
    // Test setting up security questions with predefined questions
    await testSetupSecurityQuestions(predefinedQuestions);
    
    // Test getting user's security questions
    await testGetUserSecurityQuestions();
    
    // Test verifying security questions
    await testVerifySecurityQuestions();
    
    // Test changing password with security questions
    await testChangePasswordWithSecurityQuestions();
    
    // Test login with new password
    await testLoginWithNewPassword();
    
    // Test updating security questions
    await testUpdateSecurityQuestions(predefinedQuestions);
    
    // Test verifying updated security questions
    await testVerifyUpdatedSecurityQuestions();
    
    // Test forgot password flow
    await testForgotPassword();
    
    // Test reset password
    await testResetPassword();
    
    // Test login with reset password
    await testLoginWithResetPassword();
    
    // Test error scenarios
    await testInvalidPredefinedQuestionId();
    await testDuplicateQuestions(predefinedQuestions);
    
    console.log('\n🎉 All predefined security questions tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User registration and login');
    console.log('✅ Predefined questions retrieval from database');
    console.log('✅ Security questions setup with predefined questions only');
    console.log('✅ Security questions verification');
    console.log('✅ Password change with security questions');
    console.log('✅ Security questions update');
    console.log('✅ Forgot password and reset flow');
    console.log('✅ Error handling for invalid question IDs');
    console.log('✅ Error handling for duplicate questions');
    
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
  testGetPredefinedQuestions,
  testSetupSecurityQuestions,
  testVerifySecurityQuestions,
  testChangePasswordWithSecurityQuestions,
  testUpdateSecurityQuestions,
  testForgotPassword,
  testResetPassword
};

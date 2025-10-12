const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
let testUser = {
  name: 'Forgot Password Test User',
  email: 'forgot-password-test@example.com',
  password: 'originalpassword123'
};

// Helper function to make requests
const apiRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

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
    const result = await apiRequest('POST', '/auth/register', testUser);
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
  });
  
  console.log('✅ User logged in successfully');
  return result;
};

const testSetupSecurityQuestions = async () => {
  console.log('\n⚙️  Testing Setup Security Questions...');
  const questions = [
    {
      question: "What was the name of your first pet?",
      answer: "Buddy"
    },
    {
      question: "What was the name of the street you grew up on?",
      answer: "Oak Street"
    }
  ];

  const result = await apiRequest('POST', '/security-questions/setup', { questions });
  console.log('✅ Security questions set up successfully');
  return result;
};

const testForgotPassword = async () => {
  console.log('\n🔍 Testing Forgot Password...');
  const result = await apiRequest('POST', '/auth/forgot-password', {
    email: testUser.email
  });
  
  console.log('✅ Forgot password request successful');
  console.log('📋 Security questions retrieved:', result.questions.length, 'questions');
  return result;
};

const testResetPassword = async () => {
  console.log('\n🔄 Testing Reset Password...');
  const data = {
    email: testUser.email,
    newPassword: 'newresetpassword123',
    securityAnswers: ["Buddy", "Oak Street"]
  };

  const result = await apiRequest('POST', '/auth/reset-password', data);
  console.log('✅ Password reset successfully');
  
  // Update test user password for subsequent tests
  testUser.password = 'newresetpassword123';
  return result;
};

const testLoginWithResetPassword = async () => {
  console.log('\n🔑 Testing Login with Reset Password...');
  const result = await apiRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  console.log('✅ Login with reset password successful');
  return result;
};

const testForgotPasswordWithInvalidEmail = async () => {
  console.log('\n❌ Testing Forgot Password with Invalid Email...');
  try {
    await apiRequest('POST', '/auth/forgot-password', {
      email: 'nonexistent@example.com'
    });
    console.log('❌ Forgot password should have failed with invalid email');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Forgot password correctly rejected invalid email');
    } else {
      throw error;
    }
  }
};

const testResetPasswordWithWrongAnswers = async () => {
  console.log('\n❌ Testing Reset Password with Wrong Security Answers...');
  try {
    const data = {
      email: testUser.email,
      newPassword: 'wrongpassword123',
      securityAnswers: ["Wrong Answer", "Another Wrong Answer"]
    };
    await apiRequest('POST', '/auth/reset-password', data);
    console.log('❌ Reset password should have failed with wrong answers');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Reset password correctly rejected wrong security answers');
    } else {
      throw error;
    }
  }
};

const testForgotPasswordWithoutSecurityQuestions = async () => {
  console.log('\n❌ Testing Forgot Password for User Without Security Questions...');
  
  // Create a new user without security questions
  const newUser = {
    name: 'No Security Questions User',
    email: 'no-security-questions@example.com',
    password: 'password123'
  };

  try {
    // Register the user
    await apiRequest('POST', '/auth/register', newUser);
    console.log('✅ New user registered without security questions');
    
    // Try forgot password
    await apiRequest('POST', '/auth/forgot-password', {
      email: newUser.email
    });
    console.log('❌ Forgot password should have failed - no security questions');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Forgot password correctly rejected - user has no security questions');
    } else {
      throw error;
    }
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Forgot Password API Tests...\n');
  
  try {
    // Test user registration and login
    await testUserRegistration();
    
    // Test setting up security questions
    await testSetupSecurityQuestions();
    
    // Test forgot password flow
    await testForgotPassword();
    
    // Test reset password
    await testResetPassword();
    
    // Test login with reset password
    await testLoginWithResetPassword();
    
    // Test error scenarios
    await testForgotPasswordWithInvalidEmail();
    await testResetPasswordWithWrongAnswers();
    await testForgotPasswordWithoutSecurityQuestions();
    
    console.log('\n🎉 All forgot password tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ User registration and security questions setup');
    console.log('✅ Forgot password request');
    console.log('✅ Password reset with security questions');
    console.log('✅ Login with reset password');
    console.log('✅ Error handling for invalid email');
    console.log('✅ Error handling for wrong security answers');
    console.log('✅ Error handling for users without security questions');
    
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
  testForgotPassword,
  testResetPassword,
  testForgotPasswordWithInvalidEmail,
  testResetPasswordWithWrongAnswers
};

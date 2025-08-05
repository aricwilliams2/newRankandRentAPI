const client = require('./config/twilioClient');

// Test Twilio client connection
async function testTwilioConnection() {
  try {
    console.log('🔍 Testing Twilio connection...');
    
    // Test account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio connection successful!');
    console.log(`📞 Account: ${account.friendlyName}`);
    console.log(`💰 Balance: ${account.balance} ${account.currency}`);
    
    // Test available numbers
    console.log('\n🔍 Testing available numbers...');
    const availableNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({ limit: 5 });
    
    console.log(`✅ Found ${availableNumbers.length} available numbers`);
    if (availableNumbers.length > 0) {
      console.log('📱 Sample numbers:');
      availableNumbers.slice(0, 3).forEach((number, index) => {
        console.log(`   ${index + 1}. ${number.phoneNumber} (${number.locality}, ${number.region})`);
      });
    }
    
    // Test recordings
    console.log('\n🔍 Testing recordings...');
    const recordings = await client.recordings.list({ limit: 5 });
    console.log(`✅ Found ${recordings.length} recordings`);
    
    console.log('\n🎉 All Twilio tests passed!');
    
  } catch (error) {
    console.error('❌ Twilio test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    console.log('2. Verify your Twilio account has sufficient credits');
    console.log('3. Ensure your account is not in trial mode restrictions');
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('🔍 Testing environment variables...');
  
  const requiredVars = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'TWILIO_APP_SID',
    'SERVER_URL'
  ];
  
  const missing = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✅ ${varName}: ${varName.includes('TOKEN') ? '***' : process.env[varName]}`);
    }
  });
  
  if (missing.length > 0) {
    console.log(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.log('Please add these to your .env file');
    return false;
  }
  
  console.log('✅ All environment variables are set!');
  return true;
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Twilio Integration Tests\n');
  
  if (!testEnvironmentVariables()) {
    process.exit(1);
  }
  
  await testTwilioConnection();
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runTests().catch(console.error);
}

module.exports = { testTwilioConnection, testEnvironmentVariables }; 
/**
 * Test script for multi-user calling platform
 * Run this after setting up the database and starting your server
 */

const axios = require('axios');

// Configuration - Update these values
const API_BASE = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = 'your-jwt-token-here'; // Get from login

// Test data
const testData = {
  areaCode: '415',
  country: 'US',
  testPhoneNumber: '+1234567890' // Number to call for testing
};

class MultiUserCallingTest {
  constructor() {
    this.headers = {
      'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  async log(message) {
    console.log(`🧪 ${message}`);
  }

  async error(message, err) {
    console.error(`❌ ${message}:`, err.response?.data || err.message);
  }

  async success(message, data) {
    console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  // Test 1: Search for available numbers
  async testSearchNumbers() {
    try {
      await this.log('Testing available number search...');
      
             const response = await axios.get(`${API_BASE}/api/twilio/available-numbers`, {
        headers: this.headers,
        params: {
          areaCode: testData.areaCode,
          country: testData.country,
          limit: 5
        }
      });

      await this.success('Available numbers found', {
        count: response.data.availableNumbers.length,
        firstNumber: response.data.availableNumbers[0]?.phoneNumber
      });

      return response.data.availableNumbers;
    } catch (err) {
      await this.error('Failed to search numbers', err);
      return null;
    }
  }

  // Test 2: Buy a phone number
  async testBuyNumber() {
    try {
      await this.log('Testing phone number purchase...');
      
      const response = await axios.post(`${API_BASE}/api/twilio/buy-number`, {
        areaCode: testData.areaCode,
        country: testData.country
      }, { headers: this.headers });

      await this.success('Phone number purchased', {
        phoneNumber: response.data.phoneNumber,
        locality: response.data.locality,
        price: response.data.price
      });

      return response.data;
    } catch (err) {
      await this.error('Failed to buy number', err);
      return null;
    }
  }

  // Test 3: Get user's numbers
  async testGetMyNumbers() {
    try {
      await this.log('Testing get my numbers...');
      
      const response = await axios.get(`${API_BASE}/api/twilio/my-numbers`, {
        headers: this.headers
      });

      await this.success('Retrieved user numbers', {
        totalNumbers: response.data.phoneNumbers.length,
        stats: response.data.stats
      });

      return response.data.phoneNumbers;
    } catch (err) {
      await this.error('Failed to get numbers', err);
      return null;
    }
  }

  // Test 4: Make a call using purchased number
  async testMakeCall(fromNumber) {
    try {
      await this.log(`Testing call from ${fromNumber}...`);
      
      const response = await axios.post(`${API_BASE}/api/twilio/call`, {
        to: testData.testPhoneNumber,
        from: fromNumber,
        record: true
      }, { headers: this.headers });

      await this.success('Call initiated', {
        callSid: response.data.callSid,
        status: response.data.status,
        from: response.data.from,
        to: response.data.to
      });

      return response.data;
    } catch (err) {
      await this.error('Failed to make call', err);
      return null;
    }
  }

  // Test 5: Get call logs
  async testGetCallLogs() {
    try {
      await this.log('Testing call logs retrieval...');
      
      const response = await axios.get(`${API_BASE}/api/twilio/call-logs`, {
        headers: this.headers,
        params: { limit: 5 }
      });

      await this.success('Call logs retrieved', {
        totalCalls: response.data.callLogs.length,
        pagination: response.data.pagination
      });

      return response.data.callLogs;
    } catch (err) {
      await this.error('Failed to get call logs', err);
      return null;
    }
  }

  // Test 6: Update phone number settings
  async testUpdateNumber(numberId) {
    try {
      await this.log(`Testing number update for ID ${numberId}...`);
      
      const response = await axios.put(`${API_BASE}/api/twilio/my-numbers/${numberId}`, {
        friendly_name: 'Test Business Line',
        is_active: true
      }, { headers: this.headers });

      await this.success('Phone number updated', response.data);
      return true;
    } catch (err) {
      await this.error('Failed to update number', err);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('\n🚀 Starting Multi-User Calling Platform Tests\n');

    // Test 1: Search available numbers
    const availableNumbers = await this.testSearchNumbers();
    if (!availableNumbers) return;

    // Test 2: Buy a number
    const purchasedNumber = await this.testBuyNumber();
    if (!purchasedNumber) return;

    // Wait a moment for purchase to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Get user's numbers
    const userNumbers = await this.testGetMyNumbers();
    if (!userNumbers || userNumbers.length === 0) return;

    // Test 4: Update number settings
    const firstNumber = userNumbers[0];
    await this.testUpdateNumber(firstNumber.id);

    // Test 5: Make a call (only if test phone number is provided)
    if (testData.testPhoneNumber && testData.testPhoneNumber !== '+1234567890') {
      await this.testMakeCall(firstNumber.phone_number);
      
      // Wait for call to be logged
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test 6: Get call logs
      await this.testGetCallLogs();
    } else {
      await this.log('Skipping call test - update testPhoneNumber in script');
    }

    console.log('\n✨ Multi-User Calling Platform Tests Complete!\n');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  if (!TEST_USER_TOKEN || TEST_USER_TOKEN === 'your-jwt-token-here') {
    console.error('❌ Please set TEST_USER_TOKEN in the script');
    console.log('💡 Get a token by logging in and copying the JWT from the response');
    process.exit(1);
  }

  const tester = new MultiUserCallingTest();
  tester.runAllTests().catch(console.error);
}

module.exports = MultiUserCallingTest;
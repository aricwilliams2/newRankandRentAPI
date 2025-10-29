#!/usr/bin/env node

// Test script to verify whisper endpoints are working
// Run with: node test-whisper-endpoints.js

const https = require('https');
const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'https://newrankandrentapi.onrender.com';

console.log('🧪 Testing Whisper Endpoints');
console.log('============================');
console.log(`Server: ${SERVER_URL}`);
console.log('');

// Test 1: TwiML endpoint
console.log('1️⃣ Testing TwiML endpoint...');
testEndpoint('POST', '/api/twilio/twiml', {
  'Content-Type': 'application/x-www-form-urlencoded'
}, 'Direction=inbound&Called=%2B1234567890&Caller=%2B1987654321&CallSid=test-123')
  .then(response => {
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
    if (response.statusCode === 200 && response.body.includes('<Response>')) {
      console.log('   ✅ TwiML endpoint working');
    } else {
      console.log('   ❌ TwiML endpoint failed');
    }
  })
  .catch(err => {
    console.log(`   ❌ TwiML endpoint error: ${err.message}`);
  })
  .then(() => {
    // Test 2: Whisper endpoint
    console.log('\n2️⃣ Testing Whisper endpoint...');
    return testEndpoint('GET', '/api/twilio/whisper?pn=%2B1234567890&from=%2B1987654321');
  })
  .then(response => {
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body.substring(0, 200)}...`);
    if (response.statusCode === 200 && response.body.includes('<Response>')) {
      console.log('   ✅ Whisper endpoint working');
    } else {
      console.log('   ❌ Whisper endpoint failed');
    }
  })
  .catch(err => {
    console.log(`   ❌ Whisper endpoint error: ${err.message}`);
  })
  .then(() => {
    console.log('\n🎯 Test Summary');
    console.log('===============');
    console.log('If both endpoints return 200 OK with <Response> XML, your whisper should work!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy these changes to production');
    console.log('2. Test with a real call to your Twilio number');
    console.log('3. Check server logs for webhook activity');
    console.log('4. Verify whisper plays before call connects');
  });

function testEndpoint(method, path, headers = {}, body = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

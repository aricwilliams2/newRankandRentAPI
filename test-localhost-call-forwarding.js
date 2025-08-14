const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testLocalhostCallForwarding() {
    try {
        console.log('🧪 Testing Call Forwarding on Localhost...\n');

        // Test 1: Check if server is running
        console.log('1. Checking if server is running...');
        try {
            const healthResponse = await axios.get(`${API_BASE}/api/endpoints`);
            console.log('✅ Server is running on localhost:3000');
        } catch (error) {
            console.log('❌ Server is not running on localhost:3000');
            console.log('   Please start your server with: npm start');
            return;
        }

        // Test 2: Get user's phone numbers
        console.log('\n2. Getting user phone numbers...');
        try {
            const phoneResponse = await axios.get(`${API_BASE}/api/twilio/my-numbers`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            
            const phoneNumbers = phoneResponse.data.phoneNumbers || [];
            console.log(`✅ Found ${phoneNumbers.length} phone numbers`);
            
            if (phoneNumbers.length === 0) {
                console.log('❌ No phone numbers found. Please purchase a phone number first.');
                return;
            }

            // Test 3: Get call forwarding settings
            console.log('\n3. Getting call forwarding settings...');
            const forwardingResponse = await axios.get(`${API_BASE}/api/call-forwarding`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            
            const existingForwarding = forwardingResponse.data.data || [];
            console.log(`✅ Found ${existingForwarding.length} forwarding settings`);

            // Test 4: Test TwiML endpoint locally
            console.log('\n4. Testing TwiML endpoint locally...');
            const testPhoneNumber = phoneNumbers[0];
            const forwardingForNumber = existingForwarding.find(f => f.phone_number_id === testPhoneNumber.id);
            
            if (forwardingForNumber) {
                console.log('✅ Call forwarding is configured, testing TwiML...');
                
                try {
                    const twimlResponse = await axios.post(`${API_BASE}/api/twilio/twiml`, {
                        Direction: 'inbound',
                        Called: testPhoneNumber.phone_number,
                        Caller: '+1234567890',
                        CallSid: 'test-call-sid-123'
                    }, {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                    
                    console.log('✅ TwiML endpoint responded successfully!');
                    console.log('📋 TwiML Response:');
                    console.log(twimlResponse.data);
                    
                    // Check if it contains forwarding logic
                    if (twimlResponse.data.includes('dial') && twimlResponse.data.includes('number')) {
                        console.log('✅ TwiML contains proper dial instructions for forwarding');
                    } else {
                        console.log('⚠️ TwiML response may not contain forwarding instructions');
                    }
                    
                } catch (twimlError) {
                    console.log('❌ TwiML endpoint test failed:');
                    console.log('Error:', twimlError.response?.data || twimlError.message);
                }
            } else {
                console.log('⚠️ No call forwarding configured for this number');
                console.log('   Set up call forwarding first, then test again');
            }

            // Test 5: Localhost limitations
            console.log('\n5. Localhost Limitations:');
            console.log('⚠️ IMPORTANT: Call forwarding will NOT work on localhost because:');
            console.log('   - Twilio cannot reach http://localhost:3000');
            console.log('   - Calls will hang up immediately');
            console.log('   - You need a public URL for Twilio to reach your server');

            // Test 6: Solutions
            console.log('\n6. Solutions for Testing:');
            console.log('🔧 Option 1: Use ngrok (Recommended)');
            console.log('   - Install: npm install -g ngrok');
            console.log('   - Run: ngrok http 3000');
            console.log('   - Update SERVER_URL with ngrok URL');
            console.log('   - Update phone number configurations');
            
            console.log('\n🔧 Option 2: Test on Production');
            console.log('   - Deploy your changes to production');
            console.log('   - Test call forwarding on the live server');
            
            console.log('\n🔧 Option 3: Manual TwiML Testing');
            console.log('   - Test TwiML endpoint directly (as shown above)');
            console.log('   - Verify the XML response is correct');

        } catch (error) {
            console.log('❌ Error accessing API:');
            console.log('Error:', error.response?.data?.error || error.message);
            console.log('\n💡 Make sure:');
            console.log('   - Your server is running (npm start)');
            console.log('   - You have a valid auth token');
            console.log('   - Your database is connected');
        }

        console.log('\n🎉 Localhost testing completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testLocalhostCallForwarding();

const axios = require('axios');

const API_BASE = 'https://newrankandrentapi.onrender.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testCallForwardingConfig() {
    try {
        console.log('🔍 Testing Call Forwarding Configuration...\n');

        // Test 1: Get user's phone numbers
        console.log('1. Getting user phone numbers...');
        const phoneResponse = await axios.get(`${API_BASE}/api/twilio/my-numbers`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        const phoneNumbers = phoneResponse.data.phoneNumbers || [];
        console.log(`✅ Found ${phoneNumbers.length} phone numbers`);
        
        // Find the specific phone number from the logs
        const targetNumber = '+19106019073';
        const targetPhone = phoneNumbers.find(p => p.phone_number === targetNumber);
        
        if (!targetPhone) {
            console.log(`❌ Phone number ${targetNumber} not found in your account`);
            return;
        }
        
        console.log(`✅ Found target phone number: ${targetPhone.phone_number} (ID: ${targetPhone.id})`);

        // Test 2: Get call forwarding settings
        console.log('\n2. Getting call forwarding settings...');
        const forwardingResponse = await axios.get(`${API_BASE}/api/call-forwarding`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        const existingForwarding = forwardingResponse.data.data || [];
        console.log(`✅ Found ${existingForwarding.length} forwarding settings`);

        // Find forwarding for this specific number
        const forwardingForNumber = existingForwarding.find(f => f.phone_number_id === targetPhone.id);
        
        if (forwardingForNumber) {
            console.log('\n✅ Call forwarding is configured:');
            console.log(`   - Phone Number: ${targetPhone.phone_number}`);
            console.log(`   - Forwards to: ${forwardingForNumber.forward_to_number}`);
            console.log(`   - Type: ${forwardingForNumber.forwarding_type}`);
            console.log(`   - Active: ${forwardingForNumber.is_active}`);
            console.log(`   - Timeout: ${forwardingForNumber.ring_timeout}s`);
            
            // Test 3: Test TwiML endpoint with this specific number
            console.log('\n3. Testing TwiML endpoint...');
            try {
                const twimlResponse = await axios.post(`${API_BASE}/api/twilio/twiml`, {
                    Direction: 'inbound',
                    Called: targetPhone.phone_number,
                    Caller: '+19102508758',
                    CallSid: 'test-call-sid-123'
                }, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                
                console.log('✅ TwiML endpoint responded successfully!');
                console.log('📋 TwiML Response:');
                console.log(twimlResponse.data);
                
                // Check if it contains the correct forwarding number
                if (twimlResponse.data.includes(forwardingForNumber.forward_to_number)) {
                    console.log(`✅ TwiML correctly dials: ${forwardingForNumber.forward_to_number}`);
                } else {
                    console.log(`❌ TwiML does NOT dial: ${forwardingForNumber.forward_to_number}`);
                    console.log('   This explains why calls are not forwarding correctly!');
                }
                
            } catch (twimlError) {
                console.log('❌ TwiML endpoint test failed:');
                console.log('Error:', twimlError.response?.data || twimlError.message);
            }
            
        } else {
            console.log('\n❌ No call forwarding configured for this number!');
            console.log(`   Phone number: ${targetPhone.phone_number}`);
            console.log(`   Phone number ID: ${targetPhone.id}`);
            console.log('   You need to set up call forwarding for this number.');
        }

        console.log('\n🎉 Call forwarding configuration test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testCallForwardingConfig();

const axios = require('axios');

const API_BASE = 'https://newrankandrentapi.onrender.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testCallForwardingIntegration() {
    try {
        console.log('🧪 Testing Call Forwarding Integration with Twilio...\n');

        // Test 1: Get user's phone numbers
        console.log('1. Getting user phone numbers...');
        const phoneResponse = await axios.get(`${API_BASE}/api/twilio/my-numbers`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        const phoneNumbers = phoneResponse.data.phoneNumbers || [];
        console.log(`✅ Found ${phoneNumbers.length} phone numbers`);
        
        if (phoneNumbers.length === 0) {
            console.log('❌ No phone numbers found. Please purchase a phone number first.');
            return;
        }

        // Test 2: Get existing call forwarding settings
        console.log('\n2. Getting existing call forwarding settings...');
        const forwardingResponse = await axios.get(`${API_BASE}/api/call-forwarding`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        const existingForwarding = forwardingResponse.data.data || [];
        console.log(`✅ Found ${existingForwarding.length} existing forwarding settings`);

        // Test 3: Check Twilio phone number configuration
        console.log('\n3. Checking Twilio phone number configuration...');
        const testPhoneNumber = phoneNumbers[0];
        console.log(`📞 Testing phone number: ${testPhoneNumber.phone_number}`);
        console.log(`📞 Twilio SID: ${testPhoneNumber.twilio_sid}`);
        
        // Test 4: Test TwiML endpoint directly
        console.log('\n4. Testing TwiML endpoint...');
        try {
            const twimlResponse = await axios.post(`${API_BASE}/api/twilio/twiml`, {
                Direction: 'inbound',
                Called: testPhoneNumber.phone_number,
                Caller: '+1234567890',
                CallSid: 'test-call-sid-123'
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            
            console.log('✅ TwiML endpoint responded successfully');
            console.log('📋 TwiML Response:', twimlResponse.data);
            
            // Check if the response contains forwarding logic
            if (twimlResponse.data.includes('dial') && twimlResponse.data.includes('number')) {
                console.log('✅ TwiML contains dial instructions');
            } else {
                console.log('⚠️ TwiML response may not contain proper dial instructions');
            }
            
        } catch (twimlError) {
            console.log('❌ TwiML endpoint test failed:');
            console.log('Status:', twimlError.response?.status);
            console.log('Error:', twimlError.response?.data || twimlError.message);
        }

        // Test 5: Check if forwarding is configured for this number
        console.log('\n5. Checking call forwarding configuration...');
        const forwardingForNumber = existingForwarding.find(f => f.phone_number_id === testPhoneNumber.id);
        
        if (forwardingForNumber) {
            console.log('✅ Call forwarding is configured:');
            console.log(`   - Forwards to: ${forwardingForNumber.forward_to_number}`);
            console.log(`   - Type: ${forwardingForNumber.forwarding_type}`);
            console.log(`   - Active: ${forwardingForNumber.is_active}`);
            console.log(`   - Timeout: ${forwardingForNumber.ring_timeout}s`);
        } else {
            console.log('⚠️ No call forwarding configured for this number');
            console.log('   You need to set up call forwarding first');
        }

        // Test 6: Test Twilio API directly (if you have Twilio credentials)
        console.log('\n6. Testing Twilio API configuration...');
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                const phoneNumber = await twilio.incomingPhoneNumbers(testPhoneNumber.twilio_sid).fetch();
                
                console.log('✅ Twilio phone number configuration:');
                console.log(`   - Voice URL: ${phoneNumber.voiceUrl}`);
                console.log(`   - Voice Application SID: ${phoneNumber.voiceApplicationSid}`);
                console.log(`   - Status Callback: ${phoneNumber.statusCallback}`);
                
                // Check if the voice URL points to your TwiML endpoint
                if (phoneNumber.voiceUrl && phoneNumber.voiceUrl.includes('/api/twilio/twiml')) {
                    console.log('✅ Voice URL is correctly configured');
                } else {
                    console.log('❌ Voice URL is not configured correctly');
                    console.log(`   Expected: ${API_BASE}/api/twilio/twiml`);
                    console.log(`   Actual: ${phoneNumber.voiceUrl}`);
                }
                
            } catch (twilioError) {
                console.log('❌ Twilio API test failed:');
                console.log('Error:', twilioError.message);
            }
        } else {
            console.log('⚠️ Twilio credentials not available for direct API test');
        }

        // Test 7: Manual testing instructions
        console.log('\n7. Manual Testing Instructions:');
        console.log('📞 To test call forwarding manually:');
        console.log(`   1. Call your Twilio number: ${testPhoneNumber.phone_number}`);
        console.log('   2. The call should be forwarded to your configured number');
        console.log('   3. Check the server logs for TwiML processing');
        console.log('   4. Check your call logs in the dashboard');

        // Test 8: Environment check
        console.log('\n8. Environment Configuration Check:');
        console.log('🔧 Required environment variables:');
        console.log(`   - SERVER_URL: ${process.env.SERVER_URL || 'NOT SET'}`);
        console.log(`   - TWILIO_APP_SID: ${process.env.TWILIO_APP_SID ? 'SET' : 'NOT SET'}`);
        console.log(`   - TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}`);
        
        if (!process.env.SERVER_URL) {
            console.log('❌ SERVER_URL is not set - this will break call forwarding!');
        }

        console.log('\n🎉 Call forwarding integration test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testCallForwardingIntegration();

const axios = require('axios');

const API_BASE = 'https://newrankandrentapi.onrender.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function testCallForwarding() {
    try {
        console.log('🧪 Testing Call Forwarding Setup...\n');

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

        // Test 3: Try to create a new call forwarding setting
        console.log('\n3. Testing call forwarding creation...');
        const testPhoneNumber = phoneNumbers[0];
        const testForwardTo = '+1234567890'; // Test number
        
        try {
            const createResponse = await axios.post(`${API_BASE}/api/call-forwarding`, {
                phone_number_id: testPhoneNumber.id,
                forward_to_number: testForwardTo,
                forwarding_type: 'always',
                ring_timeout: 20
            }, {
                headers: { 
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Call forwarding created successfully!');
            console.log('Response:', createResponse.data);
            
        } catch (createError) {
            console.log('❌ Call forwarding creation failed:');
            console.log('Status:', createError.response?.status);
            console.log('Error:', createError.response?.data?.error || createError.message);
            
            if (createError.response?.status === 400 && createError.response?.data?.error?.includes('already exists')) {
                console.log('ℹ️  This is expected if forwarding already exists for this number');
            }
        }

        // Test 4: Get updated forwarding settings
        console.log('\n4. Getting updated call forwarding settings...');
        const updatedForwardingResponse = await axios.get(`${API_BASE}/api/call-forwarding`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });
        
        const updatedForwarding = updatedForwardingResponse.data.data || [];
        console.log(`✅ Now have ${updatedForwarding.length} forwarding settings`);

        // Test 5: Test forwarding for specific phone number
        console.log('\n5. Testing forwarding for specific phone number...');
        try {
            const specificForwardingResponse = await axios.get(`${API_BASE}/api/call-forwarding/phone-number/${testPhoneNumber.id}`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            
            console.log('✅ Phone number forwarding settings retrieved:');
            console.log('Data:', specificForwardingResponse.data);
            
        } catch (specificError) {
            console.log('❌ Failed to get specific phone number forwarding:');
            console.log('Error:', specificError.response?.data?.error || specificError.message);
        }

        console.log('\n🎉 Call forwarding test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testCallForwarding();

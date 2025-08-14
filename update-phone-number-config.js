const axios = require('axios');

const API_BASE = 'https://newrankandrentapi.onrender.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

async function updatePhoneNumberConfiguration() {
    try {
        console.log('🔧 Updating Phone Number Configuration...\n');

        // Get user's phone numbers
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

        // Update each phone number configuration
        for (const phoneNumber of phoneNumbers) {
            console.log(`\n📞 Updating configuration for: ${phoneNumber.phone_number}`);
            
            try {
                // Update the phone number configuration
                const updateResponse = await axios.put(`${API_BASE}/api/twilio/my-numbers/${phoneNumber.id}`, {
                    voice_url: `${API_BASE}/api/twilio/twiml`,
                    status_callback: `${API_BASE}/api/twilio/status-callback`,
                    status_callback_method: 'POST',
                    status_callback_event: ['initiated', 'ringing', 'answered', 'completed']
                }, {
                    headers: { 
                        'Authorization': `Bearer ${AUTH_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`✅ Successfully updated ${phoneNumber.phone_number}`);
                
            } catch (updateError) {
                console.log(`❌ Failed to update ${phoneNumber.phone_number}:`);
                console.log('Error:', updateError.response?.data?.error || updateError.message);
            }
        }

        console.log('\n🎉 Phone number configuration update completed!');

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the update
updatePhoneNumberConfiguration();

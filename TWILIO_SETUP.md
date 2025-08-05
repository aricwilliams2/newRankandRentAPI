# Twilio Integration Setup Guide

This guide will help you set up Twilio integration for buying numbers, making calls, recording calls, and playing back recordings.

## 🚀 Quick Start

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SERVER_URL=https://your-api-url.com
```

### 2. Database Migration

Run the database migrations to create the Twilio call logs table:

```sql
-- Create a dedicated table for Twilio call logs
CREATE TABLE twilio_call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    call_sid VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    direction VARCHAR(50),
    price DECIMAL(10,4),
    price_unit VARCHAR(10),
    recording_url TEXT,
    recording_sid VARCHAR(255),
    recording_duration INT,
    recording_channels INT,
    recording_status VARCHAR(50),
    duration INT,
    start_time DATETIME,
    end_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint for user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_twilio_call_logs_user_id ON twilio_call_logs(user_id);
CREATE INDEX idx_twilio_call_logs_call_sid ON twilio_call_logs(call_sid);
CREATE INDEX idx_twilio_call_logs_status ON twilio_call_logs(status);
CREATE INDEX idx_twilio_call_logs_created_at ON twilio_call_logs(created_at);
CREATE INDEX idx_twilio_call_logs_from_number ON twilio_call_logs(from_number);
CREATE INDEX idx_twilio_call_logs_to_number ON twilio_call_logs(to_number);
```

## 📞 API Endpoints

### Buy Phone Numbers

**POST** `/api/twilio/buy-number`
```json
{
  "phoneNumber": "+1234567890",
  "areaCode": "415",
  "country": "US"
}
```

**GET** `/api/twilio/available-numbers?areaCode=415&country=US&limit=20`

### Make Calls

**POST** `/api/twilio/call`
```json
{
  "to": "+1234567890",
  "from": "+1987654321",
  "record": true
}
```

### Get Call Logs

**GET** `/api/twilio/call-logs?page=1&limit=20&status=completed`

**GET** `/api/twilio/call-logs/:callSid`

### Get Recordings

**GET** `/api/twilio/recordings?page=1&limit=20`

**GET** `/api/twilio/recordings/:callSid`

**DELETE** `/api/twilio/recordings/:recordingSid`

## 🔧 Twilio Console Setup

### 1. Create a Twilio Account
- Sign up at [twilio.com](https://www.twilio.com)
- Get your Account SID and Auth Token from the console

### 2. Create a TwiML App
1. Go to Twilio Console > Voice > TwiML Apps
2. Create a new TwiML App
3. Set the Voice Configuration URL to: `https://your-api-url.com/api/twilio/twiml`
4. Copy the App SID to your environment variables

### 3. Configure Webhooks
Your API will automatically handle these webhooks:
- Call Status Callback: `/api/twilio/status-callback`
- Recording Callback: `/api/twilio/recording-callback`

## 🎯 Features

### ✅ Buy Numbers
- Search available numbers by area code or specific number
- Purchase numbers automatically
- Support for multiple countries

### ✅ Make Calls from Browser
- Initiate calls with recording
- Custom TwiML support
- Real-time status updates

### ✅ Record Calls
- Automatic call recording
- Dual-channel recording (both sides)
- Recording status callbacks

### ✅ Playback Recordings
- List all recordings for a user
- Get recordings by call SID
- Delete recordings
- Direct media URL access

## 🔒 Security

- All endpoints require authentication
- User-specific call logs and recordings
- Secure webhook validation (implement as needed)

## 📊 Call Analytics

The system tracks:
- Call duration and cost
- Recording information
- Call status and direction
- User association
- Follow-up scheduling

## 🚨 Important Notes

1. **HTTPS Required**: Twilio webhooks require HTTPS in production
2. **Phone Number Format**: Use E.164 format (+1234567890)
3. **Recording Storage**: Recordings are stored on Twilio's servers
4. **Costs**: Each call and recording incurs Twilio charges
5. **Rate Limits**: Be aware of Twilio's API rate limits

## 🛠️ Troubleshooting

### Common Issues

1. **"No available numbers found"**
   - Try different area codes
   - Check country code
   - Verify Twilio account has sufficient credits

2. **"Failed to initiate call"**
   - Verify phone number format
   - Check Twilio credentials
   - Ensure webhook URLs are accessible

3. **"Recording not found"**
   - Wait for recording processing (can take a few minutes)
   - Check recording status in Twilio console

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## 📚 Additional Resources

- [Twilio Voice API Documentation](https://www.twilio.com/docs/voice/api)
- [TwiML Reference](https://www.twilio.com/docs/voice/twiml)
- [Twilio Pricing](https://www.twilio.com/pricing) 
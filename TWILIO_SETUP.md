# Twilio Integration Setup Guide

This guide will help you set up Twilio integration for buying numbers, making calls, recording calls, and playing back recordings.

## 🚀 Quick Start

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SERVER_URL=https://your-api-url.com
# Note: TWILIO_PHONE_NUMBER is no longer needed - users buy their own numbers
```

### 2. Database Migration

Run the database migrations to create the required tables:

```sql
-- Create user phone numbers table for multi-user calling platform
CREATE TABLE user_phone_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    twilio_sid VARCHAR(255) UNIQUE NOT NULL,
    friendly_name VARCHAR(255),
    country VARCHAR(10) DEFAULT 'US',
    region VARCHAR(100),
    locality VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    purchase_price DECIMAL(10,4),
    purchase_price_unit VARCHAR(10) DEFAULT 'USD',
    monthly_cost DECIMAL(10,4) DEFAULT 1.00,
    capabilities JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint for user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
CREATE INDEX idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_phone_number ON user_phone_numbers(phone_number);
CREATE INDEX idx_user_phone_numbers_twilio_sid ON user_phone_numbers(twilio_sid);
CREATE INDEX idx_user_phone_numbers_is_active ON user_phone_numbers(is_active);
CREATE INDEX idx_user_phone_numbers_created_at ON user_phone_numbers(created_at);

CREATE INDEX idx_twilio_call_logs_user_id ON twilio_call_logs(user_id);
CREATE INDEX idx_twilio_call_logs_call_sid ON twilio_call_logs(call_sid);
CREATE INDEX idx_twilio_call_logs_status ON twilio_call_logs(status);
CREATE INDEX idx_twilio_call_logs_created_at ON twilio_call_logs(created_at);
CREATE INDEX idx_twilio_call_logs_from_number ON twilio_call_logs(from_number);
CREATE INDEX idx_twilio_call_logs_to_number ON twilio_call_logs(to_number);

-- Add unique constraint to ensure one user can't buy the same number twice
CREATE UNIQUE INDEX idx_user_phone_numbers_unique ON user_phone_numbers(user_id, phone_number);
```

## 📞 API Endpoints

### Phone Number Management

**POST** `/api/twilio/buy-number` - Buy a phone number for your account
```json
{
  "phoneNumber": "+1234567890",  // Optional: specific number
  "areaCode": "415",             // Optional: area code to search
  "country": "US"                // Optional: country (defaults to US)
}
```

**GET** `/api/twilio/available-numbers?areaCode=415&country=US&limit=20` - Search available numbers

**GET** `/api/twilio/my-numbers` - Get all your phone numbers with stats

**GET** `/api/twilio/my-numbers/active` - Get only your active phone numbers

**PUT** `/api/twilio/my-numbers/:id` - Update phone number settings
```json
{
  "friendly_name": "My Business Line",
  "is_active": true
}
```

**DELETE** `/api/twilio/my-numbers/:id` - Release a phone number

### Make Calls

**POST** `/api/twilio/call` - Make a call using your numbers
```json
{
  "to": "+1234567890",           // Required: recipient number
  "from": "+1987654321",         // Optional: your number (uses first active if not specified)
  "record": true                 // Optional: record the call (default: true)
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

### ✅ Multi-User Phone Number Management
- Each user can buy and own multiple phone numbers
- Search available numbers by area code or specific number
- Purchase numbers automatically with user association
- Support for multiple countries
- Release numbers when no longer needed

### ✅ User-Specific Calling
- Make calls using any of your purchased numbers
- Automatic fallback to first active number if none specified
- Verification that users can only use their own numbers
- No shared/static phone numbers

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

### ✅ Phone Number Analytics
- Track purchase costs and monthly fees
- View active vs inactive numbers
- Number usage statistics

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
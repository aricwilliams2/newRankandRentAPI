# Call Forwarding Implementation Guide

## Overview

This implementation provides a complete call forwarding system that allows users to:
1. Choose a phone number they own
2. Set up forwarding to another phone number
3. Configure forwarding behavior (always, busy, no answer, unavailable)
4. Manage forwarding settings through a React interface

## Features

### Backend Components

#### 1. Database Schema
- **Table**: `call_forwarding`
- **Fields**:
  - `id`: Primary key
  - `user_id`: Foreign key to users table
  - `phone_number_id`: Foreign key to user_phone_numbers table
  - `forward_to_number`: The number to forward calls to
  - `is_active`: Boolean to enable/disable forwarding
  - `forwarding_type`: Enum ('always', 'busy', 'no_answer', 'unavailable')
  - `ring_timeout`: Seconds before forwarding (default: 20)
  - `created_at`, `updated_at`: Timestamps

#### 2. Models
- **CallForwarding.js**: Handles database operations for forwarding settings
- **UserPhoneNumber.js**: Manages user's phone numbers

#### 3. API Routes
- **GET** `/api/call-forwarding`: Get all forwarding settings for user
- **POST** `/api/call-forwarding`: Create new forwarding setting
- **PUT** `/api/call-forwarding/:id`: Update forwarding setting
- **PATCH** `/api/call-forwarding/:id/toggle`: Toggle active status
- **DELETE** `/api/call-forwarding/:id`: Delete forwarding setting
- **GET** `/api/call-forwarding/phone-number/:phoneNumberId`: Get forwarding for specific number

#### 4. Twilio Integration
- Modified TwiML endpoint to check for forwarding settings
- Automatically forwards inbound calls based on user configuration
- Creates call logs for forwarded calls

### Frontend Components

#### 1. CallForwardingComponent.tsx
- React component for managing forwarding settings
- Features:
  - Create new forwarding rules
  - View existing forwarding settings
  - Toggle forwarding on/off
  - Delete forwarding rules
  - Form validation and error handling

## How It Works

### 1. Call Flow
```
Incoming Call → Twilio → TwiML Endpoint → Check Forwarding Settings → Forward Call
```

### 2. Forwarding Logic
1. **Inbound call received** to a user's phone number
2. **TwiML endpoint** checks if forwarding is configured
3. **If forwarding active**: Call is forwarded to the specified number
4. **If no forwarding**: Default message is played
5. **Call log** is created for tracking

### 3. Forwarding Types
- **Always**: Forwards immediately
- **Busy**: Forwards when line is busy (future enhancement)
- **No Answer**: Forwards after timeout (future enhancement)
- **Unavailable**: Forwards when unavailable (future enhancement)

## Setup Instructions

### 1. Database Migration
Run the migration to create the call_forwarding table:
```sql
-- File: supabase/migrations/20250115000007_create_call_forwarding.sql
```

### 2. Backend Setup
1. Ensure the CallForwarding model is in place
2. Add call forwarding routes to server.js
3. Update TwiML endpoint for forwarding logic

### 3. Frontend Setup
1. Import CallForwardingComponent in your React app
2. Add to your routing/navigation
3. Ensure authentication is working

## Usage Examples

### Creating a Forwarding Rule
```javascript
// API Call
const response = await fetch('/api/call-forwarding', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    phone_number_id: 123,
    forward_to_number: '+15551234567',
    forwarding_type: 'always',
    ring_timeout: 20
  })
});
```

### React Component Usage
```jsx
import CallForwardingComponent from './components/CallForwardingComponent';

function App() {
  return (
    <div>
      <CallForwardingComponent />
    </div>
  );
}
```

## API Endpoints

### Get All Forwarding Settings
```
GET /api/call-forwarding
Authorization: Bearer <token>
```

### Create Forwarding Setting
```
POST /api/call-forwarding
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone_number_id": 123,
  "forward_to_number": "+15551234567",
  "forwarding_type": "always",
  "ring_timeout": 20
}
```

### Update Forwarding Setting
```
PUT /api/call-forwarding/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "forward_to_number": "+15559876543",
  "is_active": false
}
```

### Toggle Forwarding Status
```
PATCH /api/call-forwarding/:id/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_active": true
}
```

### Delete Forwarding Setting
```
DELETE /api/call-forwarding/:id
Authorization: Bearer <token>
```

## Security Features

1. **User Authentication**: All endpoints require valid JWT token
2. **Ownership Verification**: Users can only manage their own forwarding settings
3. **Phone Number Validation**: Ensures phone numbers belong to the authenticated user
4. **Input Validation**: Server-side validation of all inputs

## Error Handling

### Common Errors
- **400**: Missing required fields or invalid data
- **401**: Unauthorized (invalid/missing token)
- **404**: Forwarding setting not found
- **500**: Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Testing

### Manual Testing
1. Create a forwarding rule through the React interface
2. Call the source phone number
3. Verify the call is forwarded to the target number
4. Check call logs for the forwarded call

### API Testing
```bash
# Test creating forwarding
curl -X POST https://your-api.com/api/call-forwarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": 123,
    "forward_to_number": "+15551234567",
    "forwarding_type": "always"
  }'
```

## Future Enhancements

1. **Advanced Forwarding Types**: Implement busy, no-answer, and unavailable forwarding
2. **Time-based Forwarding**: Forward calls based on time of day
3. **Multiple Forwarding Numbers**: Forward to multiple numbers in sequence
4. **Forwarding Rules**: More complex conditional forwarding
5. **Call Screening**: Add caller ID filtering
6. **Voicemail Integration**: Forward to voicemail when forwarding fails

## Troubleshooting

### Common Issues

1. **Calls not forwarding**
   - Check if forwarding is active
   - Verify phone number ownership
   - Check Twilio logs for errors

2. **API errors**
   - Verify authentication token
   - Check request format
   - Ensure phone number exists

3. **React component not loading**
   - Check network requests
   - Verify API endpoints
   - Check browser console for errors

### Debug Logs
The system includes comprehensive logging:
- TwiML request/response logs
- Call forwarding decision logs
- API request/response logs
- Error logs with stack traces

## Support

For issues or questions:
1. Check the logs for error details
2. Verify database migrations are applied
3. Test API endpoints directly
4. Check Twilio console for call details



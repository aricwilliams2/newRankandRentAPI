# Call Forwarding and Whisper Fixes

## Issues Fixed

### (A) Whisper Not Playing / Error Voice ✅ FIXED

**Root Cause:**
- Whisper endpoint needed more robust error handling
- Need to always return valid TwiML even on errors
- Voice parameter needed to be consistently 'alice' for reliability

**Fixes Applied:**

1. **Whisper Endpoint Robustness** (`/api/twilio/whisper`)
   - ✅ Always initialize TwiML at start (guarantees valid XML return)
   - ✅ Always use 'alice' voice (most reliable TTS voice)
   - ✅ Multiple fallback layers for error handling
   - ✅ Keep messages short (2-3 seconds max)
   - ✅ Always return valid TwiML with `text/xml` Content-Type

2. **Whisper Audio Endpoint** (`/api/twilio/whisper-audio/:id`)
   - ✅ Improved MIME type normalization for Twilio compatibility
   - ✅ Added CORS headers
   - ✅ Public access (no auth required)

### (B) Caller Showing as "Spam" ✅ FIXED

**Root Cause:**
- Using original caller number as callerId causes carrier spam labeling
- Carriers flag re-originated calls without proper attestation

**Fix Applied:**

1. **Call Forwarding Caller ID**
   - ✅ Changed to use Twilio number (`calledTwilioNumber`) as `callerId`
   - ✅ Original caller number still passed to whisper for announcement
   - ✅ Reduces spam labeling while maintaining caller announcement

**Code Changes:**
```javascript
// BEFORE (caused spam labeling):
const dial = twiml.dial({
  // Omit callerId - Twilio passes through original caller
  answerOnBridge: true,
  ...
});

// AFTER (fixed):
const dial = twiml.dial({
  callerId: calledTwilioNumber,  // Use Twilio number to reduce spam labeling
  answerOnBridge: true,
  ...
});
```

## Verification Steps

### 1. Verify Whisper Endpoint

**Test the whisper endpoint directly:**
```bash
curl -X GET "https://YOUR_PROD_DOMAIN/api/twilio/whisper?pn=%2B1234567890&from=%2B1987654321" \
  -H "Accept: text/xml"
```

**Expected Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">Incoming call on your line from 1 9 8 7 6 5 4 3 2 1.</Say>
  <Pause length="1"/>
</Response>
```

### 2. Verify Whisper Audio Endpoint

**Test from outside your network:**
```bash
curl -I "https://YOUR_PROD_DOMAIN/api/twilio/whisper-audio/123"
```

**Expected Headers:**
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg (or audio/webm)
Content-Length: [size]
Cache-Control: public, max-age=31536000
Access-Control-Allow-Origin: *
```

### 3. Verify Call Forwarding

1. **Set up forwarding** via API:
```bash
POST /api/call-forwarding
{
  "phone_number_id": 123,
  "forward_to_number": "+1122334455",
  "forwarding_type": "always",
  "is_active": true
}
```

2. **Call your Twilio number** from another phone

3. **Check Twilio Console → Monitor → Debugger:**
   - Look for Call SID
   - Check webhook requests:
     - `/api/twilio/twiml` should return 200
     - `/api/twilio/whisper` should return 200 (right after answer)
     - Response should contain `<Say>` or `<Play>` elements

4. **Verify caller ID:**
   - Answer the forwarded call
   - Check caller ID display - should show your Twilio number (not "Spam")
   - Listen for whisper - should announce original caller if configured

### 4. Verify Phone Number Configuration

**In Twilio Console:**
1. Go to **Phone Numbers → Manage → Active numbers**
2. Click your phone number
3. Under **Voice Configuration**:
   - **Webhook URL**: `POST https://YOUR_PROD_DOMAIN/api/twilio/twiml`
   - **HTTP Method**: POST
   - **Status Callback URL**: `https://YOUR_PROD_DOMAIN/api/twilio/status-callback`
   - **Status Callback Method**: POST

**If using TwiML App:**
- Ensure the TwiML App's Voice URL matches or is unset
- Number-level Voice URL takes precedence

## Environment Variables Check

Ensure these are set:
```bash
SERVER_URL=https://YOUR_PROD_DOMAIN  # CRITICAL - must be HTTPS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
```

## Common Issues & Solutions

### Whisper Still Not Playing

1. **Check logs** for `/whisper` endpoint hits
   - If not being called: verify `answerOnBridge: true` is set
   - If returning 200 but no sound: check TwiML response in logs

2. **Verify whisper is enabled:**
```sql
SELECT whisper_enabled, whisper_type, whisper_text 
FROM user_phone_numbers 
WHERE phone_number = '+YOUR_NUMBER';
```

3. **Test whisper endpoint directly** (see Verification Step 1)

4. **Check Twilio Debugger** for webhook response times
   - Whisper must respond quickly (< 2 seconds)
   - Slow responses can cause whisper to be skipped

### Still Seeing "Spam" Label

1. **Verify callerId is set correctly:**
   - Check server logs for: `CallerId: +YOUR_TWILIO_NUMBER`
   - Should NOT be the original caller number

2. **Carrier reputation:**
   - Some carriers may still show "Spam" based on reputation
   - This is carrier-side, not your server
   - Consider Twilio Trust Hub / Branded Calling for better reputation

3. **Wait time:**
   - Reputation changes can take 24-48 hours to propagate

### Whisper Audio Not Playing (if using audio upload)

1. **Verify audio URL is publicly accessible:**
```bash
curl -I "https://YOUR_PROD_DOMAIN/api/twilio/whisper-audio/123"
```

2. **Check Content-Type header:**
   - Should be `audio/mpeg`, `audio/webm`, or `audio/x-wav`
   - Not `application/octet-stream`

3. **Verify audio file size:**
   - Keep files small (< 5MB recommended)
   - Large files may timeout

## Testing Checklist

- [ ] Whisper endpoint returns valid TwiML (test directly)
- [ ] Whisper audio endpoint is publicly accessible (if using audio)
- [ ] Phone number Voice URL points to correct endpoint
- [ ] Call forwarding configured and active
- [ ] Call connects successfully when forwarding is active
- [ ] Whisper plays before call connects (if enabled)
- [ ] Caller ID shows Twilio number (not "Spam")
- [ ] Original caller announced in whisper (if configured)
- [ ] Server logs show successful webhook calls
- [ ] Twilio Debugger shows all webhooks returning 200

## Next Steps

1. **Deploy changes** to production
2. **Test with real call** from another phone
3. **Monitor Twilio Debugger** for webhook responses
4. **Check server logs** for whisper endpoint activity
5. **Verify caller ID display** on recipient's phone

## Long-term Improvements (Optional)

1. **Twilio Trust Hub**: Register for better caller ID reputation
2. **Branded Calling**: For even better caller ID display
3. **Whisper Analytics**: Track whisper play success rate
4. **Custom Voices**: Support for more TTS voices if needed


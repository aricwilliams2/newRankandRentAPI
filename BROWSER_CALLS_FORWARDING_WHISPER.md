# Browser Calls, Call Forwarding, and Call Whisper Implementation Guide

## Overview

This document explains how the system implements three key features:
1. **Browser Calls** - Making calls from a web browser using Twilio Voice SDK
2. **Call Forwarding** - Forwarding incoming calls to configured phone numbers
3. **Call Whisper** - Playing a private message to the callee before connecting the call

---

## 📞 Browser Calls Implementation

### Architecture

Browser calls use the **Twilio Voice SDK** to enable calling directly from a web browser without requiring a server-side call initiation. The flow works as follows:

```
Browser → Twilio Voice SDK → Twilio → PSTN Phone Number
```

### Components

#### 1. Frontend Component (`BrowserCallComponent.tsx`)

The React component handles the browser-side calling logic:

**Key Features:**
- Initializes Twilio Device with access token
- Handles call state management (idle, calling, connected, error)
- Provides call controls (mute, hang up, dialpad)
- Manages call events (connect, disconnect, error)

**Key Code Flow:**

```typescript
// 1. Initialize Device
useEffect(() => {
  const initDevice = async () => {
    // Get access token from backend
    const response = await fetch('/api/twilio/access-token', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { token } = await response.json();
    
    // Initialize Twilio Device
    const dev = new Device(token, {
      debug: true,
      enableRingingState: true
    });
    
    // Set up event listeners
    dev.on('ready', () => setCallStatus('ready'));
    dev.on('connect', (conn) => {
      setConnection(conn);
      setIsConnected(true);
    });
    dev.on('disconnect', () => {
      setIsConnected(false);
      setCallStatus('idle');
    });
    
    setDevice(dev);
  };
  initDevice();
}, []);

// 2. Make Call
const makeCall = async () => {
  const conn = await device.connect({ To: toNumber });
  setConnection(conn);
};

// 3. Send DTMF Digits (Dialpad)
const sendDigit = (digit: string) => {
  connection.sendDigits(digit);
};
```

#### 2. Backend Access Token Endpoint (`/api/twilio/access-token`)

Generates a Twilio Access Token with Voice Grant for browser calling:

**Location:** `routes/twilioRoutes.js` (lines 148-233)

**Key Features:**
- Validates user authentication
- Checks for active phone numbers
- Enforces balance requirements
- Generates JWT access token with Voice Grant

**Code Flow:**

```javascript
router.get('/access-token', auth, async (req, res) => {
  // 1. Check user has active phone numbers
  const userNumbers = await UserPhoneNumber.findActiveByUserId(req.user.id);
  if (userNumbers.length === 0) {
    return res.status(400).json({ error: 'No active phone numbers found' });
  }

  // 2. Check balance (unless free minutes available)
  await BillingService.ensureMonthlyMinutesReset(req.user.id);
  const refreshedUser = await User.findById(req.user.id);
  if (refreshedUser.free_minutes_remaining <= 0) {
    await BillingService.assertMinBalance(req.user.id);
  }

  // 3. Generate Access Token
  const AccessToken = require('twilio').jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity: `user-${req.user.id}` }
  );
  
  // 4. Add Voice Grant
  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID || process.env.TWILIO_APP_SID,
    incomingAllow: true
  });
  
  token.addGrant(voiceGrant);
  
  // 5. Return token
  res.json({ 
    token: token.toJwt(),
    identity: `user-${req.user.id}`,
    availableNumbers: userNumbers.map(num => ({
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name
    }))
  });
});
```

#### 3. TwiML Endpoint (`/api/twilio/twiml`)

Handles browser-to-phone calls initiated from the browser:

**Location:** `routes/twilioRoutes.js` (lines 471-731)

**Browser Call Detection:**

```javascript
// Detect browser-to-phone calls
if (to && to.startsWith('+') && (direction !== 'inbound' || caller.startsWith('client:'))) {
  console.log('🎙️ Browser calling phone number:', to);
  
  // Create call log entry
  await TwilioCallLog.create({
    call_sid: callSid,
    user_id: userPhoneNumber.user_id,
    phone_number_id: userPhoneNumber.id,
    from_number: from,
    to_number: to,
    direction: 'outbound',
    status: 'initiated',
    record: true
  });
  
  // Generate TwiML to dial the number
  const dial = twiml.dial({
    callerId: from, // User's purchased number
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
    statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
    timeout: 20
  });
  dial.number(to);
}
```

### Browser Call Flow Diagram

```
┌─────────────┐
│   Browser   │
│  Component  │
└──────┬──────┘
       │
       │ 1. Request Access Token
       ▼
┌─────────────────────┐
│  /access-token API  │
│  - Validates user   │
│  - Checks balance   │
│  - Returns JWT      │
└──────┬──────────────┘
       │
       │ 2. Initialize Device
       ▼
┌─────────────┐
│ Twilio SDK  │
│   Device    │
└──────┬──────┘
       │
       │ 3. device.connect({ To: '+1234567890' })
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 4. POST /twiml
       ▼
┌─────────────────────┐
│  TwiML Endpoint     │
│  - Creates log      │
│  - Generates TwiML  │
│  - Dials number     │
└──────┬──────────────┘
       │
       │ 5. TwiML Response
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 6. Connects call
       ▼
┌─────────────┐
│ Destination │
│   Number    │
└─────────────┘
```

### Environment Variables Required

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SERVER_URL=https://your-server.com
```

---

## 🔄 Call Forwarding Implementation

### Architecture

Call forwarding allows incoming calls to your Twilio numbers to be automatically forwarded to another phone number. The system supports multiple forwarding types and configurations.

### Components

#### 1. Database Schema

**Table:** `call_forwarding`

```sql
CREATE TABLE call_forwarding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone_number_id INT NOT NULL,
  forward_to_number VARCHAR(20) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  forwarding_type ENUM('always', 'busy', 'no_answer', 'unavailable') DEFAULT 'always',
  ring_timeout INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (phone_number_id) REFERENCES user_phone_numbers(id)
);
```

#### 2. CallForwarding Model

**Location:** `models/CallForwarding.js`

**Key Methods:**
- `getActiveForwardingForNumber(phoneNumberId)` - Gets active forwarding for a number
- `create(forwardingData)` - Creates new forwarding rule
- `update(id, updateData)` - Updates forwarding settings
- `toggleActive(id, isActive)` - Enables/disables forwarding

#### 3. TwiML Endpoint - Forwarding Logic

**Location:** `routes/twilioRoutes.js` (lines 567-704)

**Inbound Call Handling:**

```javascript
// Detect inbound calls
if (direction === 'inbound') {
  console.log('📞 Inbound call received to:', called);
  
  // 1. Find the phone number in database
  const userPhoneNumber = await UserPhoneNumber.findByPhoneNumber(phoneNumberToCheck);
  
  if (userPhoneNumber) {
    // 2. Check for active call forwarding
    const CallForwarding = require('../models/CallForwarding');
    const forwarding = await CallForwarding.getActiveForwardingForNumber(userPhoneNumber.id);
    
    if (forwarding && forwarding.is_active) {
      console.log(`🔄 Call forwarding active: ${phoneNumberToCheck} -> ${forwarding.forward_to_number}`);
      
      // 3. Create call log entry
      await TwilioCallLog.create({
        call_sid: callSid,
        user_id: userPhoneNumber.user_id,
        phone_number_id: userPhoneNumber.id,
        from_number: caller,
        to_number: phoneNumberToCheck,
        direction: 'inbound',
        status: 'initiated',
        record: true
      });
      
      // 4. Forward the call with whisper
      const dial = twiml.dial({
        answerOnBridge: true,  // Caller hears ringing during whisper
        record: 'record-from-answer-dual',
        recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
        statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
        timeout: forwarding.ring_timeout || 20
      });
      
      // 5. Add whisper URL to number element
      dial.number(
        {
          url: `${process.env.SERVER_URL}/api/twilio/whisper` +
               `?pn=${encodeURIComponent(calledTwilioNumber)}` +
               `&from=${encodeURIComponent(originalCaller)}`
        },
        forwarding.forward_to_number
      );
    }
  }
}
```

### Call Forwarding Flow Diagram

```
┌─────────────┐
│   Caller    │
│ +1234567890 │
└──────┬──────┘
       │
       │ 1. Dials Twilio Number
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 2. POST /twiml
       │    Direction=inbound
       │    From=+1234567890
       │    To=+1987654321
       ▼
┌─────────────────────┐
│  TwiML Endpoint      │
│  1. Lookup number    │
│  2. Check forwarding │
│  3. Create call log  │
└──────┬──────────────┘
       │
       │ 3. Active forwarding found?
       ▼
┌─────────────────────┐
│  Generate TwiML      │
│  <Dial>              │
│    <Number url=      │
│      "/whisper">     │
│      +1122334455     │
│    </Number>         │
│  </Dial>             │
└──────┬──────────────┘
       │
       │ 4. TwiML Response
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 5. GET /whisper
       │    (plays whisper)
       ▼
┌─────────────────────┐
│  Whisper Endpoint   │
│  - Plays message    │
│  - Returns TwiML    │
└──────┬──────────────┘
       │
       │ 6. Bridge call
       ▼
┌─────────────┐
│  Forwarded  │
│   Number    │
│ +1122334455 │
└─────────────┘
```

### Forwarding Types

1. **always** - Forward immediately when call comes in
2. **busy** - Forward only if line is busy (future implementation)
3. **no_answer** - Forward if no answer after timeout (future implementation)
4. **unavailable** - Forward if unavailable (future implementation)

Currently, only `always` type is fully implemented.

### API Endpoints

- `GET /api/call-forwarding` - Get all forwarding settings for user
- `POST /api/call-forwarding` - Create new forwarding rule
- `PUT /api/call-forwarding/:id` - Update forwarding setting
- `PATCH /api/call-forwarding/:id/toggle` - Toggle active status
- `DELETE /api/call-forwarding/:id` - Delete forwarding setting

---

## 🔊 Call Whisper Implementation

### Architecture

Call whisper plays a private message to the callee (the person receiving the forwarded call) before connecting them to the original caller. This message is only heard by the callee, not the caller.

### Components

#### 1. Database Schema

**Table:** `user_phone_numbers` (whisper fields)

```sql
ALTER TABLE user_phone_numbers
  ADD COLUMN whisper_enabled TINYINT(1) DEFAULT 0,
  ADD COLUMN whisper_type VARCHAR(10) DEFAULT 'say',
  ADD COLUMN whisper_text VARCHAR(255) NULL,
  ADD COLUMN whisper_voice VARCHAR(64) DEFAULT 'alice',
  ADD COLUMN whisper_language VARCHAR(10) DEFAULT 'en-US',
  ADD COLUMN whisper_media_url VARCHAR(512) NULL,
  ADD COLUMN active_whisper_id INT NULL;
```

**Table:** `phone_number_whispers` (for audio uploads)

```sql
CREATE TABLE phone_number_whispers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number_id INT NOT NULL,
  mime VARCHAR(100) DEFAULT 'audio/webm',
  bytes LONGBLOB NOT NULL,
  size_bytes INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (phone_number_id) REFERENCES user_phone_numbers(id)
);
```

#### 2. Whisper Types

1. **Text-to-Speech (TTS)** - `whisper_type: 'say'`
   - Uses Twilio's TTS engine
   - Configurable voice and language
   - Supports template variables: `{label}` and `{caller}`

2. **Pre-recorded Audio** - `whisper_type: 'play'`
   - Uses uploaded audio file
   - Stored in database as BLOB
   - Served via `/api/twilio/whisper-audio/:id` endpoint

#### 3. Whisper Endpoint (`/api/twilio/whisper`)

**Location:** `routes/twilioRoutes.js` (lines 733-839)

**Important:** This endpoint MUST be GET because Twilio's `<Number url="...">` uses GET by default.

**Code Flow:**

```javascript
router.get('/whisper', async (req, res) => {
  const pn = req.query.pn;      // Twilio number that was called
  const from = req.query.from;   // Original caller number
  
  // 1. Look up phone number
  const num = await UserPhoneNumber.findByPhoneNumber(pn);
  
  // 2. Check if whisper is enabled
  if (!num?.whisper_enabled) {
    // Return empty TwiML - call connects immediately
    return res.type('text/xml').send(twiml.toString());
  }
  
  // 3. Get whisper configuration
  const type = num.whisper_type || 'say';
  const whisperText = num.whisper_text;
  const media = num.whisper_media_url;
  
  // 4. Format caller number for speech
  const callerReadable = caller.replace(/^\+/, '').replace(/\D/g, '').split('').join(' ');
  
  // 5. Generate whisper content
  if (type === 'play' && media) {
    // Pre-recorded audio
    twiml.play(media);
  } else if (type === 'say' && whisperText) {
    // Text-to-Speech with template variables
    const finalText = whisperText
      .replace(/\{label\}/g, num.friendly_name || pn)
      .replace(/\{caller\}/g, callerReadable || '');
    
    twiml.say({ voice: 'alice', language: num.whisper_language || 'en-US' }, finalText);
  } else {
    // Default message
    twiml.say({ voice: 'alice', language: 'en-US' }, 
      `Incoming call on ${num.friendly_name || pn}. Caller ${callerReadable}.`);
  }
  
  // 6. Small pause before connecting
  twiml.pause({ length: 1 });
  
  // 7. Return TwiML
  res.type('text/xml').send(twiml.toString());
});
```

#### 4. Whisper Audio Upload Endpoint

**Location:** `routes/twilioRoutes.js` (lines 1600-1670)

```javascript
router.post('/my-numbers/:id/whisper/upload', auth, audioUpload.single('audio'), async (req, res) => {
  // 1. Store audio in database
  const result = await db.query(
    `INSERT INTO phone_number_whispers 
     (phone_number_id, mime, bytes, size_bytes, is_active) 
     VALUES (?, ?, ?, ?, 1)`,
    [id, mimeType, audioBuffer, fileSize]
  );
  
  const whisperId = result.insertId;
  
  // 2. Update phone number with whisper URL
  await UserPhoneNumber.update(id, {
    whisper_enabled: true,
    whisper_type: 'play',
    active_whisper_id: whisperId,
    whisper_media_url: `${process.env.SERVER_URL}/api/twilio/whisper-audio/${whisperId}`
  });
});
```

#### 5. Whisper Audio Serving Endpoint

**Location:** `routes/twilioRoutes.js` (lines 1672-1709)

**Important:** This endpoint is PUBLICLY accessible (no auth) because Twilio needs to fetch it without authentication.

```javascript
router.get('/whisper-audio/:id', async (req, res) => {
  // 1. Fetch audio from database
  const rows = await db.query(
    `SELECT mime, bytes, size_bytes FROM phone_number_whispers 
     WHERE id = ? AND is_active = 1`,
    [id]
  );
  
  // 2. Set headers for audio streaming
  res.setHeader('Content-Type', whisper.mime || 'audio/webm');
  res.setHeader('Content-Length', whisper.size_bytes);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  // 3. Send audio bytes
  res.end(whisper.bytes);
});
```

### Whisper Integration with Call Forwarding

When a call is forwarded, the whisper is automatically triggered:

```javascript
// In TwiML endpoint (/api/twilio/twiml)
dial.number(
  {
    url: `${process.env.SERVER_URL}/api/twilio/whisper` +
         `?pn=${encodeURIComponent(calledTwilioNumber)}` +
         `&from=${encodeURIComponent(originalCaller)}`
  },
  forwarding.forward_to_number
);
```

### Whisper Flow Diagram

```
┌─────────────┐
│   Caller    │
│ +1234567890 │
└──────┬──────┘
       │
       │ 1. Calls Twilio Number
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 2. POST /twiml
       ▼
┌─────────────────────┐
│  TwiML Endpoint      │
│  - Checks forwarding │
│  - Finds forward #   │
└──────┬──────────────┘
       │
       │ 3. Generates TwiML with whisper URL
       ▼
┌─────────────┐
│   Twilio    │
│   Servers   │
└──────┬──────┘
       │
       │ 4. Dials forward-to number
       │    GET /whisper?pn=+1987654321&from=+1234567890
       ▼
┌─────────────────────┐
│  Whisper Endpoint    │
│  1. Looks up number  │
│  2. Checks enabled   │
│  3. Gets config      │
└──────┬──────────────┘
       │
       │ 5. Plays whisper to callee ONLY
       │    (caller hears ringing)
       ▼
┌─────────────┐
│   Callee    │
│ +1122334455 │
│ Hears:      │
│ "Incoming   │
│  call on..."│
└──────┬──────┘
       │
       │ 6. Whisper completes
       │    Returns TwiML
       ▼
┌─────────────┐
│   Twilio    │
│   Bridges   │
│   Call      │
└──────┬──────┘
       │
       │ 7. Call connected
       ▼
┌─────────────┐
│ Caller      │◄───►│ Callee
│ +1234567890 │     │ +1122334455
└─────────────┘     └─────────────┘
```

### Whisper Template Variables

When using TTS (`whisper_type: 'say'`), you can use template variables:

- `{label}` - Replaced with phone number's friendly name
- `{caller}` - Replaced with formatted caller number

**Example:**
```
whisper_text: "Incoming call on {label}. Caller {caller}."
```

Results in: "Incoming call on Main Office. Caller 1 2 3 4 5 6 7 8 9 0."

### API Endpoints

- `GET /api/twilio/my-numbers/:id/whisper` - Get whisper configuration
- `PUT /api/twilio/my-numbers/:id/whisper` - Update whisper settings
- `POST /api/twilio/my-numbers/:id/whisper/upload` - Upload whisper audio file
- `GET /api/twilio/whisper-audio/:id` - Serve whisper audio (public, no auth)

---

## 🔗 Integration Flow (Complete Call)

Here's how all three features work together:

### Scenario: Browser Call → Forwarded Call → Whisper

```
1. User opens browser call component
   ↓
2. Component requests access token from /api/twilio/access-token
   ↓
3. Token received, Device initialized
   ↓
4. User enters phone number and clicks "Start Call"
   ↓
5. Browser → Twilio SDK → device.connect({ To: '+1234567890' })
   ↓
6. Twilio receives call request, POSTs to /api/twilio/twiml
   ↓
7. TwiML endpoint:
   - Detects browser call (To starts with +)
   - Creates call log entry
   - Generates TwiML to dial destination
   ↓
8. Call connects to +1234567890

---

Later, someone calls user's Twilio number:

1. Incoming call: +1987654321 → +1555123456 (user's Twilio number)
   ↓
2. Twilio POSTs to /api/twilio/twiml with Direction=inbound
   ↓
3. TwiML endpoint:
   - Detects inbound call
   - Looks up phone number in database
   - Finds active call forwarding to +1122334455
   - Creates call log entry
   ↓
4. Generates TwiML with whisper URL:
   <Dial answerOnBridge="true">
     <Number url="/whisper?pn=+1555123456&from=+1987654321">
       +1122334455
     </Number>
   </Dial>
   ↓
5. Twilio dials +1122334455
   ↓
6. While dialing, Twilio GETs /api/twilio/whisper
   ↓
7. Whisper endpoint:
   - Looks up phone number +1555123456
   - Checks whisper_enabled = true
   - Gets whisper_type = 'say'
   - Gets whisper_text = "Incoming call on {label}. Caller {caller}."
   - Formats text: "Incoming call on Main Office. Caller 1 9 8 7 6 5 4 3 2 1."
   - Generates TwiML: <Say>...</Say><Pause length="1"/>
   ↓
8. Twilio plays whisper to callee ONLY (+1122334455)
   - Caller (+1987654321) hears ringing
   ↓
9. Whisper completes, call bridges
   ↓
10. All parties connected:
    Caller (+1987654321) ↔ Callee (+1122334455)
    (Caller still doesn't know whisper was played)
```

---

## 📋 Environment Variables Summary

All features require these environment variables:

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret

# Twilio Application
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server Configuration
SERVER_URL=https://your-server.com
```

---

## 🧪 Testing

### Test Browser Calls

1. Open browser call component
2. Enter phone number
3. Click "Start Call"
4. Verify call connects

### Test Call Forwarding

1. Set up forwarding: `POST /api/call-forwarding`
2. Call your Twilio number from another phone
3. Verify call is forwarded to configured number

### Test Call Whisper

1. Configure whisper: `PUT /api/twilio/my-numbers/:id/whisper`
2. Set `whisper_enabled: true`
3. Set `whisper_text: "Incoming call on Main Office"`
4. Call your Twilio number
5. Verify callee hears whisper before connection

---

## 🐛 Troubleshooting

### Browser Calls Not Working

- Check access token endpoint returns valid token
- Verify TWILIO_TWIML_APP_SID is set correctly
- Check browser console for errors
- Verify user has active phone numbers

### Call Forwarding Not Working

- Verify phone number has Voice URL set to `/api/twilio/twiml`
- Check call forwarding is active in database
- Review server logs for TwiML generation
- Verify SERVER_URL environment variable is correct

### Whisper Not Playing

- Check `whisper_enabled` is true for phone number
- Verify whisper text/media is configured
- Check whisper endpoint is accessible (GET request)
- Review server logs for whisper endpoint calls
- Ensure whisper audio URL is publicly accessible (if using audio)

---

## 📚 Related Files

- `src/components/BrowserCallComponent.tsx` - Browser call UI
- `routes/twilioRoutes.js` - All Twilio endpoints
- `models/CallForwarding.js` - Call forwarding model
- `models/UserPhoneNumber.js` - Phone number model with whisper fields
- `supabase/migrations/20250115000007_create_call_forwarding.sql` - Forwarding schema
- `supabase/migrations/20250116000001_add_whisper_fields.sql` - Whisper schema
- `supabase/migrations/20250116000002_create_phone_number_whispers.sql` - Whisper audio storage

---

## 🎯 Key Takeaways

1. **Browser Calls** use Twilio Voice SDK and require access tokens
2. **Call Forwarding** uses TwiML Dial verb with Number element
3. **Call Whisper** uses TwiML Say/Play verb before bridging call
4. **Whisper is private** - only callee hears it, caller hears ringing
5. **All features integrate** - forwarding automatically includes whisper if enabled
6. **Server URLs must be HTTPS** - Twilio requires HTTPS for webhooks


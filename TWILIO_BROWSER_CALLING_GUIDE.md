# Twilio Browser Calling Integration Guide

This guide shows how to implement **browser-based calling** with a proper UI interface, eliminating the two-call issue and providing call controls.

## 🎯 Overview

**Current Problem:**
- API call → Twilio calls TwiML → TwiML calls target = 2 separate calls
- No calling interface
- User can't control the call

**Solution:**
- Use Twilio Voice SDK for browser calling
- Single call directly from browser to target
- Full call control interface (mute, hang up, etc.)

## 🚀 Backend Changes Needed

### 1. **Create Access Token Endpoint**

Add this to your `routes/twilioRoutes.js`:

```javascript
// Generate Twilio Access Token for browser calling
router.post('/access-token', auth, async (req, res) => {
  try {
    const { identity } = req.body;
    const userId = req.user.id;
    
    // Get user's active phone numbers
    const userNumbers = await UserPhoneNumber.findActiveByUserId(userId);
    if (userNumbers.length === 0) {
      return res.status(400).json({ 
        error: 'No phone numbers available. Please purchase a phone number first.' 
      });
    }

    const AccessToken = require('twilio').jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: identity || `user_${userId}` }
    );

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_APP_SID,
      incomingAllow: true
    });

    accessToken.addGrant(voiceGrant);

    res.json({
      success: true,
      token: accessToken.toJwt(),
      identity: identity || `user_${userId}`,
      availableNumbers: userNumbers.map(num => ({
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name
      }))
    });

  } catch (err) {
    console.error('Error generating access token:', err);
    res.status(500).json({ 
      error: 'Failed to generate access token',
      details: err.message 
    });
  }
});
```

### 2. **Update TwiML for Browser Calls**

Update your existing TwiML endpoint:

```javascript
// TwiML endpoint for browser calling
router.post('/twiml', (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  console.log('TwiML request received:', {
    body: req.body,
    query: req.query
  });

  const to = req.body.To || req.query.To;
  const from = req.body.From || req.query.From;
  const direction = req.body.Direction || req.query.Direction;
  
  console.log(`Call - Direction: ${direction}, From: ${from}, To: ${to}`);
  
  // Handle browser-to-phone calls
  if (to && to.startsWith('+')) {
    console.log(`Browser calling phone number: ${to}`);
    const dial = twiml.dial({
      callerId: from, // Use user's purchased number as caller ID
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed']
    });
    dial.number(to);
  } else {
    // Handle other cases
    twiml.say('Hello! This is your Twilio phone system.');
    twiml.pause({ length: 1 });
    twiml.say('Thank you for calling. Goodbye!');
  }

  const twimlResponse = twiml.toString();
  console.log('TwiML response:', twimlResponse);

  res.type('text/xml');
  res.send(twimlResponse);
});
```

### 3. **Environment Variables Needed**

Add these to your `.env` file:

```bash
# Existing variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SERVER_URL=https://newrankandrentapi.onrender.com

# New variables for browser calling
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
```

**To get API Key & Secret:**
1. Go to Twilio Console → Account → API Keys & Tokens
2. Create a new API Key
3. Copy the Key SID and Secret

## 🎯 Frontend Implementation

### 1. **Install Twilio Voice SDK**

```bash
npm install @twilio/voice-sdk
```

### 2. **React Calling Component**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';

const TwilioDialer = ({ authToken, apiBaseUrl }) => {
  const [device, setDevice] = useState(null);
  const [call, setCall] = useState(null);
  const [callStatus, setCallStatus] = useState('ready'); // ready, calling, connected, ended
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimer = useRef(null);

  useEffect(() => {
    initializeDevice();
    return () => {
      if (device) {
        device.destroy();
      }
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
    };
  }, []);

  const initializeDevice = async () => {
    try {
      // Get access token from your backend
      const response = await fetch(`${apiBaseUrl}/api/twilio/access-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identity: `user_${Date.now()}` })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      setAvailableNumbers(data.availableNumbers);
      if (data.availableNumbers.length > 0) {
        setSelectedFromNumber(data.availableNumbers[0].phoneNumber);
      }

      // Initialize Twilio Device
      const twilioDevice = new Device(data.token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu']
      });

      // Device event listeners
      twilioDevice.on('ready', () => {
        console.log('Twilio Device Ready');
        setCallStatus('ready');
      });

      twilioDevice.on('error', (error) => {
        console.error('Device Error:', error);
        alert(`Device Error: ${error.message}`);
      });

      twilioDevice.on('incoming', (incomingCall) => {
        console.log('Incoming call from:', incomingCall.parameters.From);
        // Handle incoming calls if needed
      });

      await twilioDevice.register();
      setDevice(twilioDevice);

    } catch (error) {
      console.error('Failed to initialize device:', error);
      alert(`Failed to initialize calling: ${error.message}`);
    }
  };

  const makeCall = async () => {
    if (!device || !phoneNumber || !selectedFromNumber) {
      alert('Please select a number and enter a phone number to call');
      return;
    }

    try {
      setCallStatus('calling');
      setCallDuration(0);

      const twilioCall = await device.connect({
        params: {
          To: phoneNumber,
          From: selectedFromNumber
        }
      });

      setCall(twilioCall);

      // Call event listeners
      twilioCall.on('accept', () => {
        console.log('Call accepted');
        setCallStatus('connected');
        startCallTimer();
      });

      twilioCall.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus('ended');
        setCall(null);
        stopCallTimer();
        
        // Auto-reset after 3 seconds
        setTimeout(() => {
          setCallStatus('ready');
          setPhoneNumber('');
        }, 3000);
      });

      twilioCall.on('error', (error) => {
        console.error('Call Error:', error);
        setCallStatus('ended');
        setCall(null);
        stopCallTimer();
        alert(`Call Error: ${error.message}`);
      });

    } catch (error) {
      console.error('Failed to make call:', error);
      setCallStatus('ready');
      alert(`Failed to make call: ${error.message}`);
    }
  };

  const hangUp = () => {
    if (call) {
      call.disconnect();
    }
  };

  const toggleMute = () => {
    if (call) {
      call.mute(!muted);
      setMuted(!muted);
    }
  };

  const adjustVolume = (newVolume) => {
    setVolume(newVolume);
    if (device) {
      device.audio.speaker(newVolume);
    }
  };

  const startCallTimer = () => {
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'ready': return 'text-green-600';
      case 'calling': return 'text-yellow-600';
      case 'connected': return 'text-blue-600';
      case 'ended': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'ready': return 'Ready to call';
      case 'calling': return 'Connecting...';
      case 'connected': return `Connected - ${formatDuration(callDuration)}`;
      case 'ended': return 'Call ended';
      default: return 'Initializing...';
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-center mb-6">📞 Make a Call</h2>
      
      {/* Status Display */}
      <div className={`text-center mb-4 font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>

      {/* From Number Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Call From:
        </label>
        <select
          value={selectedFromNumber}
          onChange={(e) => setSelectedFromNumber(e.target.value)}
          disabled={callStatus !== 'ready'}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableNumbers.map((number) => (
            <option key={number.phoneNumber} value={number.phoneNumber}>
              {number.phoneNumber} ({number.friendlyName})
            </option>
          ))}
        </select>
      </div>

      {/* Phone Number Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Call To:
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
          disabled={callStatus !== 'ready'}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Call Controls */}
      <div className="space-y-4">
        {callStatus === 'ready' && (
          <button
            onClick={makeCall}
            disabled={!phoneNumber || !selectedFromNumber}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            📞 Call {phoneNumber}
          </button>
        )}

        {(callStatus === 'calling' || callStatus === 'connected') && (
          <div className="space-y-3">
            <button
              onClick={hangUp}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              📵 Hang Up
            </button>
            
            {callStatus === 'connected' && (
              <div className="flex space-x-2">
                <button
                  onClick={toggleMute}
                  className={`flex-1 ${muted ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'} text-white font-bold py-2 px-4 rounded-lg transition-colors`}
                >
                  {muted ? '🔇 Unmute' : '🔊 Mute'}
                </button>
              </div>
            )}
          </div>
        )}

        {callStatus === 'ended' && (
          <div className="text-center text-gray-600">
            Call ended. Ready for next call in 3 seconds...
          </div>
        )}
      </div>

      {/* Volume Control */}
      {callStatus === 'connected' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => adjustVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Device Status */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        Device: {device ? '✅ Connected' : '❌ Disconnected'}
      </div>
    </div>
  );
};

export default TwilioDialer;
```

### 3. **Usage in Your App**

```jsx
import React from 'react';
import TwilioDialer from './components/TwilioDialer';

const App = () => {
  const authToken = localStorage.getItem('authToken');
  const apiBaseUrl = 'https://newrankandrentapi.onrender.com';

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <TwilioDialer 
        authToken={authToken}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
};

export default App;
```

## 🔧 **Key Differences**

### **Before (2 Calls):**
```
Your App → API Call → Twilio → TwiML → Target Phone
    ↓              ↓
  Call 1        Call 2
```

### **After (1 Call):**
```
Browser → Twilio Voice SDK → Target Phone
            ↓
         Single Call
```

## 🎯 **Features You Get**

1. **✅ Single Call** - Direct browser to target phone
2. **✅ Call Interface** - Proper UI with controls
3. **✅ Hang Up Control** - User can end calls
4. **✅ Mute/Unmute** - Audio controls
5. **✅ Volume Control** - Adjust call volume
6. **✅ Call Timer** - See call duration
7. **✅ Status Updates** - Real-time call status
8. **✅ Recording** - Still records calls automatically

## 🚀 **Setup Steps**

1. **Get Twilio API Key/Secret** from console
2. **Add new environment variables**
3. **Add access token route** to backend
4. **Update TwiML endpoint**
5. **Install Voice SDK** in frontend
6. **Implement calling component**
7. **Deploy and test**

This gives you a professional calling experience with full control! 🎉📞
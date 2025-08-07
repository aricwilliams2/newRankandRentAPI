# Twilio Voice SDK Setup - Browser Calling

This guide sets up real-time voice communication so you can talk to the people you call from your browser.

## 🎙️ What You'll Get

- ✅ **Real-time 2-way audio** - Talk to the person you called
- ✅ **Mute/unmute controls** - Control your microphone
- ✅ **Call status events** - Know when call connects/disconnects
- ✅ **Browser-based calling** - No phone needed

## 🔧 Backend Setup

### 1. Add Access Token Endpoint

Add this to your `routes/twilioRoutes.js`:

```javascript
// Generate Twilio Voice Access Token for browser calling
router.get('/access-token', auth, (req, res) => {
  try {
    const AccessToken = require('twilio').jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    console.log('🎫 Generating access token for user:', req.user.id);
    
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: `user-${req.user.id}` }
    );
    
    // Add voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });
    
    token.addGrant(voiceGrant);
    
    const jwt = token.toJwt();
    console.log('✅ Access token generated successfully');
    
    res.json({ 
      token: jwt,
      identity: `user-${req.user.id}`
    });
    
  } catch (error) {
    console.error('❌ Error generating access token:', error);
    res.status(500).json({ 
      error: 'Failed to generate access token',
      details: error.message 
    });
  }
});
```

### 2. Update TwiML Endpoint

Update your existing TwiML endpoint in `routes/twilioRoutes.js`:

```javascript
// TwiML endpoint for call handling
router.post('/twiml', (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  console.log('🎙️ TwiML request received:', {
    body: req.body,
    query: req.query
  });

  const to = req.body.To || req.query.To;
  const from = req.body.From || req.query.From;
  
  console.log(`📞 Call - From: ${from}, To: ${to}`);
  
  // Handle browser-to-phone calls
  if (to && to.startsWith('+')) {
    console.log(`🎙️ Browser calling phone number: ${to}`);
    
    const dial = twiml.dial({
      callerId: from,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: 'completed'
    });
    
    dial.number(to);
    
    console.log('✅ TwiML response generated for browser call');
  } else {
    // Handle other call types
    twiml.say('Hello from Twilio!');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});
```

## 🔧 Frontend Setup

### 1. Install Twilio Voice SDK

```bash
npm install @twilio/voice-sdk
```

### 2. Create Browser Call Component

Create `src/components/BrowserCallComponent.tsx`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import './BrowserCallComponent.css';

interface CallData {
  to: string;
  from: string;
}

const BrowserCallComponent: React.FC = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    const initDevice = async () => {
      try {
        console.log('🎙️ Initializing Twilio Device...');
        
        // Get access token from backend
        const response = await fetch('https://newrankandrentapi.onrender.com/api/twilio/access-token', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const { token } = await response.json();
        console.log('✅ Access token received');

        // Initialize device
        const dev = new Device(token, {
          debug: true,
          closeProtection: true
        });

        // Set up event listeners
        dev.on('ready', () => {
          console.log('✅ Device ready');
        });

        dev.on('connect', (conn) => {
          console.log('✅ Call connected');
          setConnection(conn);
          setIsConnected(true);
          setIsCalling(false);
          startCallTimer();
        });

        dev.on('disconnect', () => {
          console.log('📞 Call disconnected');
          setConnection(null);
          setIsConnected(false);
          stopCallTimer();
        });

        dev.on('error', (error) => {
          console.error('❌ Device error:', error);
          setError(`Device error: ${error.message}`);
        });

        setDevice(dev);

      } catch (error) {
        console.error('❌ Failed to initialize device:', error);
        setError(`Failed to initialize: ${error.message}`);
      }
    };

    initDevice();

    return () => {
      if (device) {
        device.destroy();
      }
    };
  }, []);

  const startCallTimer = () => {
    setCallDuration(0);
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    setCallDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const makeCall = async () => {
    if (!device || isCalling || isConnected) {
      return;
    }

    if (!toNumber.trim()) {
      setError('Please enter a phone number to call');
      return;
    }

    try {
      setIsCalling(true);
      setError('');
      console.log('📞 Making browser call to:', toNumber);

      // Connect to the number
      const conn = await device.connect({
        To: toNumber
      });

      console.log('✅ Call initiated');
      setConnection(conn);

    } catch (error) {
      console.error('❌ Call failed:', error);
      setError(`Call failed: ${error.message}`);
      setIsCalling(false);
    }
  };

  const hangUp = () => {
    if (connection) {
      console.log('📞 Hanging up call');
      connection.disconnect();
    }
    setConnection(null);
    setIsConnected(false);
    setIsCalling(false);
    stopCallTimer();
  };

  const toggleMute = () => {
    if (connection) {
      const muted = !connection.isMuted();
      connection.mute(muted);
      setIsMuted(muted);
      console.log(`🎤 ${muted ? 'Muted' : 'Unmuted'}`);
    }
  };

  return (
    <div className="browser-call-component">
      <div className="call-header">
        <h2>🎙️ Browser Call</h2>
        {isConnected && (
          <div className="call-status">
            <span className="status-indicator active">● Connected</span>
            <span className="call-duration">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!isConnected ? (
        // Call Setup
        <div className="call-setup">
          <div className="form-group">
            <label htmlFor="fromNumber">Call From:</label>
            <select
              id="fromNumber"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              disabled={isCalling}
            >
              <option value="">Select a phone number</option>
              <option value="+18776653167">+1 (877) 665-3167</option>
              <option value="+17122145838">+1 (712) 214-5838</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="toNumber">Call To:</label>
            <input
              type="tel"
              id="toNumber"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={isCalling}
            />
          </div>

          <button
            onClick={makeCall}
            disabled={!device || isCalling || !toNumber.trim()}
            className="call-button"
          >
            {isCalling ? '📞 Connecting...' : '🎙️ Start Call'}
          </button>
        </div>
      ) : (
        // Active Call Controls
        <div className="call-controls">
          <div className="call-info">
            <div className="call-numbers">
              <span className="from">{fromNumber}</span>
              <span className="arrow">→</span>
              <span className="to">{toNumber}</span>
            </div>
            
            <div className="call-duration">
              Duration: {formatDuration(callDuration)}
            </div>
          </div>

          <div className="control-buttons">
            <button
              onClick={toggleMute}
              className={`control-button ${isMuted ? 'muted' : ''}`}
            >
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            
            <button
              onClick={hangUp}
              className="control-button hangup"
            >
              📞 Hang Up
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="debug-info">
        <h3>Debug Information</h3>
        <p>Device Ready: {device ? '✅ Yes' : '❌ No'}</p>
        <p>Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
        <p>Calling: {isCalling ? '✅ Yes' : '❌ No'}</p>
        <p>Muted: {isMuted ? '✅ Yes' : '❌ No'}</p>
        <p>Duration: {formatDuration(callDuration)}</p>
      </div>
    </div>
  );
};

export default BrowserCallComponent;
```

### 3. Add CSS Styling

Create `src/components/BrowserCallComponent.css`:

```css
.browser-call-component {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e9ecef;
}

.call-header h2 {
  margin: 0;
  color: #2c3e50;
}

.call-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator.active {
  color: #27ae60;
  font-weight: bold;
}

.call-duration {
  font-family: monospace;
  font-size: 14px;
  color: #6c757d;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
}

.call-setup {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.call-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.call-button:hover:not(:disabled) {
  background: #0056b3;
}

.call-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.call-controls {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.call-info {
  margin-bottom: 20px;
}

.call-numbers {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}

.arrow {
  color: #6c757d;
  font-size: 20px;
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.control-button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.control-button.muted {
  background: #dc3545;
  color: white;
}

.control-button:not(.muted):not(.hangup) {
  background: #28a745;
  color: white;
}

.control-button.hangup {
  background: #dc3545;
  color: white;
}

.control-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.debug-info {
  margin-top: 30px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
}

.debug-info h3 {
  margin: 0 0 10px 0;
  color: #495057;
}

.debug-info p {
  margin: 5px 0;
  color: #6c757d;
}
```

## 🔧 Twilio Console Setup

### 1. Create API Key & Secret

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Choose **Standard** key type
5. Save the **SID** and **Secret**

### 2. Create TwiML App

1. Go to **Voice** → **TwiML Apps**
2. Click **Create new TwiML App**
3. Set **Voice URL** to: `https://newrankandrentapi.onrender.com/api/twilio/twiml`
4. Save the **SID**

### 3. Update Environment Variables

Add these to your backend environment:

```env
TWILIO_API_KEY=your_api_key_sid
TWILIO_API_SECRET=your_api_key_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
```

## 🎙️ Usage

1. **Select your phone number** to call from
2. **Enter the destination number** to call
3. **Click "Start Call"** - this will connect you via browser
4. **Talk through your microphone** - you'll hear them through your speakers
5. **Use Mute/Unmute** to control your microphone
6. **Click "Hang Up"** to end the call

## ✅ Success Indicators

You'll know it's working when:
- ✅ Device initializes without errors
- ✅ You can make a call and hear the other person
- ✅ Mute/unmute controls work
- ✅ Call duration timer works
- ✅ You can hang up successfully

Now you can talk to the people you call directly from your browser! 🗣️ 
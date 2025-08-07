# Browser Calling Implementation Guide

This guide shows how to implement real-time browser calling with Twilio Voice SDK, allowing you to talk directly through your computer's microphone and speakers.

## 🎯 What You'll Build

A React UI that allows you to:
- Make live calls from your browser
- Talk through your computer's microphone
- Hear the other person through your speakers
- Mute/unmute during calls
- Hang up calls
- See call status and duration

## 📦 Installation

```bash
npm install @twilio/voice-sdk
```

## 🔧 Backend Setup

You already have the access token endpoint, but let's enhance it:

```javascript
// routes/twilioRoutes.js - Update your existing access-token endpoint
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

## 🎙️ Frontend Implementation

### 1. Twilio Voice Service

```javascript
// services/twilioVoiceService.js
import { Device } from '@twilio/voice-sdk';

class TwilioVoiceService {
  constructor() {
    this.device = null;
    this.connection = null;
    this.token = null;
    this.baseURL = 'https://newrankandrentapi.onrender.com';
  }

  // Get auth headers
  getHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get access token from backend
  async getAccessToken(identity) {
    try {
      const response = await fetch(`${this.baseURL}/api/twilio/access-token`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ identity })
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Initialize Twilio Device
  async initializeDevice(identity = 'user') {
    try {
      // Get access token
      this.token = await this.getAccessToken(identity);
      
      // Create device
      this.device = new Device(this.token, {
        debug: true,
        enableRingingState: true,
        closeProtection: true
      });

      return this.device;
    } catch (error) {
      console.error('Error initializing device:', error);
      throw error;
    }
  }

  // Make a call
  async makeCall(toNumber, fromNumber = null) {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    const params = {
      To: toNumber
    };

    if (fromNumber) {
      params.From = fromNumber;
    }

    try {
      this.connection = await this.device.connect(params);
      return this.connection;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  // Hang up call
  hangUp() {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }

  // Mute/unmute
  toggleMute() {
    if (this.connection) {
      this.connection.mute(!this.connection.isMuted());
      return this.connection.isMuted();
    }
    return false;
  }

  // Get call status
  getCallStatus() {
    if (this.connection) {
      return this.connection.status();
    }
    return null;
  }

  // Get call duration
  getCallDuration() {
    if (this.connection) {
      return this.connection.duration;
    }
    return 0;
  }

  // Cleanup
  destroy() {
    if (this.connection) {
      this.connection.disconnect();
    }
    if (this.device) {
      this.device.destroy();
    }
    this.device = null;
    this.connection = null;
  }
}

export default new TwilioVoiceService();
```

### 2. Phone Number Validation (Reuse from previous guide)

```javascript
// utils/phoneValidation.js
export class PhoneValidator {
  // Convert to E.164 format
  static formatToE164(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1 and has 11 digits, it's already US format
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // If it has 10 digits, assume US number and add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // If it starts with 00, convert to +
    if (phoneNumber.startsWith('00')) {
      return `+${phoneNumber.substring(2)}`;
    }
    
    // Default: assume US number
    return `+1${cleaned}`;
  }

  // Validate phone number format
  static isValidPhoneNumber(phoneNumber) {
    const e164Number = this.formatToE164(phoneNumber);
    // Basic E.164 validation: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(e164Number);
  }

  // Format for display
  static formatForDisplay(phoneNumber) {
    const e164Number = this.formatToE164(phoneNumber);
    
    // US number formatting
    if (e164Number.startsWith('+1')) {
      const number = e164Number.substring(2);
      if (number.length === 10) {
        return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
      }
    }
    
    return e164Number;
  }
}
```

### 3. Browser Call Component

```jsx
// components/BrowserCallComponent.jsx
import React, { useState, useEffect, useRef } from 'react';
import twilioVoiceService from '../services/twilioVoiceService';
import { PhoneValidator } from '../utils/phoneValidation';

const BrowserCallComponent = () => {
  const [device, setDevice] = useState(null);
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, ready, calling, connected, disconnected
  const [toNumber, setToNumber] = useState('');
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const durationInterval = useRef(null);

  // Load user's phone numbers
  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  // Initialize Twilio device
  useEffect(() => {
    initializeDevice();
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      twilioVoiceService.destroy();
    };
  }, []);

  // Update call duration
  useEffect(() => {
    if (status === 'connected' && connection) {
      durationInterval.current = setInterval(() => {
        const duration = twilioVoiceService.getCallDuration();
        setCallDuration(duration);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [status, connection]);

  const loadPhoneNumbers = async () => {
    try {
      const response = await fetch('https://newrankandrentapi.onrender.com/api/twilio/my-numbers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers || []);
        
        // Auto-select first active number
        const activeNumbers = data.phoneNumbers?.filter(num => num.is_active) || [];
        if (activeNumbers.length > 0) {
          setSelectedFromNumber(activeNumbers[0].phone_number);
        }
      }
    } catch (error) {
      setError('Failed to load phone numbers: ' + error.message);
    }
  };

  const initializeDevice = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const device = await twilioVoiceService.initializeDevice();
      
      // Set up event listeners
      device.on('ready', () => {
        setStatus('ready');
        setIsLoading(false);
      });

      device.on('connect', (conn) => {
        setConnection(conn);
        setStatus('connected');
        setIsMuted(false);
      });

      device.on('disconnect', () => {
        setConnection(null);
        setStatus('ready');
        setIsMuted(false);
      });

      device.on('error', (error) => {
        console.error('Twilio Device Error:', error);
        setError('Device error: ' + error.message);
        setStatus('idle');
        setIsLoading(false);
      });

      setDevice(device);
    } catch (error) {
      console.error('Error initializing device:', error);
      setError('Failed to initialize calling: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleCall = async () => {
    try {
      setError('');
      
      // Validate phone number
      if (!PhoneValidator.isValidPhoneNumber(toNumber)) {
        throw new Error('Invalid phone number format');
      }

      if (!selectedFromNumber) {
        throw new Error('Please select a phone number to call from');
      }

      // Format phone numbers
      const formattedToNumber = PhoneValidator.formatToE164(toNumber);
      const formattedFromNumber = PhoneValidator.formatToE164(selectedFromNumber);

      setStatus('calling');
      
      // Make the call
      const conn = await twilioVoiceService.makeCall(formattedToNumber, formattedFromNumber);
      setConnection(conn);
      
    } catch (error) {
      console.error('Call failed:', error);
      setError('Failed to make call: ' + error.message);
      setStatus('ready');
    }
  };

  const handleHangUp = () => {
    twilioVoiceService.hangUp();
    setConnection(null);
    setStatus('ready');
    setToNumber('');
  };

  const handleMuteToggle = () => {
    const muted = twilioVoiceService.toggleMute();
    setIsMuted(muted);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Initializing...';
      case 'ready': return 'Ready to call';
      case 'calling': return 'Calling...';
      case 'connected': return 'Connected';
      case 'disconnected': return 'Call ended';
      default: return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'text-green-600';
      case 'calling': return 'text-yellow-600';
      case 'connected': return 'text-blue-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="browser-call-component">
      <div className="call-header">
        <h2>Browser Call</h2>
        <div className={`status ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        {status === 'connected' && (
          <div className="call-duration">
            Duration: {formatDuration(callDuration)}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-message">
          🔄 Initializing calling system...
        </div>
      )}

      <div className="call-controls">
        {/* Phone Number Selection */}
        <div className="form-group">
          <label htmlFor="fromNumber">Call From:</label>
          <select
            id="fromNumber"
            value={selectedFromNumber}
            onChange={(e) => setSelectedFromNumber(e.target.value)}
            disabled={status !== 'ready' || isLoading}
          >
            <option value="">Select a phone number</option>
            {phoneNumbers
              .filter(num => num.is_active)
              .map(number => (
                <option key={number.id} value={number.phone_number}>
                  {PhoneValidator.formatForDisplay(number.phone_number)} 
                  ({number.friendly_name || 'Unknown'})
                </option>
              ))}
          </select>
        </div>

        {/* Destination Number */}
        <div className="form-group">
          <label htmlFor="toNumber">Call To:</label>
          <input
            type="tel"
            id="toNumber"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            disabled={status !== 'ready' || isLoading}
          />
          <small>
            Enter phone number in any format. Will be converted to E.164 automatically.
          </small>
        </div>

        {/* Call Controls */}
        <div className="call-buttons">
          {status === 'ready' && (
            <button
              onClick={handleCall}
              disabled={!selectedFromNumber || !toNumber || isLoading}
              className="call-button"
            >
              📞 Make Call
            </button>
          )}

          {status === 'connected' && (
            <>
              <button
                onClick={handleMuteToggle}
                className={`mute-button ${isMuted ? 'muted' : ''}`}
              >
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              
              <button
                onClick={handleHangUp}
                className="hangup-button"
              >
                📞 Hang Up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Call Status */}
      {status === 'connected' && (
        <div className="call-status">
          <div className="call-info">
            <div className="call-numbers">
              <span className="from">
                {PhoneValidator.formatForDisplay(selectedFromNumber)}
              </span>
              <span className="arrow">→</span>
              <span className="to">
                {PhoneValidator.formatForDisplay(toNumber)}
              </span>
            </div>
            <div className="call-duration">
              {formatDuration(callDuration)}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions">
        <h3>How to use:</h3>
        <ol>
          <li>Select your phone number to call from</li>
          <li>Enter the destination phone number</li>
          <li>Click "Make Call" - your browser will ask for microphone permission</li>
          <li>Talk through your computer's microphone and speakers</li>
          <li>Use Mute/Unmute and Hang Up buttons to control the call</li>
        </ol>
      </div>
    </div>
  );
};

export default BrowserCallComponent;
```

### 4. CSS Styles

```css
/* styles/browserCall.css */
.browser-call-component {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.call-header {
  text-align: center;
  margin-bottom: 20px;
}

.call-header h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.status {
  font-weight: bold;
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #e9ecef;
  display: inline-block;
}

.call-duration {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.loading-message {
  background: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
}

.call-controls {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group small {
  color: #666;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.call-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.call-button,
.mute-button,
.hangup-button {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.call-button {
  background: #28a745;
  color: white;
}

.call-button:hover:not(:disabled) {
  background: #218838;
}

.call-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.mute-button {
  background: #ffc107;
  color: #212529;
}

.mute-button:hover {
  background: #e0a800;
}

.mute-button.muted {
  background: #dc3545;
  color: white;
}

.mute-button.muted:hover {
  background: #c82333;
}

.hangup-button {
  background: #dc3545;
  color: white;
}

.hangup-button:hover {
  background: #c82333;
}

.call-status {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.call-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.call-numbers {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}

.arrow {
  color: #666;
  font-size: 14px;
}

.from {
  color: #28a745;
  font-weight: bold;
}

.to {
  color: #007bff;
  font-weight: bold;
}

.call-duration {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.instructions {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.instructions h3 {
  margin-top: 0;
  color: #333;
}

.instructions ol {
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  color: #666;
}

/* Status colors */
.text-green-600 { color: #059669; }
.text-yellow-600 { color: #d97706; }
.text-blue-600 { color: #2563eb; }
.text-red-600 { color: #dc2626; }
.text-gray-600 { color: #4b5563; }
```

## 🔧 Environment Variables

Make sure you have these environment variables set in your backend:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_APP_SID=your_twiml_app_sid
```

## 🚀 Usage

1. **Install the Voice SDK**: `npm install @twilio/voice-sdk`
2. **Copy the components** to your React app
3. **Import and use** the `BrowserCallComponent`
4. **Test with a real phone number**

## 🎯 Features

- ✅ **Real-time 2-way audio** through browser
- ✅ **Microphone and speaker access**
- ✅ **Mute/unmute functionality**
- ✅ **Call duration timer**
- ✅ **Call status indicators**
- ✅ **Phone number validation**
- ✅ **Error handling**
- ✅ **Responsive UI**

## 🔍 Troubleshooting

### Microphone Permission
If the browser doesn't ask for microphone permission:
1. Check browser settings
2. Make sure you're on HTTPS (required for microphone access)
3. Try refreshing the page

### No Audio
1. Check your computer's microphone and speaker settings
2. Make sure the browser has permission to access audio devices
3. Check the browser console for errors

### Call Not Connecting
1. Verify your Twilio credentials
2. Check that your TwiML App is configured correctly
3. Ensure the phone numbers are in E.164 format

This implementation gives you a complete browser calling solution with real-time audio! 🎉 
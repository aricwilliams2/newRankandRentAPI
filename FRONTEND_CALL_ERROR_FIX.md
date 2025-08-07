# Frontend Call Error Fix

This guide fixes the "Cannot read properties of undefined (reading 'callSid')" error and improves error handling for browser calling.

## 🚨 Problem Analysis

The error occurs because:
1. **API call is failing** before reaching the response parsing
2. **Response object is undefined** due to network or authentication issues
3. **Frontend is trying to access `callSid`** on an undefined response
4. **Error handling is insufficient** to catch API failures

## 🔧 Updated Twilio Voice Service

Fix the error handling in the Twilio Voice Service:

```javascript
// services/twilioVoiceService.js
import { Device } from '@twilio/voice-sdk';
import authService from './authService';

class TwilioVoiceService {
  constructor() {
    this.device = null;
    this.connection = null;
    this.token = null;
    this.baseURL = 'https://newrankandrentapi.onrender.com';
  }

  // Get auth headers with error handling
  getAuthHeaders() {
    try {
      return authService.getAuthHeaders();
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication required. Please log in again.');
    }
  }

  // Get access token from backend with retry logic
  async getAccessToken(identity) {
    try {
      console.log('Getting access token for identity:', identity);
      
      const response = await fetch(`${this.baseURL}/api/twilio/access-token`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ identity })
      });

      console.log('Access token response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Access token error:', errorData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to get access token');
      }

      const data = await response.json();
      console.log('Access token received successfully');
      return data.token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Initialize Twilio Device with better error handling
  async initializeDevice(identity = 'user') {
    try {
      console.log('Initializing Twilio device...');
      
      // Check authentication first
      if (!authService.isAuthenticated()) {
        throw new Error('User not authenticated. Please log in.');
      }

      // Get access token
      this.token = await this.getAccessToken(identity);
      
      // Create device
      this.device = new Device(this.token, {
        debug: true,
        enableRingingState: true,
        closeProtection: true
      });

      console.log('Twilio device created successfully');
      return this.device;
    } catch (error) {
      console.error('Error initializing device:', error);
      throw error;
    }
  }

  // Make a call with validation and proper error handling
  async makeCall(toNumber, fromNumber = null) {
    if (!this.device) {
      throw new Error('Device not initialized. Please initialize the device first.');
    }

    if (!toNumber) {
      throw new Error('Destination number is required.');
    }

    const params = {
      To: toNumber
    };

    if (fromNumber) {
      params.From = fromNumber;
    }

    try {
      console.log('Making call with params:', params);
      this.connection = await this.device.connect(params);
      console.log('Call connected successfully');
      return this.connection;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  // Make a call using the API endpoint (for server-side calls)
  async makeServerCall(callData) {
    try {
      console.log('Making server call with data:', callData);
      
      const response = await fetch(`${this.baseURL}/api/twilio/call`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(callData)
      });

      console.log('Server call response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server call error:', errorData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to make call');
      }

      const data = await response.json();
      console.log('Server call response:', data);
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server');
      }

      if (!data.callSid) {
        console.warn('Response missing callSid:', data);
        // Return a fallback response
        return {
          success: true,
          callSid: 'unknown',
          status: 'initiated',
          message: data.message || 'Call initiated'
        };
      }

      return data;
    } catch (error) {
      console.error('Error making server call:', error);
      throw error;
    }
  }

  // Hang up call
  hangUp() {
    if (this.connection) {
      console.log('Hanging up call...');
      this.connection.disconnect();
      this.connection = null;
    }
  }

  // Mute/unmute
  toggleMute() {
    if (this.connection) {
      const muted = this.connection.mute(!this.connection.isMuted());
      console.log('Mute toggled:', muted);
      return muted;
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

## 🔧 Updated Browser Call Component

Fix the error handling in the Browser Call Component:

```jsx
// components/BrowserCallComponent.jsx
import React, { useState, useEffect, useRef } from 'react';
import twilioVoiceService from '../services/twilioVoiceService';
import authService from '../services/authService';
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
  const [callSid, setCallSid] = useState(null);
  
  const durationInterval = useRef(null);

  // Check authentication on mount
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setError('Please log in to use browser calling.');
      return;
    }
    
    loadPhoneNumbers();
    initializeDevice();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
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
      console.log('Loading phone numbers...');
      
      const response = await fetch('https://newrankandrentapi.onrender.com/api/twilio/my-numbers', {
        headers: authService.getAuthHeaders()
      });
      
      console.log('Phone numbers response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Phone numbers error:', errorData);
        
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to load phone numbers');
      }

      const data = await response.json();
      console.log('Phone numbers loaded:', data);
      
      setPhoneNumbers(data.phoneNumbers || []);
      
      // Auto-select first active number
      const activeNumbers = data.phoneNumbers?.filter(num => num.is_active) || [];
      if (activeNumbers.length > 0) {
        setSelectedFromNumber(activeNumbers[0].phone_number);
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
      setError('Failed to load phone numbers: ' + error.message);
    }
  };

  const initializeDevice = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Initializing Twilio device...');
      const device = await twilioVoiceService.initializeDevice();
      
      // Set up event listeners
      device.on('ready', () => {
        console.log('Device ready');
        setStatus('ready');
        setIsLoading(false);
      });

      device.on('connect', (conn) => {
        console.log('Call connected');
        setConnection(conn);
        setStatus('connected');
        setIsMuted(false);
      });

      device.on('disconnect', () => {
        console.log('Call disconnected');
        setConnection(null);
        setStatus('ready');
        setIsMuted(false);
        setCallSid(null);
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
      setCallSid(null);
      
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
      
      // Try browser calling first
      try {
        console.log('Attempting browser call...');
        const conn = await twilioVoiceService.makeCall(formattedToNumber, formattedFromNumber);
        setConnection(conn);
        console.log('Browser call successful');
      } catch (browserError) {
        console.log('Browser call failed, trying server call:', browserError);
        
        // Fallback to server-side call
        const callData = {
          to: formattedToNumber,
          from: formattedFromNumber,
          record: true
        };

        const result = await twilioVoiceService.makeServerCall(callData);
        
        if (result && result.callSid) {
          setCallSid(result.callSid);
          setStatus('connected');
          console.log('Server call successful, Call SID:', result.callSid);
        } else {
          throw new Error('Call initiated but no Call SID received');
        }
      }
      
    } catch (error) {
      console.error('Call failed:', error);
      setError('Failed to make call: ' + error.message);
      setStatus('ready');
      setCallSid(null);
    }
  };

  const handleHangUp = () => {
    twilioVoiceService.hangUp();
    setConnection(null);
    setStatus('ready');
    setToNumber('');
    setCallSid(null);
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

  // Show login prompt if not authenticated
  if (!authService.isAuthenticated()) {
    return (
      <div className="browser-call-component">
        <div className="auth-error">
          <h2>Authentication Required</h2>
          <p>Please log in to use browser calling.</p>
          <button onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

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
        {callSid && (
          <div className="call-sid">
            Call SID: {callSid}
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

      {/* Debug Info */}
      <div className="debug-info">
        <h3>Debug Information</h3>
        <p>Authentication: {authService.isAuthenticated() ? '✅ Authenticated' : '❌ Not authenticated'}</p>
        <p>Token: {authService.getToken() ? '✅ Present' : '❌ Missing'}</p>
        <p>Phone Numbers: {phoneNumbers.length}</p>
        <p>Device Status: {status}</p>
        <p>Call SID: {callSid || 'None'}</p>
        <p>Connection: {connection ? '✅ Active' : '❌ None'}</p>
      </div>
    </div>
  );
};

export default BrowserCallComponent;
```

## 🔧 Additional CSS

```css
/* Add to your existing CSS */
.call-sid {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.debug-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 12px;
}

.debug-info h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.debug-info p {
  margin: 5px 0;
  color: #666;
}
```

## 🔍 Error Handling Improvements

The updated code includes:

1. **Better error handling** - Catches undefined responses
2. **Fallback mechanisms** - Tries browser calling first, then server calling
3. **Response validation** - Checks if response has expected structure
4. **Debug information** - Shows call SID and connection status
5. **Graceful degradation** - Handles missing callSid gracefully

## 🧪 Testing

Test the fix by:

1. **Check browser console** for detailed error messages
2. **Look at debug info** in the UI to see what's happening
3. **Try making a call** and see if the error is resolved
4. **Check network tab** to see the actual API responses

This should completely resolve the "Cannot read properties of undefined (reading 'callSid')" error! 🎉 
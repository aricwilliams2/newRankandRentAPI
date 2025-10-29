# Frontend Dialpad Implementation Guide

This guide shows how to add a working dialpad to your browser calling component for sending DTMF tones during active calls.

## 🎯 Overview

The dialpad allows users to:
- Send DTMF (Dual-Tone Multi-Frequency) tones during active calls
- Navigate phone menus and IVR systems
- Enter PINs and passcodes
- Interact with automated phone systems

## 🔧 Implementation

### Component Structure

```tsx
import React, { useState } from 'react';
import { Device } from '@twilio/voice-sdk';

// Add this function to your BrowserCallComponent
const sendDigit = (digit: string) => {
  if (connection && isConnected) {
    try {
      connection.sendDigits(digit);
      console.log(`🔢 Sent DTMF digit: ${digit}`);
    } catch (error) {
      console.error('Failed to send digit:', error);
      setError(`Failed to send digit: ${error.message}`);
    }
  }
};
```

### Dialpad UI Component

Add this JSX inside your active call controls section:

```tsx
{/* Dialpad - Only shown when call is connected */}
{isConnected && (
  <div style={{ marginTop: '20px' }}>
    <h4 style={{ marginBottom: '15px' }}>🔢 Dialpad</h4>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: '10px',
      maxWidth: '300px',
      margin: '0 auto'
    }}>
      {/* Dialpad Buttons */}
      {[
        ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
        ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
        ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
        ['*', ''], ['0', '+'], ['#', '']
      ].map(([digit, letters]) => (
        <button
          key={digit}
          onClick={() => sendDigit(digit)}
          disabled={!isConnected}
          style={{
            backgroundColor: '#fff',
            color: '#333',
            padding: '20px 10px',
            border: '2px solid #ccc',
            borderRadius: '8px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            fontSize: '24px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            opacity: isConnected ? 1 : 0.5,
            minHeight: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseDown={(e) => {
            if (isConnected) {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }
          }}
          onMouseUp={(e) => {
            if (isConnected) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#fff';
            }
          }}
          onMouseLeave={(e) => {
            if (isConnected) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#fff';
            }
          }}
        >
          <span>{digit}</span>
          {letters && (
            <span style={{ 
              fontSize: '10px', 
              color: '#666',
              marginTop: '2px',
              fontWeight: 'normal'
            }}>
              {letters}
            </span>
          )}
        </button>
      ))}
    </div>
    <p style={{ 
      fontSize: '12px', 
      color: '#666', 
      marginTop: '10px',
      fontStyle: 'italic'
    }}>
      Tap buttons to send DTMF tones to the call
    </p>
  </div>
)}
```

## 📋 Complete Component Example

### Full BrowserCallComponent with Dialpad

```tsx
import React, { useState, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';

const BrowserCallComponent = () => {
  const [device, setDevice] = useState(null);
  const [connection, setConnection] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [callStatus, setCallStatus] = useState('idle');

  // Initialize Twilio Device
  useEffect(() => {
    // ... device initialization code ...
  }, []);

  const makeCall = async () => {
    // ... call setup code ...
  };

  const hangUp = () => {
    // ... hang up code ...
  };

  const toggleMute = () => {
    // ... mute toggle code ...
  };

  // NEW: Send DTMF digit function
  const sendDigit = (digit: string) => {
    if (connection && isConnected) {
      try {
        connection.sendDigits(digit);
        console.log(`🔢 Sent DTMF digit: ${digit}`);
      } catch (error) {
        console.error('Failed to send digit:', error);
        setError(`Failed to send digit: ${error.message}`);
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h2>🎙️ Browser Call</h2>
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '10px'
        }}>
          ❌ {error}
        </div>
      )}
      
      {/* Status Display */}
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '10px', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <p><strong>Status:</strong> {callStatus}</p>
        <p><strong>Device Ready:</strong> {device ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Muted:</strong> {isMuted ? '✅ Yes' : '❌ No'}</p>
      </div>
      
      {!isConnected ? (
        // Call Setup UI
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="toNumber" style={{ display: 'block', marginBottom: '5px' }}>
              Phone Number to Call:
            </label>
            <input
              id="toNumber"
              type="tel"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={isCalling}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          
          <button 
            onClick={makeCall} 
            disabled={!device || isCalling || !toNumber.trim()}
            style={{
              backgroundColor: isCalling ? '#ccc' : '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: isCalling ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isCalling ? '📞 Connecting...' : '🎙️ Start Call'}
          </button>
        </div>
      ) : (
        // Active Call Controls with Dialpad
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '5px',
          textAlign: 'center'
        }}>
          <h3>📞 Connected to {toNumber}</h3>
          
          {/* Call Control Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
            <button 
              onClick={toggleMute}
              style={{
                backgroundColor: isMuted ? '#dc3545' : '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            <button 
              onClick={hangUp}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📞 Hang Up
            </button>
          </div>

          {/* Dialpad */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '15px' }}>🔢 Dialpad</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '10px',
              maxWidth: '300px',
              margin: '0 auto'
            }}>
              {[
                ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
                ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
                ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
                ['*', ''], ['0', '+'], ['#', '']
              ].map(([digit, letters]) => (
                <button
                  key={digit}
                  onClick={() => sendDigit(digit)}
                  disabled={!isConnected}
                  style={{
                    backgroundColor: '#fff',
                    color: '#333',
                    padding: '20px 10px',
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s',
                    opacity: isConnected ? 1 : 0.5,
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseDown={(e) => {
                    if (isConnected) {
                      e.currentTarget.style.transform = 'scale(0.95)';
                      e.currentTarget.style.backgroundColor = '#e0e0e0';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isConnected) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isConnected) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  <span>{digit}</span>
                  {letters && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#666',
                      marginTop: '2px',
                      fontWeight: 'normal'
                    }}>
                      {letters}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '10px',
              fontStyle: 'italic'
            }}>
              Tap buttons to send DTMF tones to the call
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserCallComponent;
```

## 🎨 Styling Options

### Material-UI Version

If you're using Material-UI:

```tsx
import { Button, Grid, Box, Typography } from '@mui/material';

// Dialpad with Material-UI
<Box sx={{ mt: 2 }}>
  <Typography variant="h6" gutterBottom>🔢 Dialpad</Typography>
  <Grid container spacing={1} sx={{ maxWidth: 300, mx: 'auto' }}>
    {[
      ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
      ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
      ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
      ['*', ''], ['0', '+'], ['#', '']
    ].map(([digit, letters]) => (
      <Grid item xs={4} key={digit}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => sendDigit(digit)}
          disabled={!isConnected}
          sx={{
            minHeight: 60,
            fontSize: '24px',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': {
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          {digit}
          {letters && (
            <Typography variant="caption" sx={{ fontSize: '10px', mt: 0.5 }}>
              {letters}
            </Typography>
          )}
        </Button>
      </Grid>
    ))}
  </Grid>
</Box>
```

## 🔍 Key Features

### 1. DTMF Tone Sending
- Uses Twilio's `connection.sendDigits(digit)` method
- Sends individual digits as DTMF tones
- Works with IVR systems, voicemail, and automated menus

### 2. Visual Feedback
- Button press animation (scale down)
- Hover effects
- Disabled state when not connected
- Clear visual hierarchy

### 3. Traditional Phone Layout
- 3x4 grid layout (standard phone dialpad)
- Letter associations on buttons (2=ABC, etc.)
- Includes *, 0, and # keys

### 4. State Management
- Only enabled when call is connected
- Disabled during call setup or when disconnected
- Visual opacity changes based on state

## 📱 Usage Examples

### Navigate IVR Menu
```
Call connects → Press 1 → Press 2 → Navigate menu
```

### Enter PIN
```
Call connects → Press 1 → Press 2 → Press 3 → Press 4 → Enter PIN
```

### Access Voicemail
```
Call connects → Press * → Enter password → Access voicemail
```

## 🐛 Troubleshooting

### Dialpad Not Working

**Problem:** Buttons don't send digits

**Solutions:**
1. Verify call is connected (`isConnected === true`)
2. Check connection object exists (`connection !== null`)
3. Verify Twilio Voice SDK is loaded
4. Check browser console for errors

### Digits Not Received

**Problem:** DTMF tones sent but not received by remote system

**Solutions:**
1. Ensure call is active (not disconnected)
2. Verify remote system supports DTMF
3. Check network connection
4. Try sending digits slower (with delays)

### Visual Issues

**Problem:** Dialpad doesn't appear or looks wrong

**Solutions:**
1. Check CSS grid support
2. Verify `isConnected` state is true
3. Check parent container styles
4. Ensure React state updates correctly

## 💡 Advanced Features

### Send Multiple Digits

```tsx
const sendMultipleDigits = (digits: string) => {
  if (connection && isConnected) {
    // Send all digits at once
    connection.sendDigits(digits);
  }
};

// Usage: Send PIN "1234"
<button onClick={() => sendMultipleDigits('1234')}>
  Send PIN
</button>
```

### Add Keypad Sounds

```tsx
const playTone = (digit: string) => {
  // Play local audio feedback
  const audio = new Audio(`/sounds/dtmf-${digit}.mp3`);
  audio.play().catch(() => {}); // Ignore errors
};

const sendDigit = (digit: string) => {
  playTone(digit); // Play sound
  if (connection && isConnected) {
    connection.sendDigits(digit);
  }
};
```

### Keyboard Support

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (isConnected && connection) {
      const key = e.key;
      if (/[0-9*#]/.test(key)) {
        sendDigit(key);
      }
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isConnected, connection]);
```

## ✅ Testing Checklist

- [ ] Dialpad appears when call connects
- [ ] Dialpad hides when call ends
- [ ] Buttons are disabled when not connected
- [ ] Digits send correctly (check console logs)
- [ ] Visual feedback works (button press animation)
- [ ] Works with IVR systems
- [ ] Works for entering PINs
- [ ] Error handling works (try disconnecting mid-call)

## 🎯 Best Practices

1. **Always check connection state** before sending digits
2. **Provide visual feedback** for user actions
3. **Handle errors gracefully** (catch sendDigits errors)
4. **Log digit sending** for debugging
5. **Disable dialpad** when not connected
6. **Keep dialpad UI simple** and intuitive

## 📚 API Reference

### Twilio Connection.sendDigits()

```typescript
connection.sendDigits(digit: string): void
```

**Parameters:**
- `digit`: Single digit string ('0'-'9', '*', '#')

**Throws:**
- Error if connection is not active
- Error if digit is invalid

**Example:**
```typescript
// Send single digit
connection.sendDigits('1');

// Send multiple digits (sequence)
connection.sendDigits('1234');
```

## 🔗 Related Documentation

- [Twilio Voice SDK DTMF Documentation](https://www.twilio.com/docs/voice/twiml/say#dtmf)
- [Twilio Connection.sendDigits()](https://www.twilio.com/docs/voice/javascript/connection#send-digits)
- [DTMF Tone Standards](https://en.wikipedia.org/wiki/Dual-tone_multi-frequency_signaling)

## 🚀 Quick Start

1. Copy the `sendDigit` function to your component
2. Add the dialpad JSX to your active call UI
3. Test by calling a number with an IVR system
4. Use dialpad to navigate menus

The dialpad is now ready to use! 🎉


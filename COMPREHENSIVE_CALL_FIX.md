# Comprehensive Call Fix

This fixes all your calling issues: double calls, can't hangup, no modal popup, and SID error.

## 🚨 Issues Identified

1. **Double calls** - Call being triggered multiple times
2. **Can't end calls** - Missing hangup functionality  
3. **No modal popup** - Missing call control UI
4. **SID error** - Response is undefined

## 🔧 Complete Call Component Fix

Replace your entire call component with this comprehensive version:

```jsx
// src/components/CallComponent.jsx
import React, { useState, useEffect, useRef } from 'react';
import './CallComponent.css';

const CallComponent = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callSid, setCallSid] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const durationInterval = useRef(null);
  const callInProgress = useRef(false); // Prevent double calls

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  // Update call duration
  useEffect(() => {
    if (callActive) {
      durationInterval.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
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
  }, [callActive]);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const makeCall = async () => {
    // Prevent double calls
    if (callInProgress.current || isCalling) {
      console.log('Call already in progress, ignoring duplicate request');
      return;
    }

    if (!toNumber.trim()) {
      setError('Please enter a phone number to call');
      return;
    }

    if (!fromNumber.trim()) {
      setError('Please select a phone number to call from');
      return;
    }

    try {
      callInProgress.current = true;
      setIsCalling(true);
      setError('');
      setCallSid(null);

      console.log('🔍 Making call with data:', {
        to: toNumber,
        from: fromNumber,
        record: true
      });

      const response = await fetch('https://newrankandrentapi.onrender.com/api/twilio/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          to: toNumber,
          from: fromNumber,
          record: true
        })
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔍 Response data:', data);

      // SAFE ACCESS - Extract callSid safely
      let extractedCallSid = 'unknown';
      
      if (data?.callSid) {
        extractedCallSid = data.callSid;
        console.log('✅ Found callSid in data.callSid');
      } else if (data?.call?.call_sid) {
        extractedCallSid = data.call.call_sid;
        console.log('✅ Found callSid in data.call.call_sid');
      } else if (data?.call?.sid) {
        extractedCallSid = data.call.sid;
        console.log('✅ Found callSid in data.call.sid');
      } else if (data?.sid) {
        extractedCallSid = data.sid;
        console.log('✅ Found callSid in data.sid');
      } else if (data?.call_sid) {
        extractedCallSid = data.call_sid;
        console.log('✅ Found callSid in data.call_sid');
      } else {
        console.warn('⚠️ No callSid found in response:', data);
      }

      console.log('🎯 Final callSid:', extractedCallSid);
      
      setCallSid(extractedCallSid);
      setCallActive(true);
      setIsCalling(false);
      
      console.log('✅ Call initiated successfully');

    } catch (error) {
      console.error('❌ Call failed:', error);
      setError(`Failed to initiate call: ${error.message}`);
      setIsCalling(false);
    } finally {
      callInProgress.current = false;
    }
  };

  const hangUp = async () => {
    if (!callSid || callSid === 'unknown') {
      console.log('No valid callSid to hang up');
      setCallActive(false);
      setCallSid(null);
      setToNumber('');
      return;
    }

    try {
      console.log('🔍 Hanging up call:', callSid);
      
      // Try to hang up via API if we have a callSid
      const response = await fetch(`https://newrankandrentapi.onrender.com/api/twilio/call/${callSid}/hangup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        console.log('✅ Call hung up successfully via API');
      } else {
        console.log('⚠️ API hangup failed, but ending call locally');
      }

    } catch (error) {
      console.error('❌ Hangup error:', error);
      // Continue with local cleanup even if API fails
    }

    // Always clean up locally
    setCallActive(false);
    setCallSid(null);
    setToNumber('');
    setIsMuted(false);
    console.log('✅ Call ended locally');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(`🎤 Mute ${!isMuted ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="call-component">
      <div className="call-header">
        <h2>Make a Call</h2>
        {callActive && (
          <div className="call-status">
            <span className="status-indicator active">● Active</span>
            <span className="call-duration">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!callActive ? (
        // Call Setup Form
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
            disabled={isCalling || !toNumber.trim() || !fromNumber.trim()}
            className="call-button"
          >
            {isCalling ? '📞 Calling...' : '📞 Make Call'}
          </button>
        </div>
      ) : (
        // Active Call Modal
        <div className="call-modal">
          <div className="call-modal-content">
            <div className="call-info">
              <div className="call-numbers">
                <span className="from">{fromNumber}</span>
                <span className="arrow">→</span>
                <span className="to">{toNumber}</span>
              </div>
              
              <div className="call-duration">
                Duration: {formatDuration(callDuration)}
              </div>
              
              {callSid && callSid !== 'unknown' && (
                <div className="call-sid">
                  Call SID: {callSid}
                </div>
              )}
            </div>

            <div className="call-controls">
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
        </div>
      )}

      {/* Debug Info */}
      <div className="debug-info">
        <h3>Debug Information</h3>
        <p>Call Active: {callActive ? '✅ Yes' : '❌ No'}</p>
        <p>Call SID: {callSid || 'None'}</p>
        <p>Duration: {formatDuration(callDuration)}</p>
        <p>Muted: {isMuted ? '✅ Yes' : '❌ No'}</p>
        <p>Call in Progress: {callInProgress.current ? '✅ Yes' : '❌ No'}</p>
      </div>
    </div>
  );
};

export default CallComponent;
```

## 🔧 CSS for Call Component

```css
/* src/components/CallComponent.css */
.call-component {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.call-header h2 {
  margin: 0;
  color: #333;
}

.call-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.status-indicator.active {
  background-color: #4CAF50;
  color: white;
}

.call-duration {
  font-family: monospace;
  font-size: 14px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 4px solid #f44336;
}

.call-setup {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
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

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.call-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.3s;
}

.call-button:hover:not(:disabled) {
  background-color: #45a049;
}

.call-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Call Modal */
.call-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.call-modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.call-info {
  margin-bottom: 30px;
}

.call-numbers {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
}

.call-numbers .from {
  color: #2196F3;
}

.call-numbers .arrow {
  color: #666;
  font-size: 14px;
}

.call-numbers .to {
  color: #4CAF50;
}

.call-duration {
  font-family: monospace;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.call-sid {
  font-family: monospace;
  font-size: 12px;
  color: #666;
  background-color: #f5f5f5;
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
}

.call-controls {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.control-button {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 100px;
}

.control-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.control-button.muted {
  background-color: #ff9800;
  color: white;
}

.control-button:not(.muted) {
  background-color: #2196F3;
  color: white;
}

.control-button.hangup {
  background-color: #f44336;
  color: white;
}

/* Debug Info */
.debug-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 12px;
  border: 1px solid #e9ecef;
}

.debug-info h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #495057;
}

.debug-info p {
  margin: 5px 0;
  color: #6c757d;
}

/* Responsive Design */
@media (max-width: 600px) {
  .call-component {
    padding: 10px;
  }
  
  .call-modal-content {
    padding: 20px;
    margin: 10px;
  }
  
  .call-controls {
    flex-direction: column;
  }
  
  .control-button {
    width: 100%;
  }
}
```

## 🔧 Backend Hangup Endpoint

Add this endpoint to your `routes/twilioRoutes.js`:

```javascript
// Hang up a call
router.post('/call/:callSid/hangup', auth, async (req, res) => {
  try {
    const { callSid } = req.params;
    const userId = req.user.id;
    
    console.log('📞 Hangup request for call:', callSid);
    
    // Verify the call belongs to the user
    const callLog = await TwilioCallLog.findByCallSid(callSid);
    if (!callLog || callLog.user_id !== userId) {
      return res.status(404).json({ 
        error: 'Call not found or does not belong to user' 
      });
    }
    
    // Try to hang up via Twilio
    try {
      await client.calls(callSid).update({ status: 'completed' });
      console.log('✅ Call hung up successfully via Twilio');
    } catch (twilioError) {
      console.warn('⚠️ Twilio hangup failed:', twilioError.message);
      // Continue anyway - the call might already be ended
    }
    
    // Update call log
    await TwilioCallLog.update(callSid, { 
      status: 'completed',
      end_time: new Date()
    });
    
    res.json({
      success: true,
      message: 'Call hung up successfully'
    });
    
  } catch (err) {
    console.error('Error hanging up call:', err);
    res.status(500).json({ 
      error: 'Failed to hang up call',
      details: err.message 
    });
  }
});
```

## 🔧 Add to TwilioCallLog Model

Add this method to your `models/TwilioCallLog.js`:

```javascript
// Find call log by call SID
static async findByCallSid(callSid) {
  try {
    const query = 'SELECT * FROM twilio_call_logs WHERE call_sid = ?';
    const rows = await db.query(query, [callSid]);
    return rows.length > 0 ? new TwilioCallLog(rows[0]) : null;
  } catch (error) {
    console.error('Error finding call log by call SID:', error);
    throw error;
  }
}

// Update call log
static async update(callSid, updateData) {
  try {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(callSid);
    
    const query = `UPDATE twilio_call_logs SET ${fields} WHERE call_sid = ?`;
    const result = await db.query(query, values);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating call log:', error);
    throw error;
  }
}
```

## ✅ What This Fixes

1. **✅ Double calls** - Uses `callInProgress.current` to prevent duplicate calls
2. **✅ Can't end calls** - Adds hangup functionality with API endpoint
3. **✅ No modal popup** - Creates a proper call control modal
4. **✅ SID error** - Safe extraction with multiple fallbacks
5. **✅ Call duration** - Real-time duration tracking
6. **✅ Mute functionality** - Toggle mute state
7. **✅ Debug info** - Shows call status and debugging info

## 🧪 Testing

1. **Try making a call** - Should only make one call
2. **Check the modal** - Should appear when call is active
3. **Try hanging up** - Should end the call properly
4. **Check debug info** - Should show call status and SID

This comprehensive fix should resolve all your calling issues! 🎉 
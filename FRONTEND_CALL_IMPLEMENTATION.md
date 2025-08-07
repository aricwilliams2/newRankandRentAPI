# Frontend Call Implementation Guide

This guide shows how to properly implement call functionality in your frontend application to avoid the "Failed to transform call data" error.

## 🚨 Common Issues

The "Failed to transform call data" error typically occurs when:
- Phone numbers are not in E.164 format
- Missing or invalid authentication
- Incorrect API endpoint URLs
- Malformed request data

## 📞 API Endpoints

### Base URL
```
https://newrankandrentapi.onrender.com
```

### Call Endpoints
- `POST /api/twilio/call` - Make a call
- `GET /api/twilio/my-numbers` - Get user's phone numbers
- `GET /api/twilio/call-logs` - Get call history

## 🔧 Frontend Implementation

### 1. API Service Layer

```javascript
// services/twilioApi.js
class TwilioApiService {
  constructor() {
    this.baseURL = 'https://newrankandrentapi.onrender.com';
    this.token = localStorage.getItem('authToken');
  }

  // Get auth headers
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Make a call
  async makeCall(callData) {
    try {
      const response = await fetch(`${this.baseURL}/api/twilio/call`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(callData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Call failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Call error:', error);
      throw error;
    }
  }

  // Get user's phone numbers
  async getUserNumbers() {
    try {
      const response = await fetch(`${this.baseURL}/api/twilio/my-numbers`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching numbers:', error);
      throw error;
    }
  }

  // Get call logs
  async getCallLogs(page = 1, limit = 20) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/twilio/call-logs?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch call logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw error;
    }
  }
}

export default new TwilioApiService();
```

### 2. Phone Number Validation

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

### 3. Call Component Implementation

```jsx
// components/CallComponent.jsx
import React, { useState, useEffect } from 'react';
import twilioApi from '../services/twilioApi';
import { PhoneValidator } from '../utils/phoneValidation';

const CallComponent = () => {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load user's phone numbers
  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  const loadPhoneNumbers = async () => {
    try {
      const response = await twilioApi.getUserNumbers();
      setPhoneNumbers(response.phoneNumbers || []);
      
      // Auto-select first active number
      const activeNumbers = response.phoneNumbers?.filter(num => num.is_active) || [];
      if (activeNumbers.length > 0) {
        setSelectedFromNumber(activeNumbers[0].phone_number);
      }
    } catch (error) {
      setError('Failed to load phone numbers: ' + error.message);
    }
  };

  const handleCall = async () => {
    // Reset states
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Validate phone numbers
      if (!PhoneValidator.isValidPhoneNumber(toNumber)) {
        throw new Error('Invalid destination phone number format');
      }

      if (!selectedFromNumber) {
        throw new Error('Please select a phone number to call from');
      }

      // Format phone numbers to E.164
      const formattedToNumber = PhoneValidator.formatToE164(toNumber);
      const formattedFromNumber = PhoneValidator.formatToE164(selectedFromNumber);

      // Prepare call data
      const callData = {
        to: formattedToNumber,
        from: formattedFromNumber,
        record: true
      };

      console.log('Making call with data:', callData);

      // Make the call
      const result = await twilioApi.makeCall(callData);

      setSuccess(`Call initiated successfully! Call SID: ${result.callSid}`);
      
      // Clear the form
      setToNumber('');
      
    } catch (error) {
      console.error('Call failed:', error);
      setError(`Failed to initiate call: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberChange = (e) => {
    const value = e.target.value;
    setToNumber(value);
    
    // Auto-format as user types
    if (value.length > 0) {
      const formatted = PhoneValidator.formatForDisplay(value);
      if (formatted !== value) {
        // Don't update if it would cause cursor jumping
        // Just validate the format
      }
    }
  };

  return (
    <div className="call-component">
      <h2>Make a Call</h2>
      
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          ✅ {success}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="fromNumber">Call From:</label>
        <select
          id="fromNumber"
          value={selectedFromNumber}
          onChange={(e) => setSelectedFromNumber(e.target.value)}
          disabled={isLoading}
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

      <div className="form-group">
        <label htmlFor="toNumber">Call To:</label>
        <input
          type="tel"
          id="toNumber"
          value={toNumber}
          onChange={handleNumberChange}
          placeholder="+1 (555) 123-4567"
          disabled={isLoading}
        />
        <small>
          Enter phone number in any format. Will be converted to E.164 automatically.
        </small>
      </div>

      <button
        onClick={handleCall}
        disabled={isLoading || !selectedFromNumber || !toNumber}
        className="call-button"
      >
        {isLoading ? 'Initiating Call...' : '📞 Make Call'}
      </button>

      <div className="phone-numbers-info">
        <h3>Your Phone Numbers</h3>
        {phoneNumbers.length === 0 ? (
          <p>No phone numbers available. Please purchase a number first.</p>
        ) : (
          <div className="numbers-grid">
            {phoneNumbers.map(number => (
              <div key={number.id} className="number-card">
                <div className="number">{PhoneValidator.formatForDisplay(number.phone_number)}</div>
                <div className="status">{number.is_active ? '✅ Active' : '❌ Inactive'}</div>
                <div className="name">{number.friendly_name || 'Unknown'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallComponent;
```

### 4. Call History Component

```jsx
// components/CallHistory.jsx
import React, { useState, useEffect } from 'react';
import twilioApi from '../services/twilioApi';
import { PhoneValidator } from '../utils/phoneValidation';

const CallHistory = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCallLogs();
  }, [page]);

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      const response = await twilioApi.getCallLogs(page, 20);
      setCallLogs(response.callLogs || []);
    } catch (error) {
      setError('Failed to load call history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div>Loading call history...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="call-history">
      <h2>Call History</h2>
      
      {callLogs.length === 0 ? (
        <p>No calls found.</p>
      ) : (
        <div className="calls-list">
          {callLogs.map(call => (
            <div key={call.call_sid} className="call-item">
              <div className="call-info">
                <div className="numbers">
                  <span className="from">
                    {PhoneValidator.formatForDisplay(call.from_number)}
                  </span>
                  <span className="arrow">→</span>
                  <span className="to">
                    {PhoneValidator.formatForDisplay(call.to_number)}
                  </span>
                </div>
                
                <div className="call-details">
                  <span className={`status status-${call.status}`}>
                    {call.status}
                  </span>
                  <span className="duration">
                    {formatDuration(call.duration)}
                  </span>
                  <span className="date">
                    {formatDate(call.created_at)}
                  </span>
                </div>
              </div>
              
              {call.recording_url && (
                <div className="recording">
                  <audio controls>
                    <source 
                      src={`https://newrankandrentapi.onrender.com/api/twilio/recording-audio/${call.recording_sid}?token=${localStorage.getItem('authToken')}`} 
                      type="audio/mpeg" 
                    />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallHistory;
```

### 5. CSS Styles

```css
/* styles/call.css */
.call-component {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
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
}

.call-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
}

.call-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.number-card {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 4px;
  background: #f9f9f9;
}

.number-card .number {
  font-weight: bold;
  font-size: 16px;
}

.number-card .status {
  margin-top: 5px;
  font-size: 12px;
}

.number-card .name {
  margin-top: 5px;
  color: #666;
  font-size: 14px;
}

/* Call History Styles */
.call-history {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.call-item {
  border: 1px solid #ddd;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 4px;
}

.call-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.numbers {
  display: flex;
  align-items: center;
  gap: 10px;
}

.arrow {
  color: #666;
}

.call-details {
  display: flex;
  gap: 15px;
  font-size: 14px;
}

.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-failed {
  background: #f8d7da;
  color: #721c24;
}

.status-in-progress {
  background: #fff3cd;
  color: #856404;
}

.recording {
  margin-top: 10px;
}

.recording audio {
  width: 100%;
}
```

## 🔍 Troubleshooting

### "Failed to transform call data" Error

This error usually means:

1. **Invalid phone number format** - Ensure numbers are in E.164 format
2. **Missing authentication** - Check that the auth token is valid
3. **Invalid "from" number** - The number must be owned by your account
4. **Network issues** - Check API connectivity

### Debug Steps:

1. **Check phone number format**:
   ```javascript
   console.log('Formatted numbers:', {
     to: PhoneValidator.formatToE164(toNumber),
     from: PhoneValidator.formatToE164(selectedFromNumber)
   });
   ```

2. **Verify authentication**:
   ```javascript
   console.log('Auth token:', localStorage.getItem('authToken'));
   ```

3. **Check API response**:
   ```javascript
   const response = await fetch('/api/twilio/call', {
     method: 'POST',
     headers: headers,
     body: JSON.stringify(callData)
   });
   console.log('Response status:', response.status);
   const result = await response.json();
   console.log('Response body:', result);
   ```

## ✅ Best Practices

1. **Always validate phone numbers** before sending to API
2. **Use E.164 format** for all phone numbers
3. **Handle errors gracefully** with user-friendly messages
4. **Show loading states** during API calls
5. **Validate user input** before making requests
6. **Test with different phone number formats**

## 🚀 Quick Test

Test your implementation with these phone numbers:

```javascript
// Valid US numbers (will be converted to E.164)
const testNumbers = [
  '555-123-4567',
  '(555) 123-4567',
  '5551234567',
  '+1-555-123-4567',
  '+15551234567'
];

// All should become: +15551234567
```

This implementation should resolve the "Failed to transform call data" error and provide a robust calling interface. 
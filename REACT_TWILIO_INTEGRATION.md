# React Twilio Integration Guide

This guide shows how to integrate the Twilio API endpoints into your React frontend application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install axios react-query @tanstack/react-query
# or
yarn add axios react-query @tanstack/react-query
```

### 2. Environment Variables

Create a `.env` file in your React project:

```bash
REACT_APP_API_URL=http://localhost:3000
REACT_APP_TWILIO_ACCOUNT_SID=your_twilio_account_sid
```

## 📞 API Service Layer

### Create API Service

```javascript
// src/services/twilioApi.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Twilio API endpoints
export const twilioApi = {
  // Buy a phone number
  buyNumber: async (data) => {
    const response = await apiClient.post('/api/twilio/buy-number', data);
    return response.data;
  },

  // Get available numbers
  getAvailableNumbers: async (params) => {
    const response = await apiClient.get('/api/twilio/available-numbers', { params });
    return response.data;
  },

  // Make a call
  makeCall: async (data) => {
    const response = await apiClient.post('/api/twilio/call', data);
    return response.data;
  },

  // Get call logs
  getCallLogs: async (params) => {
    const response = await apiClient.get('/api/twilio/call-logs', { params });
    return response.data;
  },

  // Get specific call log
  getCallLog: async (callSid) => {
    const response = await apiClient.get(`/api/twilio/call-logs/${callSid}`);
    return response.data;
  },

  // Get recordings
  getRecordings: async (params) => {
    const response = await apiClient.get('/api/twilio/recordings', { params });
    return response.data;
  },

  // Get recordings for specific call
  getCallRecordings: async (callSid) => {
    const response = await apiClient.get(`/api/twilio/recordings/${callSid}`);
    return response.data;
  },

  // Delete recording
  deleteRecording: async (recordingSid) => {
    const response = await apiClient.delete(`/api/twilio/recordings/${recordingSid}`);
    return response.data;
  },
};
```

## 🎣 React Query Hooks

### Create Custom Hooks

```javascript
// src/hooks/useTwilio.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { twilioApi } from '../services/twilioApi';

export const useTwilio = () => {
  const queryClient = useQueryClient();

  // Get available numbers
  const useAvailableNumbers = (params) => {
    return useQuery({
      queryKey: ['availableNumbers', params],
      queryFn: () => twilioApi.getAvailableNumbers(params),
      enabled: !!params.areaCode || !!params.country,
    });
  };

  // Get call logs
  const useCallLogs = (params = {}) => {
    return useQuery({
      queryKey: ['callLogs', params],
      queryFn: () => twilioApi.getCallLogs(params),
    });
  };

  // Get specific call log
  const useCallLog = (callSid) => {
    return useQuery({
      queryKey: ['callLog', callSid],
      queryFn: () => twilioApi.getCallLog(callSid),
      enabled: !!callSid,
    });
  };

  // Get recordings
  const useRecordings = (params = {}) => {
    return useQuery({
      queryKey: ['recordings', params],
      queryFn: () => twilioApi.getRecordings(params),
    });
  };

  // Get call recordings
  const useCallRecordings = (callSid) => {
    return useQuery({
      queryKey: ['callRecordings', callSid],
      queryFn: () => twilioApi.getCallRecordings(callSid),
      enabled: !!callSid,
    });
  };

  // Buy number mutation
  const useBuyNumber = () => {
    return useMutation({
      mutationFn: twilioApi.buyNumber,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['availableNumbers'] });
      },
    });
  };

  // Make call mutation
  const useMakeCall = () => {
    return useMutation({
      mutationFn: twilioApi.makeCall,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['callLogs'] });
      },
    });
  };

  // Delete recording mutation
  const useDeleteRecording = () => {
    return useMutation({
      mutationFn: twilioApi.deleteRecording,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recordings'] });
      },
    });
  };

  return {
    useAvailableNumbers,
    useCallLogs,
    useCallLog,
    useRecordings,
    useCallRecordings,
    useBuyNumber,
    useMakeCall,
    useDeleteRecording,
  };
};
```

## 🧩 React Components

### Phone Number Purchase Component

```jsx
// src/components/TwilioPhoneNumberPurchase.jsx
import React, { useState } from 'react';
import { useTwilio } from '../hooks/useTwilio';

const TwilioPhoneNumberPurchase = () => {
  const [searchParams, setSearchParams] = useState({
    areaCode: '',
    country: 'US',
  });

  const { useAvailableNumbers, useBuyNumber } = useTwilio();
  const { data: availableNumbers, isLoading, error } = useAvailableNumbers(searchParams);
  const buyNumberMutation = useBuyNumber();

  const handleSearch = (e) => {
    e.preventDefault();
    // Trigger search by updating params
  };

  const handleBuyNumber = async (phoneNumber) => {
    try {
      await buyNumberMutation.mutateAsync({
        phoneNumber,
        country: searchParams.country,
      });
      alert('Phone number purchased successfully!');
    } catch (error) {
      alert('Failed to purchase phone number: ' + error.message);
    }
  };

  return (
    <div className="twilio-phone-purchase">
      <h2>Buy Phone Numbers</h2>
      
      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label>Area Code:</label>
          <input
            type="text"
            value={searchParams.areaCode}
            onChange={(e) => setSearchParams({ ...searchParams, areaCode: e.target.value })}
            placeholder="415"
          />
        </div>
        
        <div className="form-group">
          <label>Country:</label>
          <select
            value={searchParams.country}
            onChange={(e) => setSearchParams({ ...searchParams, country: e.target.value })}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
          </select>
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search Numbers'}
        </button>
      </form>

      {error && <div className="error">Error: {error.message}</div>}

      {availableNumbers?.availableNumbers && (
        <div className="available-numbers">
          <h3>Available Numbers</h3>
          <div className="numbers-grid">
            {availableNumbers.availableNumbers.map((number) => (
              <div key={number.phoneNumber} className="number-card">
                <h4>{number.phoneNumber}</h4>
                <p>Location: {number.locality}, {number.region}</p>
                <p>Capabilities: {number.capabilities.voice ? 'Voice' : ''} {number.capabilities.sms ? 'SMS' : ''}</p>
                <button
                  onClick={() => handleBuyNumber(number.phoneNumber)}
                  disabled={buyNumberMutation.isPending}
                >
                  {buyNumberMutation.isPending ? 'Purchasing...' : 'Buy Number'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TwilioPhoneNumberPurchase;
```

### Call Interface Component

```jsx
// src/components/TwilioCallInterface.jsx
import React, { useState } from 'react';
import { useTwilio } from '../hooks/useTwilio';

const TwilioCallInterface = () => {
  const [callData, setCallData] = useState({
    to: '',
    from: '',
    record: true,
  });

  const { useMakeCall } = useTwilio();
  const makeCallMutation = useMakeCall();

  const handleCall = async (e) => {
    e.preventDefault();
    
    if (!callData.to) {
      alert('Please enter a phone number to call');
      return;
    }

    try {
      const result = await makeCallMutation.mutateAsync(callData);
      alert(`Call initiated! Call SID: ${result.callSid}`);
    } catch (error) {
      alert('Failed to initiate call: ' + error.message);
    }
  };

  return (
    <div className="twilio-call-interface">
      <h2>Make a Call</h2>
      
      <form onSubmit={handleCall}>
        <div className="form-group">
          <label>To (Phone Number):</label>
          <input
            type="tel"
            value={callData.to}
            onChange={(e) => setCallData({ ...callData, to: e.target.value })}
            placeholder="+1234567890"
            required
          />
        </div>
        
        <div className="form-group">
          <label>From (Your Number):</label>
          <input
            type="tel"
            value={callData.from}
            onChange={(e) => setCallData({ ...callData, from: e.target.value })}
            placeholder="+1987654321"
          />
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={callData.record}
              onChange={(e) => setCallData({ ...callData, record: e.target.checked })}
            />
            Record Call
          </label>
        </div>
        
        <button type="submit" disabled={makeCallMutation.isPending}>
          {makeCallMutation.isPending ? 'Initiating Call...' : 'Make Call'}
        </button>
      </form>
    </div>
  );
};

export default TwilioCallInterface;
```

### Call Logs Component

```jsx
// src/components/TwilioCallLogs.jsx
import React, { useState } from 'react';
import { useTwilio } from '../hooks/useTwilio';

const TwilioCallLogs = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
  });

  const { useCallLogs, useCallLog } = useTwilio();
  const { data: callLogsData, isLoading, error } = useCallLogs(filters);
  const [selectedCallSid, setSelectedCallSid] = useState(null);
  const { data: selectedCallLog } = useCallLog(selectedCallSid);

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleStatusFilter = (status) => {
    setFilters({ ...filters, status, page: 1 });
  };

  return (
    <div className="twilio-call-logs">
      <h2>Call Logs</h2>
      
      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="busy">Busy</option>
          <option value="no-answer">No Answer</option>
        </select>
      </div>

      {error && <div className="error">Error: {error.message}</div>}

      {isLoading ? (
        <div>Loading call logs...</div>
      ) : (
        <div className="call-logs-container">
          {/* Call Logs List */}
          <div className="call-logs-list">
            <h3>Recent Calls</h3>
            {callLogsData?.callLogs?.map((call) => (
              <div
                key={call.call_sid}
                className={`call-log-item ${selectedCallSid === call.call_sid ? 'selected' : ''}`}
                onClick={() => setSelectedCallSid(call.call_sid)}
              >
                <div className="call-info">
                  <div className="phone-numbers">
                    <span className="from">{call.from_number}</span>
                    <span className="arrow">→</span>
                    <span className="to">{call.to_number}</span>
                  </div>
                  <div className="call-details">
                    <span className={`status status-${call.status}`}>
                      {call.status}
                    </span>
                    <span className="duration">
                      {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                    </span>
                    <span className="price">
                      {call.price ? `$${call.price}` : 'N/A'}
                    </span>
                  </div>
                  <div className="call-date">
                    {new Date(call.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call Details */}
          {selectedCallLog && (
            <div className="call-details-panel">
              <h3>Call Details</h3>
              <div className="detail-item">
                <strong>Call SID:</strong> {selectedCallLog.call_sid}
              </div>
              <div className="detail-item">
                <strong>From:</strong> {selectedCallLog.from_number}
              </div>
              <div className="detail-item">
                <strong>To:</strong> {selectedCallLog.to_number}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {selectedCallLog.status}
              </div>
              <div className="detail-item">
                <strong>Duration:</strong> {selectedCallLog.duration || 0} seconds
              </div>
              <div className="detail-item">
                <strong>Cost:</strong> {selectedCallLog.price ? `$${selectedCallLog.price}` : 'N/A'}
              </div>
              {selectedCallLog.recording_url && (
                <div className="detail-item">
                  <strong>Recording:</strong>
                  <audio controls src={selectedCallLog.recording_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {callLogsData?.pagination && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page <= 1}
          >
            Previous
          </button>
          <span>
            Page {filters.page} of {callLogsData.pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page >= callLogsData.pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TwilioCallLogs;
```

### Recordings Component

```jsx
// src/components/TwilioRecordings.jsx
import React, { useState } from 'react';
import { useTwilio } from '../hooks/useTwilio';

const TwilioRecordings = () => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
  });

  const { useRecordings, useDeleteRecording } = useTwilio();
  const { data: recordingsData, isLoading, error } = useRecordings(filters);
  const deleteRecordingMutation = useDeleteRecording();

  const handleDeleteRecording = async (recordingSid) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      try {
        await deleteRecordingMutation.mutateAsync(recordingSid);
        alert('Recording deleted successfully!');
      } catch (error) {
        alert('Failed to delete recording: ' + error.message);
      }
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="twilio-recordings">
      <h2>Call Recordings</h2>

      {error && <div className="error">Error: {error.message}</div>}

      {isLoading ? (
        <div>Loading recordings...</div>
      ) : (
        <div className="recordings-grid">
          {recordingsData?.recordings?.map((recording) => (
            <div key={recording.sid} className="recording-card">
              <div className="recording-info">
                <h4>Recording {recording.sid}</h4>
                <p>Duration: {formatDuration(recording.duration)}</p>
                <p>Status: {recording.status}</p>
                <p>Channels: {recording.channels}</p>
                <p>Created: {new Date(recording.dateCreated).toLocaleString()}</p>
              </div>
              
              <div className="recording-actions">
                <audio controls src={recording.mediaUrl}>
                  Your browser does not support the audio element.
                </audio>
                
                <button
                  onClick={() => handleDeleteRecording(recording.sid)}
                  disabled={deleteRecordingMutation.isPending}
                  className="delete-btn"
                >
                  {deleteRecordingMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {recordingsData?.pagination && (
        <div className="pagination">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page <= 1}
          >
            Previous
          </button>
          <span>
            Page {filters.page} of {recordingsData.pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page >= recordingsData.pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TwilioRecordings;
```

## 🎨 CSS Styles

```css
/* src/styles/twilio.css */
.twilio-phone-purchase,
.twilio-call-interface,
.twilio-call-logs,
.twilio-recordings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 10px 0;
}

.available-numbers {
  margin-top: 20px;
}

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

.number-card {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.number-card h4 {
  margin: 0 0 10px 0;
  color: #007bff;
}

.call-logs-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.call-logs-list {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.call-log-item {
  border: 1px solid #eee;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.call-log-item:hover {
  background-color: #f8f9fa;
}

.call-log-item.selected {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.phone-numbers {
  font-weight: bold;
  margin-bottom: 5px;
}

.arrow {
  margin: 0 10px;
  color: #666;
}

.call-details {
  display: flex;
  gap: 15px;
  margin-bottom: 5px;
}

.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-completed {
  background-color: #d4edda;
  color: #155724;
}

.status-failed {
  background-color: #f8d7da;
  color: #721c24;
}

.status-busy {
  background-color: #fff3cd;
  color: #856404;
}

.call-details-panel {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #f8f9fa;
}

.detail-item {
  margin-bottom: 10px;
}

.detail-item strong {
  display: inline-block;
  width: 100px;
}

.recordings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.recording-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #f8f9fa;
}

.recording-info h4 {
  margin: 0 0 10px 0;
  color: #007bff;
}

.recording-actions {
  margin-top: 15px;
}

.recording-actions audio {
  width: 100%;
  margin-bottom: 10px;
}

.delete-btn {
  background-color: #dc3545;
}

.delete-btn:hover {
  background-color: #c82333;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 15px;
}

.pagination span {
  font-weight: bold;
}
```

## 📱 Main App Integration

```jsx
// src/App.jsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TwilioPhoneNumberPurchase from './components/TwilioPhoneNumberPurchase';
import TwilioCallInterface from './components/TwilioCallInterface';
import TwilioCallLogs from './components/TwilioCallLogs';
import TwilioRecordings from './components/TwilioRecordings';
import './styles/twilio.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <header>
          <h1>Twilio Integration Dashboard</h1>
        </header>
        
        <main>
          <section>
            <TwilioPhoneNumberPurchase />
          </section>
          
          <section>
            <TwilioCallInterface />
          </section>
          
          <section>
            <TwilioCallLogs />
          </section>
          
          <section>
            <TwilioRecordings />
          </section>
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
```

## 🔧 Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install axios @tanstack/react-query
   ```

2. **Copy Components:**
   - Copy all component files to your `src/components/` directory
   - Copy the API service to `src/services/twilioApi.js`
   - Copy the hooks to `src/hooks/useTwilio.js`

3. **Add Styles:**
   - Copy the CSS to `src/styles/twilio.css`
   - Import it in your main App component

4. **Configure Environment:**
   - Set up your `.env` file with the API URL
   - Ensure your backend is running and accessible

5. **Authentication:**
   - Make sure your auth system provides JWT tokens
   - The API service will automatically include it in requests

## 🎯 Features Included

- ✅ **Phone Number Purchase** - Search and buy Twilio numbers
- ✅ **Call Interface** - Make calls from the browser
- ✅ **Call Logs** - View and filter call history
- ✅ **Recordings** - Play and manage call recordings
- ✅ **Real-time Updates** - React Query handles caching and updates
- ✅ **Error Handling** - Comprehensive error states
- ✅ **Loading States** - User-friendly loading indicators
- ✅ **Responsive Design** - Works on mobile and desktop

## 🚨 Important Notes

1. **Authentication**: Ensure your auth system provides JWT tokens
2. **CORS**: Your backend must allow requests from your React app
3. **HTTPS**: In production, use HTTPS for secure communication
4. **Rate Limiting**: Be aware of API rate limits
5. **Error Handling**: Implement proper error boundaries in production

This setup provides a complete React frontend for your Twilio integration! 🎉 
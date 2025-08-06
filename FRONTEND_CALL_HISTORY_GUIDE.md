# Frontend Call History & Recordings Integration Guide

This guide explains how your frontend should integrate with the multi-user calling platform to display call history and play recordings.

## 🎯 Overview

Your backend stores:
- **Call metadata** in your database (call logs, durations, status)
- **Recording URLs** pointing to Twilio's servers
- **User associations** to ensure privacy

Your frontend will:
- Fetch call history from your API
- Display call information
- Stream recordings directly from Twilio

## 📋 Call History Integration

### 1. **Fetch Call History**

```javascript
// API call to get call history
const getCallHistory = async (page = 1, limit = 20, status = null) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });

    const response = await fetch(`/twilio/call-logs?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      return data;
    } else {
      throw new Error('Failed to fetch call history');
    }
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw error;
  }
};
```

### 2. **Expected Response Format**

```javascript
{
  "success": true,
  "callLogs": [
    {
      "id": 3,
      "call_sid": "CAcafb183ea07741514d4e100aed2b1618",
      "from_number": "+17122145838",
      "to_number": "+19102002942",
      "status": "completed",           // completed, failed, busy, no-answer
      "direction": "outbound-api",     // outbound-api, inbound
      "duration": 33,                  // seconds
      "price": "0.0085",              // cost in USD
      "price_unit": "USD",
      "recording_url": "https://api.twilio.com/recordings/...",  // Twilio URL
      "recording_sid": "RE12b5625eeb0100fe6fbb2fca950e6dba",
      "recording_duration": 31,        // recording length in seconds
      "recording_status": "completed", // completed, processing, failed
      "created_at": "2025-08-06T22:02:04.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### 3. **React Component Example**

```jsx
import React, { useState, useEffect } from 'react';

const CallHistory = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadCallHistory();
  }, [currentPage]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const data = await getCallHistory(currentPage, 20);
      setCallLogs(data.callLogs);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'busy': return 'text-yellow-600';
      case 'no-answer': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  if (loading) return <div>Loading call history...</div>;

  return (
    <div className="call-history">
      <h2 className="text-2xl font-bold mb-4">Call History</h2>
      
      {callLogs.length === 0 ? (
        <p className="text-gray-500">No calls found</p>
      ) : (
        <div className="space-y-4">
          {callLogs.map((call) => (
            <div key={call.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {call.direction === 'outbound-api' ? '📞' : '📲'}
                    </span>
                    <span className="font-medium">
                      {call.from_number} → {call.to_number}
                    </span>
                    <span className={`text-sm font-medium ${getStatusColor(call.status)}`}>
                      {call.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    <span>Duration: {formatDuration(call.duration)}</span>
                    <span className="mx-2">•</span>
                    <span>Cost: ${call.price}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(call.created_at)}</span>
                  </div>
                </div>
                
                {/* Recording Controls */}
                {call.recording_url && call.recording_status === 'completed' && (
                  <div className="ml-4">
                    <RecordingPlayer 
                      recordingUrl={call.recording_url}
                      duration={call.recording_duration}
                      callSid={call.call_sid}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

## 🎙️ Recording Integration

### 1. **Recording Player Component**

```jsx
import React, { useState, useRef } from 'react';

const RecordingPlayer = ({ recordingUrl, duration, callSid }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      // Create audio element on first play
      audioRef.current = new Audio(recordingUrl);
      
      audioRef.current.addEventListener('loadstart', () => setLoading(true));
      audioRef.current.addEventListener('canplay', () => setLoading(false));
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setLoading(false);
        alert('Failed to load recording');
      });
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setLoading(false);
      alert('Failed to play recording');
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const clickX = e.nativeEvent.offsetX;
      const width = e.target.offsetWidth;
      const newTime = (clickX / width) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="recording-player flex items-center space-x-2 min-w-0">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        disabled={loading}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? (
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <div 
          className="h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div 
            className="h-2 bg-blue-500 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex-shrink-0 text-xs text-gray-500 font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};
```

### 2. **Advanced Recording Features**

```jsx
// Download recording
const downloadRecording = async (recordingUrl, callSid) => {
  try {
    const response = await fetch(recordingUrl);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${callSid}.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download recording');
  }
};

// Get all recordings for a call (in case there are multiple)
const getCallRecordings = async (callSid) => {
  try {
    const response = await fetch(`/twilio/recordings/${callSid}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    const data = await response.json();
    return data.recordings;
  } catch (error) {
    console.error('Failed to fetch call recordings:', error);
    return [];
  }
};
```

## 🔄 Real-time Updates

### 1. **Polling for New Calls**

```javascript
// Poll for new calls every 30 seconds
const useCallHistoryPolling = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const pollForUpdates = async () => {
      try {
        const data = await getCallHistory(1, 20);
        setCallLogs(data.callLogs);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Polling failed:', error);
      }
    };

    // Initial load
    pollForUpdates();

    // Set up polling
    const interval = setInterval(pollForUpdates, 30000);

    return () => clearInterval(interval);
  }, []);

  return { callLogs, lastUpdate };
};
```

### 2. **Filter and Search**

```jsx
const CallHistoryWithFilters = () => {
  const [callLogs, setCallLogs] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    phoneNumber: ''
  });

  useEffect(() => {
    applyFilters();
  }, [callLogs, filters]);

  const applyFilters = () => {
    let filtered = callLogs;

    if (filters.status) {
      filtered = filtered.filter(call => call.status === filters.status);
    }

    if (filters.phoneNumber) {
      filtered = filtered.filter(call => 
        call.from_number.includes(filters.phoneNumber) ||
        call.to_number.includes(filters.phoneNumber)
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(call => 
        new Date(call.created_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(call => 
        new Date(call.created_at) <= new Date(filters.dateTo)
      );
    }

    setFilteredCalls(filtered);
  };

  return (
    <div>
      {/* Filter Controls */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="busy">Busy</option>
            <option value="no-answer">No Answer</option>
          </select>
          
          <input
            type="text"
            placeholder="Phone number..."
            value={filters.phoneNumber}
            onChange={(e) => setFilters({...filters, phoneNumber: e.target.value})}
            className="border rounded px-3 py-2"
          />
          
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            className="border rounded px-3 py-2"
          />
          
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Call List */}
      <div className="space-y-4">
        {filteredCalls.map(call => (
          <CallLogItem key={call.id} call={call} />
        ))}
      </div>
    </div>
  );
};
```

## 🚀 Complete Integration Example

```jsx
// Main component that ties everything together
import React, { useState, useEffect } from 'react';

const CallManagement = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [callLogs, setCallLogs] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load call history and phone numbers in parallel
      const [historyData, numbersData] = await Promise.all([
        getCallHistory(),
        getMyNumbers()
      ]);
      
      setCallLogs(historyData.callLogs);
      setPhoneNumbers(numbersData.phoneNumbers);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Call Management</h1>
      
      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Call History ({callLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('numbers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'numbers' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Numbers ({phoneNumbers.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <CallHistory callLogs={callLogs} onRefresh={loadInitialData} />
      )}
      
      {activeTab === 'numbers' && (
        <PhoneNumbers phoneNumbers={phoneNumbers} onRefresh={loadInitialData} />
      )}
    </div>
  );
};

export default CallManagement;
```

## 🎯 Key Points

1. **Always use JWT authentication** for all API calls
2. **Recordings stream from Twilio** - don't try to store them locally
3. **Handle loading states** - recordings take time to process
4. **Implement error handling** - network issues, auth failures, etc.
5. **Use pagination** for large call histories
6. **Poll periodically** for new calls and recording updates
7. **Format data properly** - times, phone numbers, costs
8. **Provide download options** for recordings

Your multi-user calling platform is now ready for frontend integration! 🚀
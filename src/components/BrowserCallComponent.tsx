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
    const initDevice = async () => {
      try {
        console.log('🎫 Getting access token...');
        
        // Get access token from your backend
        const response = await fetch('https://newrankandrentapi.onrender.com/api/twilio/access-token', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get access token');
        }

        const { token } = await response.json();
        console.log('✅ Access token received');
        
        // Initialize device
        const dev = new Device(token, {
          debug: true,
          enableRingingState: true
        });
        
        // Set up event listeners
        dev.on('ready', () => {
          console.log('✅ Device ready');
          setCallStatus('ready');
          setError('');
        });
        
        dev.on('connect', (conn) => {
          console.log('✅ Call connected');
          setConnection(conn);
          setIsConnected(true);
          setIsCalling(false);
          setCallStatus('connected');
          setError('');
        });
        
        dev.on('disconnect', () => {
          console.log('📞 Call ended');
          setConnection(null);
          setIsConnected(false);
          setIsCalling(false);
          setCallStatus('idle');
          setError('');
        });
        
        dev.on('error', (error) => {
          console.log('❌ Device error:', error);
          
          // Handle ConnectionError (31005) as normal call end
          if (error.code === 31005 || error.message.includes('HANGUP')) {
            console.log('📞 Call ended normally (person hung up or didn\'t answer)');
            setConnection(null);
            setIsConnected(false);
            setIsCalling(false);
            setCallStatus('idle');
            setError('');
          } else {
            setError(`Device error: ${error.message}`);
            setCallStatus('error');
          }
        });
        
        dev.on('incoming', (connection) => {
          console.log('📞 Incoming call');
          setConnection(connection);
          setIsConnected(true);
          setCallStatus('connected');
        });
        
        setDevice(dev);
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
        setError(`Failed to initialize: ${error.message}`);
        setCallStatus('error');
      }
    };

    initDevice();
  }, []);

  const makeCall = async () => {
    if (!device || isCalling || isConnected) return;
    if (!toNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setIsCalling(true);
      setCallStatus('calling');
      setError('');
      
      console.log('📞 Making call to:', toNumber);
      
      // Connect to the number
      const conn = await device.connect({ To: toNumber });
      setConnection(conn);
      
    } catch (error) {
      console.error('❌ Call failed:', error);
      
      // Handle ConnectionError as normal call end
      if (error.code === 31005 || error.message.includes('HANGUP')) {
        console.log('📞 Call ended normally');
        setError('');
        setCallStatus('idle');
      } else {
        setError(`Call failed: ${error.message}`);
        setCallStatus('error');
      }
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
    setCallStatus('idle');
    setError('');
  };

  const toggleMute = () => {
    if (connection) {
      const muted = !connection.isMuted();
      connection.mute(muted);
      setIsMuted(muted);
      console.log(`🎤 ${muted ? 'Muted' : 'Unmuted'}`);
    }
  };

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
        // Call Setup
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
        </div>
      )}
    </div>
  );
};

export default BrowserCallComponent; 
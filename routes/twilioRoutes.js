const express = require('express');
const router = express.Router();
const client = require('../config/twilioClient');
const { authenticate: auth } = require('../middleware/auth');
const TwilioCallLog = require('../models/TwilioCallLog');
const UserPhoneNumber = require('../models/UserPhoneNumber');

// Buy a phone number for the authenticated user
router.post('/buy-number', auth, async (req, res) => {
  try {
    const { phoneNumber, areaCode, country = 'US' } = req.body;
    const userId = req.user.id;
    
    // Check if user already owns this number
    if (phoneNumber) {
      const existingNumber = await UserPhoneNumber.findByPhoneNumber(phoneNumber);
      if (existingNumber && existingNumber.user_id === userId) {
        return res.status(400).json({ 
          error: 'You already own this phone number' 
        });
      }
    }

    let searchParams = {};
    
    if (phoneNumber) {
      searchParams.phoneNumber = phoneNumber;
    } else if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    let numberToBuy;
    let purchasedNumber;

    if (phoneNumber) {
      // User wants to buy a specific number
      console.log(`🎯 Attempting to purchase specific number: ${phoneNumber}`);
      
      try {
        // Try to purchase the specific number directly
        purchasedNumber = await client.incomingPhoneNumbers
          .create({
            phoneNumber: phoneNumber,
            voiceApplicationSid: process.env.TWILIO_APP_SID,
            voiceUrl: `${process.env.SERVER_URL}/api/twilio/twiml`,
            statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
          });
        
        // Create a numberToBuy object for consistency
        numberToBuy = {
          phoneNumber: phoneNumber,
          locality: 'Unknown',
          region: 'Unknown',
          capabilities: { voice: true, sms: false, mms: false }
        };
        
        console.log(`✅ Successfully purchased specific number: ${phoneNumber}`);
        
      } catch (specificError) {
        console.log(`❌ Specific number ${phoneNumber} no longer available:`, specificError.message);
        
        // Fall back to searching for similar numbers
        console.log(`🔄 Searching for alternative numbers in same area...`);
        const availableNumbers = await client.availablePhoneNumbers(country)
          .local
          .list({ areaCode: phoneNumber.substring(2, 5), limit: 5 });
        
        if (availableNumbers.length === 0) {
          return res.status(404).json({ 
            error: `The specific number ${phoneNumber} is no longer available, and no alternative numbers were found in the same area code.`
          });
        }
        
        numberToBuy = availableNumbers[0];
        console.log(`🔄 Purchasing alternative number: ${numberToBuy.phoneNumber}`);
        
        purchasedNumber = await client.incomingPhoneNumbers
          .create({
            phoneNumber: numberToBuy.phoneNumber,
            voiceApplicationSid: process.env.TWILIO_APP_SID,
            voiceUrl: `${process.env.SERVER_URL}/api/twilio/twiml`,
            statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
          });
      }
      
    } else {
      // User wants any number matching criteria (area code, etc.)
      console.log(`🔍 Searching for available numbers with criteria:`, searchParams);
      
      const availableNumbers = await client.availablePhoneNumbers(country)
        .local
        .list(searchParams);

      if (availableNumbers.length === 0) {
        return res.status(404).json({ 
          error: 'No available phone numbers found for the specified criteria' 
        });
      }

      // Purchase the first available number
      numberToBuy = availableNumbers[0];
      console.log(`🛒 Purchasing first available number: ${numberToBuy.phoneNumber}`);
      
      purchasedNumber = await client.incomingPhoneNumbers
        .create({
          phoneNumber: numberToBuy.phoneNumber,
          voiceApplicationSid: process.env.TWILIO_APP_SID,
          voiceUrl: `${process.env.SERVER_URL}/api/twilio/twiml`,
          statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });
    }

    // Debug: Log the data we're about to save
    console.log('Twilio purchase response:', {
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid,
      friendlyName: purchasedNumber.friendlyName,
      price: purchasedNumber.price,
      priceUnit: purchasedNumber.priceUnit
    });
    console.log('Available number data:', {
      locality: numberToBuy.locality,
      region: numberToBuy.region,
      capabilities: numberToBuy.capabilities
    });

    // Save to user's phone numbers (with safe fallbacks)
    const phoneNumberId = await UserPhoneNumber.create({
      user_id: userId,
      phone_number: purchasedNumber.phoneNumber,
      twilio_sid: purchasedNumber.sid,
      friendly_name: purchasedNumber.friendlyName || `${numberToBuy.locality || 'Unknown'} Number`,
      country: country,
      region: numberToBuy.region || null,
      locality: numberToBuy.locality || null,
      purchase_price: purchasedNumber.price || null,
      purchase_price_unit: purchasedNumber.priceUnit || 'USD',
      monthly_cost: 1.00, // Standard Twilio monthly cost
      capabilities: numberToBuy.capabilities || null
    });

    // Check if we got a different number than requested
    const requestedNumber = req.body.phoneNumber;
    const actualNumber = purchasedNumber.phoneNumber;
    const isDifferentNumber = requestedNumber && requestedNumber !== actualNumber;

    res.json({
      success: true,
      message: isDifferentNumber 
        ? `Phone number purchased successfully. Note: ${requestedNumber} was no longer available, so we got you ${actualNumber} instead.`
        : 'Phone number purchased successfully',
      phoneNumber: purchasedNumber.phoneNumber,
      requestedNumber: requestedNumber || null,
      isDifferentNumber: isDifferentNumber,
      sid: purchasedNumber.sid,
      friendlyName: purchasedNumber.friendlyName,
      locality: numberToBuy.locality,
      region: numberToBuy.region,
      priceUnit: purchasedNumber.priceUnit,
      price: purchasedNumber.price,
      id: phoneNumberId
    });

  } catch (err) {
    console.error('Error buying number:', err);
    res.status(500).json({ 
      error: 'Failed to purchase phone number',
      details: err.message 
    });
  }
});

// Get available phone numbers
router.get('/available-numbers', auth, async (req, res) => {
  try {
    const { areaCode, country = 'US', limit = 20 } = req.query;
    
    const searchParams = { limit: parseInt(limit) };
    if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    const availableNumbers = await client.availablePhoneNumbers(country)
      .local
      .list(searchParams);

    res.json({
      success: true,
      availableNumbers: availableNumbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        country: number.country,
        capabilities: number.capabilities
      }))
    });

  } catch (err) {
    console.error('Error fetching available numbers:', err);
    res.status(500).json({ 
      error: 'Failed to fetch available numbers',
      details: err.message 
    });
  }
});

// Make a call using user's purchased number
router.post('/call', auth, async (req, res) => {
  try {
    const { to, from, record = true, twimlUrl } = req.body;
    const userId = req.user.id;
    
    console.log('📞 Call request received:', {
      to,
      from,
      record,
      twimlUrl,
      userId
    });
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient number is required' });
    }

    let fromNumber = from;
    
    let userPhoneNumber;
    
    // If no 'from' number specified, use user's first active number
    if (!fromNumber) {
      const userNumbers = await UserPhoneNumber.findActiveByUserId(userId);
      if (userNumbers.length === 0) {
        return res.status(400).json({ 
          error: 'No phone numbers available. Please purchase a phone number first.' 
        });
      }
      userPhoneNumber = userNumbers[0];
      fromNumber = userPhoneNumber.phone_number;
    } else {
      // Verify the user owns the 'from' number
      userPhoneNumber = await UserPhoneNumber.findByPhoneNumber(fromNumber);
      if (!userPhoneNumber || userPhoneNumber.user_id !== userId || !userPhoneNumber.is_active) {
        return res.status(403).json({ 
          error: 'You do not own this phone number or it is inactive' 
        });
      }
    }

    console.log('📱 Phone number info:', {
      fromNumber,
      userPhoneNumber: userPhoneNumber ? {
        id: userPhoneNumber.id,
        phone_number: userPhoneNumber.phone_number,
        is_active: userPhoneNumber.is_active
      } : null
    });

    const callParams = {
      url: twimlUrl || `${process.env.SERVER_URL}/api/twilio/twiml`,
      to: to,
      from: fromNumber,
      record: record,
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed'],
      statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    };

    console.log('🔧 Call parameters:', callParams);
    console.log('🌐 Server URL:', process.env.SERVER_URL);

    // For local development, add a fallback TwiML
    if (process.env.NODE_ENV === 'development' && process.env.SERVER_URL.includes('localhost')) {
      console.warn('⚠️  LOCAL DEVELOPMENT: Twilio webhooks will not work with localhost');
      console.log('💡 Use ngrok or deploy to test webhooks properly');
    }

    console.log('🚀 Attempting to create Twilio call...');
    
    // Check environment variables
    console.log('🔍 Environment check:', {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasServerUrl: !!process.env.SERVER_URL,
      serverUrl: process.env.SERVER_URL
    });
    
    const call = await client.calls.create(callParams);

    // Log the call attempt (handle undefined values)
    await TwilioCallLog.create({
      user_id: userId,
      phone_number_id: userPhoneNumber.id,
      call_sid: call.sid,
      from_number: call.from,
      to_number: call.to,
      status: call.status,
      direction: call.direction || null,
      duration: call.duration || 0,
      price: call.price || null,
      price_unit: call.priceUnit || null
    });

    res.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid,
      status: call.status,
      from: call.from,
      to: call.to
    });

  } catch (err) {
    console.error('❌ Error making call:', err);
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      status: err.status,
      moreInfo: err.moreInfo
    });
    
    // Check for specific Twilio error types
    if (err.code === 20003) {
      return res.status(400).json({ 
        error: 'Authentication failed',
        details: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.'
      });
    } else if (err.code === 21211) {
      return res.status(400).json({ 
        error: 'Invalid phone number',
        details: 'The phone number format is invalid. Please use E.164 format (e.g., +1234567890).'
      });
    } else if (err.code === 21214) {
      return res.status(400).json({ 
        error: 'Invalid "to" phone number',
        details: 'The destination phone number is invalid or not supported.'
      });
    } else if (err.code === 21215) {
      return res.status(400).json({ 
        error: 'Invalid "from" phone number',
        details: 'The source phone number is invalid or not owned by your account.'
      });
    } else if (err.message && err.message.includes('transform')) {
      return res.status(400).json({ 
        error: 'Invalid call parameters',
        details: 'The call parameters could not be processed. Please check phone numbers and URLs.',
        twilioError: err.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to initiate call',
      details: err.message,
      code: err.code
    });
  }
});

// TwiML endpoint for call handling
router.post('/twiml', (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Log the request for debugging
  console.log('TwiML request received:', {
    body: req.body,
    query: req.query
  });

  // Extract call parameters
  const to = req.body.To || req.query.To;
  const from = req.body.From || req.query.From;
  const direction = req.body.Direction || req.query.Direction;
  const called = req.body.Called || req.query.Called;
  const caller = req.body.Caller || req.query.Caller;
  
  console.log(`Call - Direction: ${direction}, From: ${from}, To: ${to}, Called: ${called}, Caller: ${caller}`);
  
  // Handle browser-to-phone calls (from Twilio Voice SDK)
  if (to && to.startsWith('+')) {
    console.log(`Browser calling phone number: ${to}`);
    const dial = twiml.dial({
      callerId: from, // Use user's purchased number as caller ID
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed']
    });
    dial.number(to);
  } else if (direction === 'outbound-api') {
    // Handle legacy API calls (if still used)
    if (to) {
      console.log(`API calling phone number: ${to}`);
      const dial = twiml.dial({ 
        record: 'record-from-answer-dual',
        recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
        recordingStatusCallbackEvent: ['completed']
      });
      dial.number(to);
    } else {
      twiml.say('I\'m sorry, there was an error connecting your call. Please try again.');
      twiml.hangup();
    }
  } else if (direction === 'inbound') {
    // Handle inbound calls to your Twilio number
    twiml.say('Hello! Thank you for calling.');
    twiml.pause({ length: 1 });
    twiml.say('This is a Twilio phone system. Goodbye!');
  } else {
    // Default response
    console.log('Unknown call direction or missing parameters');
    twiml.say('Hello! This is your Twilio phone system.');
    twiml.pause({ length: 1 });
    twiml.say('Thank you for calling. Goodbye!');
  }

  const twimlResponse = twiml.toString();
  console.log('TwiML response:', twimlResponse);

  res.type('text/xml');
  res.send(twimlResponse);
});

// Call status callback
router.post('/status-callback', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, CallPrice, CallPriceUnit } = req.body;
    
    // Update call log with status
    await TwilioCallLog.update(CallSid, {
      status: CallStatus,
      duration: CallDuration || 0,
      price: CallPrice,
      price_unit: CallPriceUnit
    });

    console.log(`Call ${CallSid} status updated to: ${CallStatus}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('Error updating call status:', err);
    res.sendStatus(500);
  }
});

// Recording callback
router.post('/recording-callback', async (req, res) => {
  try {
    console.log('🎙️ Recording callback received:', req.body);
    
    const { 
      RecordingUrl, 
      RecordingSid, 
      CallSid, 
      RecordingDuration,
      RecordingChannels,
      RecordingStatus 
    } = req.body;

    if (!CallSid) {
      console.error('❌ Recording callback missing CallSid');
      return res.sendStatus(400);
    }

    console.log(`📞 Processing recording for call ${CallSid}:`, {
      RecordingSid,
      RecordingStatus,
      RecordingDuration,
      RecordingChannels,
      RecordingUrl: RecordingUrl ? 'Present' : 'Missing'
    });

    // Update call log with only recording information (not status fields)
    const updated = await TwilioCallLog.update(CallSid, {
      recording_url: RecordingUrl,
      recording_sid: RecordingSid,
      recording_duration: RecordingDuration,
      recording_channels: RecordingChannels,
      recording_status: RecordingStatus
    });

    if (updated) {
      console.log(`✅ Recording saved for call ${CallSid}: ${RecordingUrl}`);
    } else {
      console.warn(`⚠️ No call log found to update for CallSid: ${CallSid}`);
    }
    
    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Error processing recording callback:', err);
    res.sendStatus(500);
  }
});

// Get call logs with recordings for debugging
router.get('/call-logs-with-recordings', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get recent call logs that have recordings
    const callLogs = await TwilioCallLog.findByUserId(userId, 1, 10);
    const callsWithRecordings = callLogs.filter(call => call.recording_url);
    
    res.json({
      success: true,
      message: `Found ${callsWithRecordings.length} calls with recordings out of ${callLogs.length} total calls`,
      callsWithRecordings: callsWithRecordings.map(call => ({
        call_sid: call.call_sid,
        from_number: call.from_number,
        to_number: call.to_number,
        status: call.status,
        duration: call.duration,
        recording_url: call.recording_url,
        recording_sid: call.recording_sid,
        recording_duration: call.recording_duration,
        recording_status: call.recording_status,
        created_at: call.created_at
      })),
      allCalls: callLogs.map(call => ({
        call_sid: call.call_sid,
        status: call.status,
        has_recording: !!call.recording_url
      }))
    });

  } catch (err) {
    console.error('Error fetching calls with recordings:', err);
    res.status(500).json({ 
      error: 'Failed to fetch calls with recordings',
      details: err.message 
    });
  }
});

// Get recordings for a specific call
router.get('/recordings/:callSid', auth, async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const recordings = await client.recordings.list({ 
      callSid: callSid 
    });

    res.json({
      success: true,
      callSid: callSid,
      recordings: recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        channels: recording.channels,
        status: recording.status,
        uri: recording.uri,
        mediaUrl: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recording.sid}/Media`
      }))
    });

  } catch (err) {
    console.error('Error fetching recordings:', err);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      details: err.message 
    });
  }
});

// Get all recordings for a user (from database with proper associations)
router.get('/recordings', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    
    // Get call logs with recordings from database
    const callLogs = await TwilioCallLog.findByUserId(userId, parseInt(page), parseInt(limit));
    
    // Filter only calls that have recordings and map to recording format
    const recordings = callLogs
      .filter(call => call.recording_url && call.recording_sid)
      .map(call => ({
        id: call.id,
        userId: call.user_id,
        callSid: call.call_sid,
        recordingSid: call.recording_sid,
        phoneNumberId: call.phone_number_id,
        duration: call.recording_duration,
        channels: call.recording_channels,
        status: call.recording_status,
        priceUnit: call.price_unit,
        recordingUrl: call.recording_url,
        mediaUrl: `${process.env.SERVER_URL}/api/twilio/recording/${call.recording_sid}`,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
        // Call context
        fromNumber: call.from_number,
        toNumber: call.to_number,
        callDuration: call.duration,
        callStatus: call.status
      }));

    // Get phone number stats for context
    const phoneNumberStats = await UserPhoneNumber.getUserPhoneNumberStats(userId);

    res.json({
      success: true,
      recordings: recordings,
      phoneNumberStats: {
        total_numbers: phoneNumberStats.total_numbers || 0,
        active_numbers: phoneNumberStats.active_numbers || 0,
        total_purchase_cost: phoneNumberStats.total_purchase_cost || "0.0000",
        total_monthly_cost: phoneNumberStats.total_monthly_cost || "0.0000"
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: recordings.length
      },
      loading: false,
      error: null
    });

  } catch (err) {
    console.error('Error fetching recordings:', err);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      details: err.message,
      loading: false
    });
  }
});

// Get call logs for a user
router.get('/call-logs', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const callLogs = await TwilioCallLog.findByUserId(
      req.user.id, 
      parseInt(page), 
      parseInt(limit), 
      status
    );

    // Get total count for pagination
    const stats = await TwilioCallLog.getCallStats(req.user.id);
    const total = stats.total_calls || 0;

    res.json({
      success: true,
      callLogs: callLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    console.error('Error fetching call logs:', err);
    res.status(500).json({ 
      error: 'Failed to fetch call logs',
      details: err.message 
    });
  }
});

// Get a specific call log
router.get('/call-logs/:callSid', auth, async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const callLog = await TwilioCallLog.findByCallSid(callSid);

    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    // Verify the call log belongs to the authenticated user
    if (callLog.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      callLog: callLog
    });

  } catch (err) {
    console.error('Error fetching call log:', err);
    res.status(500).json({ 
      error: 'Failed to fetch call log',
      details: err.message 
    });
  }
});

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

// Proxy endpoint to stream recordings without authentication prompts
router.get('/recording/:recordingSid', auth, async (req, res) => {
  try {
    const { recordingSid } = req.params;
    const userId = req.user.id;
    
    // Verify the user owns this recording by checking call logs
    const callLogs = await TwilioCallLog.findByUserId(userId, 1, 1000);
    const recordingExists = callLogs.some(call => call.recording_sid === recordingSid);
    
    if (!recordingExists) {
      return res.status(403).json({ 
        error: 'Access denied. Recording not found or does not belong to user.' 
      });
    }

    // Construct Twilio recording URL
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;

    // Fetch recording from Twilio with authentication
    const axios = require('axios');
    const response = await axios.get(recordingUrl, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      },
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="recording-${recordingSid}.mp3"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for audio
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    // Stream the audio data to client
    response.data.pipe(res);

  } catch (err) {
    console.error('Error streaming recording:', err);
    
    if (err.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Recording not found',
        details: 'The requested recording does not exist or has been deleted.' 
      });
    } else if (err.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Authentication failed with Twilio',
        details: 'Invalid Twilio credentials.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to fetch recording',
        details: err.message 
      });
    }
  }
});

// Proxy endpoint for audio elements that can't send custom headers
router.get('/recording-audio/:recordingSid', async (req, res) => {
  try {
    const { recordingSid } = req.params;
    const { token } = req.query;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'No token provided' 
      });
    }

    // Verify the token
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Access denied',
        message: 'Invalid token' 
      });
    }

    // Verify the user owns this recording by checking call logs
    const callLogs = await TwilioCallLog.findByUserId(user.id, 1, 1000);
    const recordingExists = callLogs.some(call => call.recording_sid === recordingSid);
    
    if (!recordingExists) {
      return res.status(403).json({ 
        error: 'Access denied. Recording not found or does not belong to user.' 
      });
    }

    // Construct Twilio recording URL
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;

    // Fetch recording from Twilio with authentication
    const axios = require('axios');
    const response = await axios.get(recordingUrl, {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      },
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="recording-${recordingSid}.mp3"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for audio
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    // Stream the audio data to client
    response.data.pipe(res);

  } catch (err) {
    console.error('Error streaming recording:', err);
    
    if (err.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Recording not found',
        details: 'The requested recording does not exist or has been deleted.' 
      });
    } else if (err.response?.status === 401) {
      return res.status(500).json({ 
        error: 'Authentication failed with Twilio',
        details: 'Invalid Twilio credentials.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to fetch recording',
        details: err.message 
      });
    }
  }
});

// Delete a recording
router.delete('/recordings/:recordingSid', auth, async (req, res) => {
  try {
    const { recordingSid } = req.params;
    
    await client.recordings(recordingSid).remove();

    res.json({
      success: true,
      message: 'Recording deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting recording:', err);
    res.status(500).json({ 
      error: 'Failed to delete recording',
      details: err.message 
    });
  }
});

// Get user's phone numbers
router.get('/my-numbers', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const stats = await UserPhoneNumber.getUserPhoneNumberStats(userId);

    res.json({
      success: true,
      phoneNumbers: phoneNumbers,
      stats: stats
    });

  } catch (err) {
    console.error('Error fetching user phone numbers:', err);
    res.status(500).json({ 
      error: 'Failed to fetch phone numbers',
      details: err.message 
    });
  }
});

// Get user's active phone numbers
router.get('/my-numbers/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const activeNumbers = await UserPhoneNumber.findActiveByUserId(userId);

    res.json({
      success: true,
      activeNumbers: activeNumbers
    });

  } catch (err) {
    console.error('Error fetching active phone numbers:', err);
    res.status(500).json({ 
      error: 'Failed to fetch active phone numbers',
      details: err.message 
    });
  }
});

// Update phone number settings
router.put('/my-numbers/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { friendly_name, is_active } = req.body;
    const userId = req.user.id;

    // First verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    const updateData = {};
    if (friendly_name !== undefined) updateData.friendly_name = friendly_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updated = await UserPhoneNumber.update(id, updateData);

    if (updated) {
      res.json({
        success: true,
        message: 'Phone number updated successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to update phone number' });
    }

  } catch (err) {
    console.error('Error updating phone number:', err);
    res.status(500).json({ 
      error: 'Failed to update phone number',
      details: err.message 
    });
  }
});

// Release/delete a phone number
router.delete('/my-numbers/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Release the number from Twilio
    try {
      await client.incomingPhoneNumbers(userNumber.twilio_sid).remove();
    } catch (twilioErr) {
      console.warn('Failed to release number from Twilio:', twilioErr.message);
      // Continue with database deletion even if Twilio release fails
    }

    // Delete from our database
    const deleted = await UserPhoneNumber.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Phone number released successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to delete phone number from database' });
    }

  } catch (err) {
    console.error('Error releasing phone number:', err);
    res.status(500).json({ 
      error: 'Failed to release phone number',
      details: err.message 
    });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const client = require('../config/twilioClient');
const auth = require('../middleware/auth');
const TwilioCallLog = require('../models/TwilioCallLog');

// Buy a phone number
router.post('/buy-number', auth, async (req, res) => {
  try {
    const { phoneNumber, areaCode, country } = req.body;
    
    let searchParams = {};
    
    if (phoneNumber) {
      searchParams.phoneNumber = phoneNumber;
    } else if (areaCode) {
      searchParams.areaCode = areaCode;
    }
    
    if (country) {
      searchParams.country = country;
    }

    // Search for available numbers
    const availableNumbers = await client.availablePhoneNumbers(country || 'US')
      .local
      .list(searchParams);

    if (availableNumbers.length === 0) {
      return res.status(404).json({ 
        error: 'No available phone numbers found for the specified criteria' 
      });
    }

    // Purchase the first available number
    const numberToBuy = availableNumbers[0];
    const purchasedNumber = await client.incomingPhoneNumbers
      .create({
        phoneNumber: numberToBuy.phoneNumber,
        voiceApplicationSid: process.env.TWILIO_APP_SID,
        voiceUrl: `${process.env.SERVER_URL}/api/twilio/twiml`,
        statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

    res.json({
      success: true,
      message: 'Phone number purchased successfully',
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid,
      priceUnit: purchasedNumber.priceUnit,
      price: purchasedNumber.price
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

// Make a call
router.post('/call', auth, async (req, res) => {
  try {
    const { to, from, record = true, twimlUrl } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient number is required' });
    }

    const callParams = {
      url: twimlUrl || `${process.env.SERVER_URL}/api/twilio/twiml`,
      to: to,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      record: record,
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed'],
      statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    };

    const call = await client.calls.create(callParams);

    // Log the call attempt
    await TwilioCallLog.create({
      user_id: req.user.id,
      call_sid: call.sid,
      from_number: call.from,
      to_number: call.to,
      status: call.status,
      direction: call.direction,
      duration: call.duration || 0,
      price: call.price,
      price_unit: call.priceUnit
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
    console.error('Error making call:', err);
    res.status(500).json({ 
      error: 'Failed to initiate call',
      details: err.message 
    });
  }
});

// TwiML endpoint for call handling
router.post('/twiml', (req, res) => {
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Get the 'To' parameter from the request
  const to = req.body.To || req.query.To;
  
  if (to) {
    // Connect the call to the specified number
    const dial = twiml.dial({ 
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed']
    });
    dial.number(to);
  } else {
    // Default response if no number specified
    twiml.say('Hello! This is your Twilio phone system.');
    twiml.pause({ length: 1 });
    twiml.say('Thank you for calling. Goodbye!');
  }

  res.type('text/xml');
  res.send(twiml.toString());
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
    const { 
      RecordingUrl, 
      RecordingSid, 
      CallSid, 
      RecordingDuration,
      RecordingChannels,
      RecordingStatus 
    } = req.body;

    // Update call log with recording information
    await TwilioCallLog.update(CallSid, {
      recording_url: RecordingUrl,
      recording_sid: RecordingSid,
      recording_duration: RecordingDuration,
      recording_channels: RecordingChannels,
      recording_status: RecordingStatus
    });

    console.log(`Recording ready for call ${CallSid}: ${RecordingUrl}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('Error processing recording callback:', err);
    res.sendStatus(500);
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

// Get all recordings for a user
router.get('/recordings', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const recordings = await client.recordings.list({
      limit: parseInt(limit),
      pageSize: parseInt(limit)
    });

    res.json({
      success: true,
      recordings: recordings.map(recording => ({
        sid: recording.sid,
        callSid: recording.callSid,
        duration: recording.duration,
        channels: recording.channels,
        status: recording.status,
        uri: recording.uri,
        dateCreated: recording.dateCreated,
        mediaUrl: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recording.sid}/Media`
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: recordings.length
      }
    });

  } catch (err) {
    console.error('Error fetching recordings:', err);
    res.status(500).json({ 
      error: 'Failed to fetch recordings',
      details: err.message 
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

module.exports = router; 
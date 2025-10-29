const express = require('express');
const router = express.Router();
const client = require('../config/twilioClient');
const { authenticate: auth } = require('../middleware/auth');
const TwilioCallLog = require('../models/TwilioCallLog');
const UserPhoneNumber = require('../models/UserPhoneNumber');
const { BillingService, MIN_REQUIRED_BALANCE, PHONE_NUMBER_MONTHLY_PRICE, CALL_RATE_PER_MINUTE } = require('../services/BillingService');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// S3 client for audio uploads
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'rankandrent-videos';

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper: transcode audio to phone-grade WAV (8kHz mono µ-law)
const transcodeToPhoneWav = (inputBuffer) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const stream = require('stream');
    const inStream = new stream.PassThrough();
    inStream.end(inputBuffer);

    console.log(`🔄 Transcoding audio: ${inputBuffer.length} bytes input`);

    // Transcode to phone-grade WAV:
    // -ar 8000  -> 8kHz sample rate
    // -ac 1     -> mono channel
    // -codec:a pcm_mulaw -> G.711 μ-law codec (PSTN standard)
    ffmpeg(inStream)
      .inputFormat('webm') // Explicitly specify WebM input format
      .format('wav')
      .audioCodec('pcm_mulaw')
      .audioChannels(1)
      .audioFrequency(8000)
      .on('error', (err) => {
        console.error('FFmpeg transcode error:', err.message);
        reject(err);
      })
      .on('end', () => {
        const result = Buffer.concat(chunks);
        console.log(`✅ Audio transcoded to phone-grade WAV: ${result.length} bytes`);
        resolve(result);
      })
      .pipe()
      .on('data', (chunk) => chunks.push(chunk));
  });

// Multer configuration for audio uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a'
    ];
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files (MP3, WAV, OGG, etc.) are allowed.`), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for whisper audio files
  }
});

// Aggregated usage stats for the authenticated user
router.get('/usage-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [callStats, phoneStats] = await Promise.all([
      TwilioCallLog.getCallStats(userId),
      UserPhoneNumber.getUserPhoneNumberStats(userId)
    ]);

    const totalCalls = Number(callStats?.total_calls || 0);
    const totalDurationSeconds = Number(callStats?.total_duration || 0);
    const totalNumbers = Number(phoneStats?.total_numbers || 0);

    return res.json({
      success: true,
      data: {
        total_calls: totalCalls,
        total_duration_seconds: totalDurationSeconds,
        total_numbers: totalNumbers
      }
    });
  } catch (err) {
    console.error('Error fetching usage stats:', err);
    return res.status(500).json({
      error: 'Failed to fetch usage stats',
      details: err.message
    });
  }
});

// Time remaining endpoint: computes remaining time from free minutes and balance
router.get('/time-remaining', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure monthly free minutes are reset if needed
    await BillingService.ensureMonthlyMinutesReset(userId);

    // Reload user for latest values
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Determine period start for recording sum
    const lastReset = user.free_minutes_last_reset ? new Date(user.free_minutes_last_reset) : null;
    const periodStart = lastReset ? lastReset : new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
    const periodStartStr = periodStart.toISOString().slice(0, 19).replace('T', ' ');

    // Sum recording durations (in seconds) for this user in current period
    const totalRecordingSeconds = await TwilioCallLog.sumRecordingDurationSince(userId, periodStartStr);

    // Convert free minutes to seconds
    const freeMinutesRemaining = parseInt(user.free_minutes_remaining || 0, 10);
    const freeSecondsRemaining = Math.max(0, freeMinutesRemaining * 60 - totalRecordingSeconds);

    // If free seconds are exhausted, compute paid seconds from balance and rate
    let paidSecondsAvailable = 0;
    let perMinuteRate = CALL_RATE_PER_MINUTE; // USD per minute
    let perSecondRate = perMinuteRate / 60.0; // USD per second

    const userBalance = parseFloat(user.balance || 0);
    if (freeSecondsRemaining <= 0 && userBalance > 0 && perSecondRate > 0) {
      paidSecondsAvailable = Math.floor(userBalance / perSecondRate);
    }

    // If free seconds > 0, we do not spend balance yet. Remaining time is freeSecondsRemaining.
    // If free seconds are 0, remaining time is how much paidSecondsAvailable we can afford.
    const totalSecondsAvailable = freeSecondsRemaining > 0 ? freeSecondsRemaining : paidSecondsAvailable;

    return res.json({
      success: true,
      data: {
        period_start: periodStartStr,
        used_recording_seconds: Number(totalRecordingSeconds || 0),
        free_minutes_remaining: freeMinutesRemaining,
        free_seconds_remaining: freeSecondsRemaining,
        balance_usd: userBalance,
        call_rate_per_minute_usd: perMinuteRate,
        paid_seconds_available: paidSecondsAvailable,
        total_seconds_available: totalSecondsAvailable,
        total_minutes_available: Math.floor(totalSecondsAvailable / 60)
      }
    });
  } catch (err) {
    console.error('Error computing time remaining:', err);
    return res.status(500).json({
      error: 'Failed to compute time remaining',
      details: err.message
    });
  }
});

// Generate Twilio Voice Access Token for browser calling
router.get('/access-token', auth, async (req, res) => {
  try {
    console.log('🎫 Generating access token for user:', req.user.id);
    
    // Check environment variables
    console.log('🔍 Environment check:', {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasApiKey: !!process.env.TWILIO_API_KEY,
      hasApiSecret: !!process.env.TWILIO_API_SECRET,
      hasTwiMLAppSid: !!process.env.TWILIO_TWIML_APP_SID,
      hasAppSid: !!process.env.TWILIO_APP_SID,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...',
      apiKey: process.env.TWILIO_API_KEY?.substring(0, 10) + '...',
      twiMLAppSid: process.env.TWILIO_TWIML_APP_SID?.substring(0, 10) + '...'
    });
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET) {
      return res.status(500).json({ 
        error: 'Missing Twilio credentials',
        details: 'TWILIO_ACCOUNT_SID, TWILIO_API_KEY, or TWILIO_API_SECRET not set'
      });
    }
    
    // Check if user has active phone numbers
    const userNumbers = await UserPhoneNumber.findActiveByUserId(req.user.id);
    if (userNumbers.length === 0) {
      return res.status(400).json({ 
        error: 'No active phone numbers found',
        details: 'Please purchase a phone number before making calls'
      });
    }

    // Enforce minimum balance (unless they still have free minutes)
    try {
      await BillingService.ensureMonthlyMinutesReset(req.user.id);
      const refreshedUser = await require('../models/User').findById(req.user.id);
      const freeRemaining = parseInt(refreshedUser.free_minutes_remaining || 0, 10);
      if (freeRemaining <= 0) {
        await BillingService.assertMinBalance(req.user.id);
      }
    } catch (e) {
      return res.status(402).json({
        error: 'Insufficient balance',
        details: e.message,
        minRequired: MIN_REQUIRED_BALANCE
      });
    }
    
    const AccessToken = require('twilio').jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: `user-${req.user.id}` }
    );
    
    // Add voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID || process.env.TWILIO_APP_SID,
      incomingAllow: true
    });
    
    token.addGrant(voiceGrant);
    
    const jwt = token.toJwt();
    console.log('✅ Access token generated successfully');
    
    res.json({ 
      token: jwt,
      identity: `user-${req.user.id}`,
      availableNumbers: userNumbers.map(num => ({
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name
      }))
    });
    
  } catch (error) {
    console.error('❌ Error generating access token:', error);
    res.status(500).json({ 
      error: 'Failed to generate access token',
      details: error.message 
    });
  }
});

// Buy a phone number for the authenticated user
router.post('/buy-number', auth, async (req, res) => {
  try {
    const { phoneNumber, areaCode, country = 'US' } = req.body;
    const userId = req.user.id;
    
    // Check free number entitlement
    await BillingService.ensureMonthlyMinutesReset(userId);
    const user = await require('../models/User').findById(userId);
    const isEligibleForFree = !user.has_claimed_free_number; // one-time free number
    if (!isEligibleForFree) {
      // Enforce minimum balance before purchasing a paid number
      try {
        await BillingService.assertMinBalance(userId);
      } catch (e) {
        return res.status(402).json({
          error: 'Insufficient balance to purchase number',
          details: e.message,
          price: PHONE_NUMBER_MONTHLY_PRICE,
          minRequired: MIN_REQUIRED_BALANCE
        });
      }
    }

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
      monthly_cost: 2.00, // Your monthly price
      capabilities: numberToBuy.capabilities || null
    });

    // Charge or mark as free
    const { charged, nextRenewalAt } = await BillingService.chargeForNumberPurchase(userId, phoneNumberId, isEligibleForFree);

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
      id: phoneNumberId,
      billing: {
        charged,
        nextRenewalAt: nextRenewalAt || null,
        wasFree: isEligibleForFree
      }
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

// Browser calling only - server-side call endpoint removed
// All calls now go through Twilio Voice SDK in the browser

// TwiML endpoint for call handling
router.post('/twiml', async (req, res) => {
  try {
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // Log the request for debugging
    console.log('🎙️ TwiML request received:', {
      body: req.body,
      query: req.query
    });

    // Extract and normalize call parameters (be robust to missing/empty fields)
    const to = (req.body.To || req.query.To || '').trim();
    const from = (req.body.From || req.query.From || '').trim();
    const rawDirection = (req.body.Direction || req.query.Direction || '').toString().toLowerCase();
    const direction = rawDirection || (from && to ? (from.startsWith('+') && to.startsWith('+') ? 'inbound' : '') : '');
    const called = (req.body.Called || req.query.Called || to || '').trim();
    const caller = (req.body.Caller || req.query.Caller || from || '').trim();
    const callSid = (req.body.CallSid || req.query.CallSid || '').trim();
    
    console.log(`📞 Call - Direction: ${direction}, From: ${from}, To: ${to}, Called: ${called}, Caller: ${caller}, CallSid: ${callSid}`);
    
    // Handle browser-to-phone calls (from Twilio Voice SDK)
    // Note: Twilio can sometimes label Client-originated calls as inbound. If Caller starts with 'client:' and To is PSTN, treat as outbound.
    if (to && to.startsWith('+') && (direction !== 'inbound' || (caller && caller.startsWith('client:')))) {
      console.log(`🎙️ Browser calling phone number: ${to}`);
      
      // Create call log entry for browser calls
      if (callSid && from && to) {
        try {
          // Find the user by the from number
          const userPhoneNumber = await UserPhoneNumber.findByPhoneNumber(from);
          if (userPhoneNumber) {
            // Enforce balance/free minutes at call time
            try {
              await BillingService.ensureMonthlyMinutesReset(userPhoneNumber.user_id);
              const refreshedUser = await require('../models/User').findById(userPhoneNumber.user_id);
              const freeRemaining = parseInt(refreshedUser.free_minutes_remaining || 0, 10);
              if (freeRemaining <= 0) {
                await BillingService.assertMinBalance(userPhoneNumber.user_id);
              }
            } catch (e) {
              console.warn('Blocking outbound call due to insufficient balance:', e.message);
              twiml.say('Insufficient balance. Please add funds to your account.');
              twiml.hangup();
              const twimlResponseBlocked = twiml.toString();
              res.type('text/xml');
              return res.send(twimlResponseBlocked);
            }

            await TwilioCallLog.create({
              call_sid: callSid,
              user_id: userPhoneNumber.user_id,
              phone_number_id: userPhoneNumber.id,
              from_number: from,
              to_number: to,
              direction: 'outbound',
              status: 'initiated',
              record: true
            });
            console.log(`✅ Call log created for browser call: ${callSid}`);
          }
        } catch (logError) {
          console.error('❌ Error creating call log:', logError);
          // Continue with call even if logging fails
        }
      }
      
      const dial = twiml.dial({
        callerId: from, // Use user's purchased number as caller ID
        record: 'record-from-answer-dual',
        recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
        recordingStatusCallbackEvent: ['completed'],
        statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });
      dial.number(to);
      
    } else if (direction === 'outbound-api') {
      // Handle legacy API calls (if still used)
      if (to) {
        console.log(`📞 API calling phone number: ${to}`);
        const dial = twiml.dial({ 
          record: 'record-from-answer-dual',
          recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
          recordingStatusCallbackEvent: ['completed'],
          statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });
        dial.number(to);
      } else {
        twiml.say('I\'m sorry, there was an error connecting your call. Please try again.');
        twiml.hangup();
      }
    } else if (direction === 'inbound') {
      // Handle inbound calls to your Twilio number (PSTN to your number or Client)
      console.log(`📞 Inbound call received to: ${called}`);
      
      // Check for call forwarding settings
      try {
        // Use 'Called' if present, otherwise fall back to 'To'
        const phoneNumberToCheck = called || req.body.To;
        console.log(`🔍 Checking phone number: ${phoneNumberToCheck}`);
        
        if (!phoneNumberToCheck) {
          console.log('⚠️ No phone number found in request');
          twiml.say('Hello! Thank you for calling.');
          twiml.pause({ length: 1 });
          twiml.say('This is a Twilio phone system. Goodbye!');
          res.type('text/xml');
          res.send(twiml.toString());
          return;
        }
        
        const userPhoneNumber = await UserPhoneNumber.findByPhoneNumber(phoneNumberToCheck);
        if (userPhoneNumber) {
          try {
            const CallForwarding = require('../models/CallForwarding');
            const forwarding = await CallForwarding.getActiveForwardingForNumber(userPhoneNumber.id);
           
            if (forwarding && forwarding.is_active) {
              console.log(`🔄 Call forwarding active: ${phoneNumberToCheck} -> ${forwarding.forward_to_number}`);
              console.log(`📋 Forwarding details:`, {
                phone_number_id: forwarding.phone_number_id,
                forward_to_number: forwarding.forward_to_number,
                forwarding_type: forwarding.forwarding_type,
                ring_timeout: forwarding.ring_timeout,
                is_active: forwarding.is_active
              });
              
              // Create call log entry for inbound call
              if (callSid) {
                try {
                  await TwilioCallLog.create({
                    call_sid: callSid,
                    user_id: userPhoneNumber.user_id,
                    phone_number_id: userPhoneNumber.id,
                    from_number: caller,
                    to_number: phoneNumberToCheck,
                    direction: 'inbound',
                    status: 'initiated',
                    record: true
                  });
                  console.log(`✅ Call log created for inbound call: ${callSid}`);
                } catch (logError) {
                  console.error('❌ Error creating call log:', logError);
                }
              }
              
              // Forward the call based on forwarding type
              // Extract original caller information for whisper and caller ID
              const originalCaller = (req.body.Caller || req.body.From || req.query.Caller || req.query.From || caller || from || '').trim();
              const calledTwilioNumber = (req.body.Called || req.body.To || phoneNumberToCheck || '').trim();
              
              // Show original caller number - you want to see who's calling regardless of spam labeling
              if (forwarding.forwarding_type === 'always') {
                // Forward immediately with whisper
                const dial = twiml.dial({
                  callerId: originalCaller,      // Show original caller number
                  answerOnBridge: true,            // caller hears ringing during whisper
                  record: 'record-from-answer-dual',
                  recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
                  recordingStatusCallbackEvent: ['completed'],
                  statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
                  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                  statusCallbackMethod: 'POST',
                  timeout: Math.max(15, forwarding.ring_timeout || 20)   // guarantee enough time for whisper
                });
                console.log(`📞 Dialing forward-to number: ${forwarding.forward_to_number} with whisper`);
                console.log(`📞 Original caller: ${originalCaller}, Called number: ${calledTwilioNumber}, CallerId: ${originalCaller}`);
                // Run a private whisper just for the callee leg, then connect
                dial.number(
                  {
                    url: `${process.env.SERVER_URL}/api/twilio/whisper` +
                         `?pn=${encodeURIComponent(calledTwilioNumber)}` +      // which Twilio line was called
                         `&from=${encodeURIComponent(originalCaller)}`,         // who is calling (for whisper announcement)
                    method: 'GET'  // match whisper route
                  },
                  forwarding.forward_to_number
                );
              } else {
                // For other forwarding types, forward immediately with whisper (placeholder for future logic)
                const dial = twiml.dial({
                  callerId: originalCaller,      // Show original caller number
                  answerOnBridge: true,            // caller hears ringing during whisper
                  record: 'record-from-answer-dual',
                  recordingStatusCallback: `${process.env.SERVER_URL}/api/twilio/recording-callback`,
                  recordingStatusCallbackEvent: ['completed'],
                  statusCallback: `${process.env.SERVER_URL}/api/twilio/status-callback`,
                  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                  statusCallbackMethod: 'POST',
                  timeout: Math.max(15, forwarding.ring_timeout || 20)   // guarantee enough time for whisper
                });
                console.log(`📞 Dialing forward-to number: ${forwarding.forward_to_number} with whisper`);
                console.log(`📞 Original caller: ${originalCaller}, Called number: ${calledTwilioNumber}, CallerId: ${originalCaller}`);
                // Run a private whisper just for the callee leg, then connect
                dial.number(
                  {
                    url: `${process.env.SERVER_URL}/api/twilio/whisper` +
                         `?pn=${encodeURIComponent(calledTwilioNumber)}` +      // which Twilio line was called
                         `&from=${encodeURIComponent(originalCaller)}`,         // who is calling (for whisper announcement)
                    method: 'GET'  // match whisper route
                  },
                  forwarding.forward_to_number
                );
              }
            } else {
              // No forwarding active, play default message
              console.log(`📞 No call forwarding active for: ${phoneNumberToCheck}`);
              twiml.say('Hello! Thank you for calling.');
              twiml.pause({ length: 1 });
              twiml.say('This is a Twilio phone system. Goodbye!');
            }
          } catch (forwardingError) {
            console.error('❌ Error checking call forwarding:', forwardingError);
            // Fallback to default message
            twiml.say('Hello! Thank you for calling.');
            twiml.pause({ length: 1 });
            twiml.say('This is a Twilio phone system. Goodbye!');
          }
        } else {
          // Phone number not found in our system
          console.log(`📞 Unknown phone number: ${phoneNumberToCheck}`);
          twiml.say('Hello! Thank you for calling.');
          twiml.pause({ length: 1 });
          twiml.say('This is a Twilio phone system. Goodbye!');
        }
      } catch (forwardingError) {
        console.error('❌ Error checking call forwarding:', forwardingError);
        // Fallback to default message
        twiml.say('Hello! Thank you for calling.');
        twiml.pause({ length: 1 });
        twiml.say('This is a Twilio phone system. Goodbye!');
      }
    } else {
      // Default response for unknown calls
      console.log('⚠️ Unknown call direction or missing parameters');
      twiml.say('Hello! This is your Twilio phone system.');
      twiml.pause({ length: 1 });
      twiml.say('Thank you for calling. Goodbye!');
    }

    const twimlResponse = twiml.toString();
    console.log('📋 TwiML response:', twimlResponse);

    res.type('text/xml');
    res.send(twimlResponse);
    
  } catch (error) {
    console.error('❌ Error in TwiML endpoint:', error);
    
    // Return a basic TwiML response even on error
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('I\'m sorry, there was an error processing your call. Please try again.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Whisper endpoint - plays private message to callee before connecting the call
// BATTLE-HARDENED: Must be unbreakable, always return valid TwiML
// IMPORTANT: Must be GET because Twilio's <Number url="..."> uses GET by default
router.get('/whisper', async (req, res) => {
  const { VoiceResponse } = require('twilio').twiml;
  const twiml = new VoiceResponse();
  
  try {
    console.log('🔊 Whisper endpoint HIT - Query params:', req.query);

    // Safe parameter extraction - never reference undefined vars
    const pn = (req.query.pn || '').trim();       // Twilio DID that was called
    const from = (req.query.from || '').trim();   // Original caller (E.164)
    
    // Safe caller formatting - handle any edge cases
    const digits = from.replace(/^\+/, '').replace(/\D/g, '');
    const callerReadable = digits ? digits.split('').join(' ') : 'unknown caller';
    const label = pn || 'your line'; // Keep it fast, no DB lookup in whisper

    console.log(`🔊 Whisper request: pn=${pn}, from=${from}, callerReadable=${callerReadable}`);

    // Look up whisper configuration (optional - fail gracefully if not found)
    let whisperEnabled = false;
    let whisperText = null;
    let whisperType = 'say';
    let whisperMedia = null;
    
    try {
      if (pn) {
        const num = await UserPhoneNumber.findByPhoneNumber(pn);
        if (num) {
          whisperEnabled = !!num.whisper_enabled;
          whisperText = num.whisper_text;
          whisperType = (num.whisper_type || 'say').toLowerCase();
          whisperMedia = num.whisper_media_url;
        }
      }
    } catch (lookupError) {
      console.warn('Could not lookup phone number for whisper config:', lookupError.message);
      // Continue with defaults - don't fail the whisper
    }

    // Generate whisper content - keep it short (≤ 2-3 seconds max)
    if (whisperEnabled && whisperType === 'play' && whisperMedia) {
      // Pre-recorded audio path
      console.log(`🎵 Playing whisper audio from: ${whisperMedia}`);
      twiml.play(whisperMedia);
    } else if (whisperEnabled && whisperText) {
      // Custom TTS text with template variables
      const finalText = whisperText
        .replace(/\{label\}/g, label)
        .replace(/\{caller\}/g, callerReadable);
      
      // Ensure message is not too long (trim if needed)
      const safeText = finalText.length > 100 ? finalText.substring(0, 97) + '...' : finalText;
      
      console.log(`🗣️ Speaking custom whisper: "${safeText}"`);
      twiml.say({ voice: 'alice', language: 'en-US' }, safeText);
    } else {
      // Default whisper - always works
      let defaultText;
      
      // Check for specific phone numbers with custom messages
      if (pn === '+18645287304' || pn === '8645287304') {
        defaultText = 'This is a junk removal lead from Greenville NC, this is a junk removal lead from Greenville NC.';
        console.log(`🗣️ Speaking Greenville NC whisper: "${defaultText}"`);
      } else if (pn === '+17122145838' || pn === '7122145838') {
        defaultText = 'This is a junk removal lead from Jacksonville Florida, this is a lead from Jacksonville FL.';
        console.log(`🗣️ Speaking Jacksonville FL whisper: "${defaultText}"`);
      } else {
        defaultText = `Incoming call on ${label}. Caller ${callerReadable}.`;
        console.log(`🗣️ Speaking default whisper: "${defaultText}"`);
      }
      
      twiml.say({ voice: 'alice', language: 'en-US' }, defaultText);
    }
    
    // Tiny pause before connecting (always include for stability)
    twiml.pause({ length: 1 });
    
    console.log(`✅ Whisper TwiML generated successfully`);

  } catch (error) {
    console.error('❌ Error in whisper endpoint:', error);
    // Fail-open: return empty <Response/> to allow bridge
    // Don't add any content that could fail
  }

  // CRITICAL: Always return valid TwiML with correct Content-Type header
  const twimlResponse = twiml.toString();
  console.log(`📋 Whisper TwiML response (${twimlResponse.length} chars): ${twimlResponse.substring(0, 200)}...`);
  
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

    // Bill on completion
    try {
      await BillingService.handleCallStatusUpdate(CallSid, CallStatus, CallDuration);
    } catch (billingErr) {
      console.error('Billing error:', billingErr);
      // Don't fail webhook
    }

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
    const { 
      friendly_name, 
      is_active, 
      voice_url, 
      status_callback, 
      status_callback_method, 
      status_callback_event 
    } = req.body;
    const userId = req.user.id;

    // First verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Update local database
    const updateData = {};
    if (friendly_name !== undefined) updateData.friendly_name = friendly_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updated = await UserPhoneNumber.update(id, updateData);

    // Update Twilio phone number configuration if Twilio-specific fields are provided
    if (voice_url || status_callback || status_callback_method || status_callback_event) {
      try {
        const twilioUpdateData = {};
        if (voice_url) twilioUpdateData.voiceUrl = voice_url;
        if (status_callback) twilioUpdateData.statusCallback = status_callback;
        if (status_callback_method) twilioUpdateData.statusCallbackMethod = status_callback_method;
        if (status_callback_event) twilioUpdateData.statusCallbackEvent = status_callback_event;

        await client.incomingPhoneNumbers(userNumber.twilio_sid).update(twilioUpdateData);
        console.log(`✅ Twilio phone number ${userNumber.phone_number} configuration updated`);
      } catch (twilioErr) {
        console.error('❌ Error updating Twilio phone number configuration:', twilioErr);
        // Continue with response even if Twilio update fails
      }
    }

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

// Get whisper configuration for a phone number
router.get('/my-numbers/:id/whisper', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    res.json({
      success: true,
      whisper: {
        enabled: userNumber.whisper_enabled || false,
        type: userNumber.whisper_type || 'say',
        text: userNumber.whisper_text || null,
        voice: userNumber.whisper_voice || 'alice',
        language: userNumber.whisper_language || 'en-US',
        media_url: userNumber.whisper_media_url || null
      }
    });

  } catch (err) {
    console.error('Error fetching whisper settings:', err);
    res.status(500).json({ 
      error: 'Failed to fetch whisper settings',
      details: err.message 
    });
  }
});

// Update whisper configuration for a phone number
router.put('/my-numbers/:id/whisper', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      whisper_enabled,
      whisper_type,
      whisper_text,
      whisper_voice,
      whisper_language,
      whisper_media_url
    } = req.body;

    // Verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Prepare update data
    const updateData = {};
    if (whisper_enabled !== undefined) updateData.whisper_enabled = !!whisper_enabled;
    if (whisper_type !== undefined) {
      if (['say', 'play'].includes(whisper_type.toLowerCase())) {
        updateData.whisper_type = whisper_type.toLowerCase();
      } else {
        return res.status(400).json({ error: 'whisper_type must be "say" or "play"' });
      }
    }
    if (whisper_text !== undefined) updateData.whisper_text = whisper_text;
    if (whisper_voice !== undefined) updateData.whisper_voice = whisper_voice;
    if (whisper_language !== undefined) updateData.whisper_language = whisper_language;
    if (whisper_media_url !== undefined) updateData.whisper_media_url = whisper_media_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Update the whisper settings
    const updated = await UserPhoneNumber.update(id, updateData);

    if (updated) {
      // Fetch updated number to return
      const updatedNumber = await UserPhoneNumber.findById(id);
      
      res.json({
        success: true,
        message: 'Whisper settings updated successfully',
        whisper: {
          enabled: updatedNumber.whisper_enabled || false,
          type: updatedNumber.whisper_type || 'say',
          text: updatedNumber.whisper_text || null,
          voice: updatedNumber.whisper_voice || 'alice',
          language: updatedNumber.whisper_language || 'en-US',
          media_url: updatedNumber.whisper_media_url || null
        }
      });
    } else {
      res.status(400).json({ error: 'Failed to update whisper settings' });
    }

  } catch (err) {
    console.error('Error updating whisper settings:', err);
    res.status(500).json({ 
      error: 'Failed to update whisper settings',
      details: err.message 
    });
  }
});

// Upload whisper audio file to database (with phone-grade transcoding)
router.post('/my-numbers/:id/whisper/upload', auth, audioUpload.single('audio'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify the phone number belongs to the user
    const phoneNumbers = await UserPhoneNumber.findByUserId(userId);
    const userNumber = phoneNumbers.find(num => num.id == id);
    
    if (!userNumber) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`🎵 Uploading whisper audio: ${req.file.originalname}, ${req.file.size} bytes, ${req.file.mimetype}`);

    // 1) Transcode to phone-grade WAV (8kHz mono µ-law)
    console.log('🔄 Transcoding audio to phone-grade WAV...');
    const wavBuffer = await transcodeToPhoneWav(req.file.buffer);
    
    console.log(`✅ Transcode complete: ${wavBuffer.length} bytes (was ${req.file.size} bytes)`);

    // 2) Store transcoded WAV in database
    const db = require('../config/database');
    const result = await db.query(
      `INSERT INTO phone_number_whispers 
       (phone_number_id, mime, bytes, size_bytes, is_active) 
       VALUES (?, ?, ?, ?, 1)`,
      [id, 'audio/wav', wavBuffer, wavBuffer.length]
    );

    const whisperId = result.insertId;

    // 3) Update user_phone_numbers to reference this whisper and enable whisper
    const updateData = {
      whisper_enabled: true,
      whisper_type: 'play',
      active_whisper_id: whisperId,
      whisper_media_url: `${process.env.SERVER_URL}/api/twilio/whisper-audio/${whisperId}`
    };

    const updated = await UserPhoneNumber.update(id, updateData);

    if (updated) {
      console.log(`✅ Whisper audio stored in database with ID: ${whisperId}`);
      res.json({
        success: true,
        message: 'Whisper audio uploaded and transcoded successfully',
        whisper_id: whisperId,
        media_url: updateData.whisper_media_url,
        whisper: {
          enabled: true,
          type: 'play',
          media_url: updateData.whisper_media_url
        },
        transcoding: {
          original_size: req.file.size,
          transcoded_size: wavBuffer.length,
          format: '8kHz mono WAV (µ-law)',
          phone_grade: true
        }
      });
    } else {
      res.status(400).json({ error: 'Failed to update whisper settings' });
    }

  } catch (err) {
    console.error('Error uploading/transcoding whisper audio:', err);
    res.status(500).json({ 
      error: 'Failed to upload/transcode whisper audio',
      details: err.message 
    });
  }
});

// Serve whisper audio file from database
// IMPORTANT: This endpoint must be publicly accessible (no auth) so Twilio can fetch it
router.get('/whisper-audio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎵 Whisper audio endpoint HIT - ID: ${id}`);
    
    const db = require('../config/database');

    // Fetch audio from database
    const rows = await db.query(
      `SELECT mime, bytes, size_bytes FROM phone_number_whispers 
       WHERE id = ? AND is_active = 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      console.log(`⚠️ Whisper audio not found for ID: ${id}`);
      return res.status(404).send('Whisper audio not found');
    }

    const whisper = rows[0];
    console.log(`✅ Serving whisper audio - Size: ${whisper.size_bytes} bytes, MIME: ${whisper.mime}`);
    
    // Set appropriate headers for phone-grade WAV (critical for Twilio)
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', whisper.size_bytes);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS for Twilio
    
    // Twilio needs HTTPS and fast response - send the phone-grade WAV bytes directly
    res.end(whisper.bytes);

  } catch (err) {
    console.error('❌ Error serving whisper audio:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 
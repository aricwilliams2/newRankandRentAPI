const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const User = require('../models/User');
const { MIN_REQUIRED_BALANCE, CALL_RATE_PER_MINUTE, MONTHLY_FREE_MINUTES, PHONE_NUMBER_MONTHLY_PRICE } = require('../services/BillingService');

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      userId: user.id,
      balance: parseFloat(user.balance || 0),
      freeMinutesRemaining: parseInt(user.free_minutes_remaining || 0, 10),
      hasClaimedFreeNumber: !!user.has_claimed_free_number,
      pricing: {
        minRequiredBalance: MIN_REQUIRED_BALANCE,
        callRatePerMinute: CALL_RATE_PER_MINUTE,
        monthlyFreeMinutes: MONTHLY_FREE_MINUTES,
        phoneNumberMonthlyPrice: PHONE_NUMBER_MONTHLY_PRICE,
      },
    });
  } catch (e) {
    console.error('Error fetching billing state:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch billing state' });
  }
});

module.exports = router;



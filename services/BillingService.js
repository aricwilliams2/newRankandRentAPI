const db = require('../config/database');
const User = require('../models/User');

const MIN_REQUIRED_BALANCE = 5.0; // USD
const CALL_RATE_PER_MINUTE = 0.02; // USD/min
const MONTHLY_FREE_MINUTES = 200; // minutes per month
const PHONE_NUMBER_MONTHLY_PRICE = 2.0; // USD/month

class BillingService {
  static async getUserBillingState(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  static async ensureMonthlyMinutesReset(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const lastReset = user.free_minutes_last_reset
      ? new Date(user.free_minutes_last_reset)
      : null;

    const now = new Date();
    const needsReset = !lastReset ||
      lastReset.getUTCFullYear() !== now.getUTCFullYear() ||
      lastReset.getUTCMonth() !== now.getUTCMonth();

    if (needsReset) {
      await User.updateFreeMinutes(user.id, MONTHLY_FREE_MINUTES);
    }
  }

  static async assertMinBalance(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    await this.ensureMonthlyMinutesReset(user.id);
    if (parseFloat(user.balance || 0) < MIN_REQUIRED_BALANCE) {
      const err = new Error('Insufficient balance. Minimum $5 required.');
      err.code = 'INSUFFICIENT_BALANCE';
      throw err;
    }
  }

  static ceilMinutesFromSeconds(seconds) {
    const secs = parseInt(seconds || 0, 10);
    if (!secs || secs <= 0) return 0;
    return Math.ceil(secs / 60);
  }

  static async chargeForCompletedCall(callLog) {
    // callLog must include: call_sid, user_id, duration, is_billed
    if (!callLog || !callLog.user_id || !callLog.call_sid) return;
    if (callLog.is_billed) return; // idempotency guard

    await this.ensureMonthlyMinutesReset(callLog.user_id);

    const minutes = this.ceilMinutesFromSeconds(callLog.duration);
    if (minutes <= 0) {
      // Mark as billed with 0 to avoid reprocessing
      await db.query(
        'UPDATE twilio_call_logs SET is_billed = 1, billed_minutes = 0, billed_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE call_sid = ?',
        [callLog.call_sid]
      );
      return;
    }

    // Fetch latest user values within transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute('SELECT id, balance, free_minutes_remaining FROM users WHERE id = ? FOR UPDATE', [callLog.user_id]);
      if (!userRows || userRows.length === 0) throw new Error('User not found');
      const userRow = userRows[0];

      // Re-check if already billed
      const [callRows] = await connection.execute('SELECT is_billed FROM twilio_call_logs WHERE call_sid = ? FOR UPDATE', [callLog.call_sid]);
      if (callRows && callRows.length && callRows[0].is_billed) {
        await connection.rollback();
        connection.release();
        return;
      }

      const freeRemaining = parseInt(userRow.free_minutes_remaining || 0, 10);
      const freeConsumed = Math.min(freeRemaining, minutes);
      const billableMinutes = Math.max(0, minutes - freeConsumed);
      const amountToCharge = parseFloat((billableMinutes * CALL_RATE_PER_MINUTE).toFixed(2));

      const newFreeRemaining = freeRemaining - freeConsumed;
      const newBalance = parseFloat((parseFloat(userRow.balance || 0) - amountToCharge).toFixed(2));

      await connection.execute('UPDATE users SET free_minutes_remaining = ?, balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newFreeRemaining, newBalance, callLog.user_id]);
      await connection.execute('UPDATE twilio_call_logs SET is_billed = 1, billed_minutes = ?, billed_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE call_sid = ?', [billableMinutes, amountToCharge, callLog.call_sid]);

      await connection.commit();
    } catch (e) {
      try { await connection.rollback(); } catch (_) {}
      throw e;
    } finally {
      connection.release();
    }
  }

  static async handleCallStatusUpdate(callSid, status, durationSeconds) {
    if (status !== 'completed') return; // Only bill on completion

    const rows = await db.query('SELECT call_sid, user_id, duration, is_billed FROM twilio_call_logs WHERE call_sid = ?', [callSid]);
    if (!rows || rows.length === 0) return;
    const callLog = rows[0];
    // Prefer the provided duration if present
    callLog.duration = durationSeconds !== undefined && durationSeconds !== null ? durationSeconds : callLog.duration;
    await this.chargeForCompletedCall(callLog);
  }

  static async chargeForNumberPurchase(userId, phoneNumberId, isFree) {
    await this.ensureMonthlyMinutesReset(userId);

    if (isFree) {
      // Mark number as free and set user flag
      await db.query('UPDATE user_phone_numbers SET is_free = 1, next_renewal_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [phoneNumberId]);
      await db.query('UPDATE users SET has_claimed_free_number = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
      return { charged: 0, nextRenewalAt: null };
    }

    // Deduct immediate monthly fee and set next renewal in 30 days
    const nextRenewal = new Date();
    nextRenewal.setUTCDate(nextRenewal.getUTCDate() + 30);
    const nextRenewalStr = nextRenewal.toISOString().slice(0, 19).replace('T', ' ');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [userRows] = await connection.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (!userRows || userRows.length === 0) throw new Error('User not found');
      const balance = parseFloat(userRows[0].balance || 0);
      const newBalance = parseFloat((balance - PHONE_NUMBER_MONTHLY_PRICE).toFixed(2));
      await connection.execute('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, userId]);
      await connection.execute('UPDATE user_phone_numbers SET is_free = 0, next_renewal_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nextRenewalStr, phoneNumberId]);
      await connection.commit();
    } catch (e) {
      try { await connection.rollback(); } catch (_) {}
      throw e;
    } finally {
      connection.release();
    }

    return { charged: PHONE_NUMBER_MONTHLY_PRICE };
  }
}

module.exports = {
  BillingService,
  MIN_REQUIRED_BALANCE,
  CALL_RATE_PER_MINUTE,
  MONTHLY_FREE_MINUTES,
  PHONE_NUMBER_MONTHLY_PRICE,
};



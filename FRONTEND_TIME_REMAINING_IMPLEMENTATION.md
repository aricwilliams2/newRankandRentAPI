## Frontend Guide: Displaying Remaining Calling Time

This guide explains how to fetch and display a user’s remaining calling time using the new backend endpoint added in `routes/twilioRoutes.js`.

### What it shows
- **Free time remaining**: derived from the user’s monthly free minutes minus the sum of all call `recording_duration` seconds recorded this month.
- **Paid time available**: if free is exhausted, calculated from `users.balance` at `CALL_RATE_PER_MINUTE`.
- **Total time available**: free seconds remaining if any; otherwise paid seconds available.

### Endpoint
- **Method**: GET
- **Path**: `/api/twilio/time-remaining`
- **Auth**: Bearer JWT required (same as other Twilio endpoints)

### Response shape
```ts
export interface TimeRemainingResponse {
  success: boolean;
  data: {
    period_start: string; // ISO-like string (YYYY-MM-DD HH:mm:ss) – start of current billing period
    used_recording_seconds: number; // seconds of recordings this period
    free_minutes_remaining: number; // integer minutes left on plan in DB
    free_seconds_remaining: number; // derived seconds = free_minutes_remaining*60 - used_recording_seconds
    balance_usd: number; // user balance
    call_rate_per_minute_usd: number; // current call rate (USD/min)
    paid_seconds_available: number; // seconds purchasable from balance if free is 0
    total_seconds_available: number; // if free>0: free seconds; else: paid seconds
    total_minutes_available: number; // floor(total_seconds_available/60)
  };
}
```

### Usage example (TypeScript + fetch)
```ts
// api/timeRemaining.ts
export async function fetchTimeRemaining(apiBase: string, token: string, signal?: AbortSignal) {
  const res = await fetch(`${apiBase}/api/twilio/time-remaining`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as TimeRemainingResponse;
}
```

### React hook
```tsx
// hooks/useTimeRemaining.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useTimeRemaining(apiBase: string, token: string | null) {
  const [data, setData] = useState<TimeRemainingResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/twilio/time-remaining`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as TimeRemainingResponse;
      setData(json.data);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => { reload(); }, [reload]);

  const summary = useMemo(() => {
    if (!data) return null;
    const freeSec = Math.max(0, data.free_seconds_remaining);
    const paidSec = Math.max(0, data.paid_seconds_available);
    const totalSec = Math.max(0, data.total_seconds_available);
    const toMin = (s: number) => Math.floor(s / 60);
    return {
      freeSeconds: freeSec,
      freeMinutes: toMin(freeSec),
      paidSeconds: paidSec,
      paidMinutes: toMin(paidSec),
      totalSeconds: totalSec,
      totalMinutes: toMin(totalSec),
      ratePerMinuteUsd: data.call_rate_per_minute_usd,
      balanceUsd: data.balance_usd,
      periodStart: data.period_start,
      usedRecordingSeconds: data.used_recording_seconds,
    };
  }, [data]);

  return { data, summary, loading, error, reload };
}
```

### Simple UI component
```tsx
// components/TimeRemainingBadge.tsx
import React from 'react';

export function TimeRemainingBadge({ totalMinutes, freeMinutes }: { totalMinutes: number; freeMinutes: number }) {
  const low = totalMinutes <= 5; // warn when 5 minutes or less
  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontWeight: 600 }}>Time Left:</span>
      <span style={{
        padding: '2px 8px',
        borderRadius: 999,
        color: low ? '#9a1c1c' : '#0b5d1e',
        background: low ? '#fde2e2' : '#e6f4ea',
        border: `1px solid ${low ? '#f5bcbc' : '#bfe3c7'}`,
      }}>
        {totalMinutes} min {freeMinutes > 0 ? `(free ${freeMinutes}m)` : '(paid)'}
      </span>
    </div>
  );
}
```

### Integrate in a page
```tsx
// Example usage inside a page/component
import React, { useMemo } from 'react';
import { useTimeRemaining } from '../hooks/useTimeRemaining';
import { TimeRemainingBadge } from '../components/TimeRemainingBadge';

export function CallingDashboard({ apiBase, token }: { apiBase: string; token: string }) {
  const { summary, loading, error, reload } = useTimeRemaining(apiBase, token);

  const freeMinutes = useMemo(() => summary?.freeMinutes ?? 0, [summary]);
  const totalMinutes = useMemo(() => summary?.totalMinutes ?? 0, [summary]);

  if (loading && !summary) return <div>Loading time remaining…</div>;
  if (error) return <div>Failed to load time remaining</div>;
  return (
    <div>
      {summary && <TimeRemainingBadge totalMinutes={totalMinutes} freeMinutes={freeMinutes} />}
      <button onClick={reload} style={{ marginLeft: 12 }}>Refresh</button>
    </div>
  );
}
```

### Refresh recommendations
- **On app load / dashboard mount**: fetch once.
- **After a call ends**: re-fetch. The backend uses `recording_duration`, which arrives via Twilio recording callback; it can lag by a few seconds after call completion.
- **On tab focus**: optional re-fetch to keep display fresh.
- **Manual refresh**: provide a small refresh icon/button.

### UX suggestions
- **Thresholds**: warn at ≤ 5 minutes; hard-stop actions only happen server-side when free is 0 and balance is insufficient (already enforced in `/api/twilio/access-token` and TwiML flows).
- **Breakdown**: show free time remaining; only show paid time if free is 0.
- **Progress**: optional progress bar of monthly free quota consumption using `used_recording_seconds` vs `(free_minutes_remaining + used_recording_seconds/60)`.

### Error handling
- **401/403**: redirect to login or prompt to re-auth.
- **402 Insufficient balance**: not applicable here (endpoint won’t 402), but calling flows may. Consider linking to your add-funds page when total minutes are 0.
- **Network errors**: show a non-blocking toast and allow retry.

### Testing tips
1. Seed calls with `recording_duration` and verify the numbers decrease as expected.
2. Set `users.free_minutes_remaining = 0` and non-zero `balance` to test paid time calculation.
3. Toggle `CALL_RATE_PER_MINUTE` server-side in `services/BillingService.js` to see impact.
4. Verify monthly reset behavior by clearing `free_minutes_last_reset` or moving system date (or mock at DB level).

### Notes
- Backend auto-resets free minutes monthly; the frontend does not need to handle resets.
- The calculation is based on `twilio_call_logs.recording_duration`. If you prefer to base UI on total call `duration`, coordinate a backend change first.



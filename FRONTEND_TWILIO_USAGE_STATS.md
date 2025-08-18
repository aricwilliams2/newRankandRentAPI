### Frontend: Twilio Usage Stats (Totals)

This shows how to fetch the authenticated user's total call duration, total call count, and total owned phone numbers.

### Endpoint

- Method: GET
- Path: `/api/twilio/usage-stats`
- Auth: Requires `Authorization: Bearer <token>`

### Response

```json
{
  "success": true,
  "data": {
    "total_calls": 42,
    "total_duration_seconds": 1234,
    "total_numbers": 3
  }
}
```

### Using the prebuilt API helper

`src/api/twilioApi.ts` exposes `twilioApi.getUsageStats()`.

```ts
import { twilioApi } from '@/api/twilioApi';

export async function fetchUsage() {
  const res = await twilioApi.getUsageStats();
  return res.data; // { total_calls, total_duration_seconds, total_numbers }
}
```

### Simple React example

```tsx
import { useEffect, useState } from 'react';
import { twilioApi } from '@/api/twilioApi';

export function UsageStatsCard() {
  const [stats, setStats] = useState<{ total_calls: number; total_duration_seconds: number; total_numbers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await twilioApi.getUsageStats();
        setStats(res.data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading usage…</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  const minutes = Math.floor(stats.total_duration_seconds / 60);
  const seconds = stats.total_duration_seconds % 60;

  return (
    <div>
      <div>Total calls: {stats.total_calls}</div>
      <div>Total duration: {minutes}m {seconds}s</div>
      <div>Owned numbers: {stats.total_numbers}</div>
    </div>
  );
}
```




## Frontend: Show User Analytics History

This guide explains how to display a user's stored analytics history using the new API endpoints. Each analytics fetch is saved as a snapshot associated with the logged-in user.

### Endpoints
- GET `/api/analytics-snapshots` (auth required)
  - Query: `limit` (default 50, max 200), `offset` (default 0)
  - Returns: `{ data: Array<{ id, url, mode, created_at }>, total }`

- GET `/api/analytics-snapshots/:id` (auth required)
  - Returns: `{ data: { id, user_id, url, mode, snapshot_json, created_at } }`
  - `snapshot_json` is the saved analytics payload (JSON string)

### TypeScript types
```ts
export type AnalyticsSnapshotListItem = {
  id: number;
  url: string | null;
  mode: string | null;
  created_at: string; // ISO date
};

export type AnalyticsSnapshotDetail = {
  id: number;
  user_id: number;
  url: string | null;
  mode: string | null;
  snapshot_json?: string; // some drivers return string
  snapshot?: AnalyticsPayload; // API also returns a parsed object in `snapshot`
  created_at: string;
};

export type AnalyticsPayload = {
  history?: any[];
  top_keywords?: any[];
  top_pages?: any[];
  [k: string]: any;
};
```

### Fetch helpers
```ts
export async function fetchSnapshots(token: string, opts?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));

  const res = await fetch(`/api/analytics-snapshots?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { data: AnalyticsSnapshotListItem[]; total: number };
}

export async function fetchSnapshotDetail(token: string, id: number) {
  const res = await fetch(`/api/analytics-snapshots/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { data: AnalyticsSnapshotDetail };
}

export async function deleteSnapshot(token: string, id: number) {
  const res = await fetch(`/api/analytics-snapshots/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
```

### List UI (React)
```tsx
import React, { useEffect, useState } from 'react';

export function AnalyticsHistoryList({ token, onOpenSnapshot }: { token: string; onOpenSnapshot: (id: number) => void }) {
  const [items, setItems] = useState<AnalyticsSnapshotListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await fetchSnapshots(token, { limit, offset });
        setItems(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, limit, offset]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</button>
        <button onClick={() => setOffset(offset + limit)}>Next</button>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <table width="100%" cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Date</th>
            <th align="left">URL</th>
            <th align="left">Mode</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{new Date(item.created_at).toLocaleString()}</td>
              <td>{item.url || '-'}</td>
              <td>{item.mode || '-'}</td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onOpenSnapshot(item.id)}>View</button>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this snapshot?')) return;
                    try {
                      await deleteSnapshot(token, item.id);
                      // simple refresh
                      const { data } = await fetchSnapshots(token, { limit, offset });
                      setItems(data);
                    } catch (e: any) {
                      alert(e.message || 'Delete failed');
                    }
                  }}
                >Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Snapshot detail (parse and display)
You can render your existing analytics components using the stored payload. The detail response contains `snapshot_json` as a string—parse first.

```tsx
import React, { useEffect, useState } from 'react';

export function AnalyticsSnapshotDetailModal({ token, id, onClose }: { token: string; id: number; onClose: () => void }) {
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await fetchSnapshotDetail(token, id);
        const parsed = data.snapshot || (data.snapshot_json ? JSON.parse(data.snapshot_json) : {});
        setPayload(parsed as AnalyticsPayload);
      } catch (e: any) {
        setError(e.message || 'Failed to load snapshot');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id]);

  return (
    <div className="modal">
      <div className="modal-body">
        <button onClick={onClose}>Close</button>
        {loading && <div>Loading…</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {payload && (
          <div>
            {/* Replace with your existing analytics components */}
            <h3>Traffic History</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload.history || [], null, 2)}</pre>

            <h3>Top Keywords</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload.top_keywords || [], null, 2)}</pre>

            <h3>Top Pages</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(payload.top_pages || [], null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Putting it together
```tsx
export function AnalyticsHistoryPanel({ token }: { token: string }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <div>
      <h2>Analytics History</h2>
      <AnalyticsHistoryList token={token} onOpenSnapshot={(id) => setOpenId(id)} />
      {openId != null && (
        <AnalyticsSnapshotDetailModal token={token} id={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}
```

### Notes
- Authentication: include `Authorization: Bearer <token>` for both endpoints.
- Pagination: use `limit` and `offset` to page through results.
- Rendering: instead of `<pre>`, plug the parsed payload into your existing analytics chart/table components for a consistent look.
- Storage: snapshots are created automatically whenever the authenticated user fetches `/api/website-traffic`.



## Frontend: Delete an Analytics History Record

This guide shows how to add a "Delete" action for stored analytics snapshots.

### Endpoint
- Method: DELETE
- Path: `/api/analytics-snapshots/:id`
- Auth: `Authorization: Bearer <token>`

### Minimal helper
```ts
export async function deleteSnapshot(token: string, id: number) {
  const res = await fetch(`/api/analytics-snapshots/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
```

### Add a Delete button to your list
```tsx
import React from 'react';

export function SnapshotRow({ token, item, onDeleted }: {
  token: string;
  item: { id: number; url?: string | null; mode?: string | null; created_at: string };
  onDeleted: () => void; // refresh callback
}) {
  const handleDelete = async () => {
    if (!confirm('Delete this snapshot?')) return;
    try {
      await deleteSnapshot(token, item.id);
      onDeleted();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <tr>
      <td>{new Date(item.created_at).toLocaleString()}</td>
      <td>{item.url || '-'}</td>
      <td>{item.mode || '-'}</td>
      <td>
        <button onClick={handleDelete}>Delete</button>
      </td>
    </tr>
  );
}
```

### Refresh pattern
- After delete, re-fetch the list (simple) or optimistically update UI by filtering the removed `id` out of state.

Simple refresh example:
```ts
// After successful delete
const { data } = await fetchSnapshots(token, { limit, offset });
setItems(data);
```

Optimistic update example:
```ts
setItems(prev => prev.filter(x => x.id !== item.id));
```

### UX tips
- Ask for confirmation before deleting.
- Disable the button during the request to avoid double-clicks.
- Show a toast/snackbar on success/failure.



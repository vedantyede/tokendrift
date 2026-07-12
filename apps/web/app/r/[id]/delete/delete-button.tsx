'use client';

import { useState } from 'react';

export function DeleteButton({ id, token }: { id: string; token: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>(
    token ? 'idle' : 'error',
  );
  const [message, setMessage] = useState(token ? '' : 'This link is missing its deletion token.');

  async function handleDelete() {
    setStatus('working');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deletionToken: token }),
      });
      if (res.status === 204) {
        setStatus('done');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setStatus('error');
      setMessage(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Request failed.');
    }
  }

  if (status === 'done') {
    return <p style={{ color: 'var(--token)' }}>Report deleted. It no longer exists.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
      <button
        onClick={handleDelete}
        disabled={status === 'working' || !token}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 600,
          padding: '12px 20px',
          borderRadius: 3,
          border: 'none',
          background: 'var(--drift)',
          color: 'var(--paper-raised)',
          cursor: token ? 'pointer' : 'not-allowed',
        }}
      >
        {status === 'working' ? 'Deleting…' : 'Delete this report'}
      </button>
      {status === 'error' && <p style={{ color: 'var(--drift)', fontSize: 14.5 }}>{message}</p>}
    </div>
  );
}

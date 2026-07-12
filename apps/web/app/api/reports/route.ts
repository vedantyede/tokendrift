import { NextRequest, NextResponse } from 'next/server';
import { getStore, REPORT_TTL_SECONDS } from '@/lib/store';
import { generateId, generateDeletionToken, hashToken } from '@/lib/id';
import { validateSharePayload, MAX_PAYLOAD_BYTES } from '@/lib/validate';

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const payload = validateSharePayload(body);
  if (!payload) {
    return NextResponse.json({ error: 'invalid report payload' }, { status: 400 });
  }

  const id = generateId();
  const deletionToken = generateDeletionToken();
  const now = Date.now();

  const store = await getStore();
  await store.put(
    id,
    {
      aggregate: payload.aggregate,
      meta: payload.meta,
      deletionTokenHash: hashToken(deletionToken),
      createdAt: now,
      expiresAt: now + REPORT_TTL_SECONDS * 1000,
    },
    REPORT_TTL_SECONDS,
  );

  return NextResponse.json(
    { id, url: `${req.nextUrl.origin}/r/${id}`, deletionToken },
    { status: 201 },
  );
}

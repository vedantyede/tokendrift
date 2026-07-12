import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { tokensMatch } from '@/lib/id';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const deletionToken = (body as { deletionToken?: unknown } | null)?.deletionToken;
  if (typeof deletionToken !== 'string' || deletionToken.length === 0) {
    return NextResponse.json({ error: 'deletionToken required' }, { status: 400 });
  }

  const store = await getStore();
  const report = await store.get(id);
  if (!report) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!tokensMatch(deletionToken, report.deletionTokenHash)) {
    return NextResponse.json({ error: 'invalid deletion token' }, { status: 403 });
  }

  await store.remove(id);
  return new NextResponse(null, { status: 204 });
}

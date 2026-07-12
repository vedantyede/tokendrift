import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { REPORT_TTL_SECONDS } from '@/lib/store';

// Redis expires the report:{id} lookup key via TTL, but that only removes
// the pointer — the underlying blob (public, unguessable URL) would stay
// live forever otherwise. Vercel Cron hits this on a schedule (see
// vercel.json) to delete blobs older than the same TTL, so "auto-expire
// after 90 days" (PRD F9) is actually true end to end.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = Date.now() - REPORT_TTL_SECONDS * 1000;
  let cursor: string | undefined;
  let deleted = 0;
  let scanned = 0;

  for (;;) {
    const page = await list({ prefix: 'reports/', cursor, limit: 1000 });
    scanned += page.blobs.length;
    const stale = page.blobs.filter((b) => b.uploadedAt.getTime() < cutoff);
    if (stale.length > 0) {
      await del(stale.map((b) => b.url));
      deleted += stale.length;
    }
    if (!page.hasMore) break;
    cursor = page.cursor;
  }

  return NextResponse.json({ scanned, deleted });
}

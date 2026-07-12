import { NextRequest } from 'next/server';
import { getBadgeStore } from '@/lib/badgeStore';
import { renderScoreBadge } from '@/lib/badgeSvg';

// README badges are re-fetched on every view of the file (GitHub proxies
// them through camo, which itself caches), so a short cache window keeps
// this cheap without going stale for long after a new scan.
const CACHE_CONTROL = 'public, max-age=300, s-maxage=300';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.svg$/i, '');

  const store = await getBadgeStore();
  const entry = await store.get(slug);

  const svg = renderScoreBadge(entry?.score ?? null);

  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': CACHE_CONTROL,
    },
  });
}

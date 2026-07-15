import { NextRequest } from 'next/server';
import { renderReport } from 'tokensdrift/report';
import { getStore } from '@/lib/store';
import { getStatsStore } from '@/lib/statsStore';

// A route handler (not a page component) so the hosted report is served as
// the exact same static HTML string the CLI writes locally — one renderer,
// two destinations (see CLAUDE.md).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const store = await getStore();
  const report = await store.get(id);
  if (!report) {
    return new Response('Report not found or expired.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const statsStore = await getStatsStore();
  await statsStore.incrementView(id);

  const html = renderReport(report.aggregate, {
    rootDir: report.meta.label,
    generatedAt: report.meta.generatedAt,
    toolVersion: report.meta.toolVersion,
    reportId: id,
    teardownTitle: report.meta.teardownTitle,
    teardownNote: report.meta.teardownNote,
  });

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

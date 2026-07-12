import { NextRequest } from 'next/server';
import { renderReport } from 'tokendrift/report';
import { getStore } from '@/lib/store';

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

  const html = renderReport(report.aggregate, {
    rootDir: report.meta.label,
    generatedAt: report.meta.generatedAt,
    toolVersion: report.meta.toolVersion,
  });

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

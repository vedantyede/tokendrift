import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { ReportStore, StoredReport } from './store.js';

// Local dev/testing only — no persistent filesystem on serverless deploys.
// TTL is enforced lazily on read since plain files have no native expiry.
const DATA_DIR = path.join(process.cwd(), '.data', 'reports');

function filePath(id: string): string {
  // `id` is always our own generated base64url string, but guard against
  // path traversal from any unexpected caller regardless.
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export function createFsStore(): ReportStore {
  return {
    async put(id, report) {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(filePath(id), JSON.stringify(report), 'utf8');
    },

    async get(id) {
      let raw: string;
      try {
        raw = await readFile(filePath(id), 'utf8');
      } catch {
        return null;
      }
      const report = JSON.parse(raw) as StoredReport;
      if (Date.now() > report.expiresAt) {
        await unlink(filePath(id)).catch(() => {});
        return null;
      }
      return report;
    },

    async remove(id) {
      await unlink(filePath(id)).catch(() => {});
    },
  };
}

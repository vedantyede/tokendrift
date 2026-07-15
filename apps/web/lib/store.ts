import type { ScanAggregate, ShareMeta } from 'tokensdrift/types';

export interface StoredReport {
  aggregate: ScanAggregate;
  meta: ShareMeta;
  deletionTokenHash: string;
  createdAt: number;
  expiresAt: number;
}

export interface ReportStore {
  put(id: string, report: StoredReport, ttlSeconds: number): Promise<void>;
  get(id: string): Promise<StoredReport | null>;
  remove(id: string): Promise<void>;
}

// Reports auto-expire after 90 days unless claimed by an account (F9) —
// account claiming isn't built yet (Phase 3+), so this is currently a hard TTL.
export const REPORT_TTL_SECONDS = 90 * 24 * 60 * 60;

let cachedStore: Promise<ReportStore> | null = null;

export function getStore(): Promise<ReportStore> {
  if (cachedStore) return cachedStore;

  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasRedis =
    Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  cachedStore = (async () => {
    if (hasBlob && hasRedis) {
      const { createVercelStore } = await import('./store.vercel');
      return createVercelStore();
    }

    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'tokensdrift: BLOB_READ_WRITE_TOKEN / KV_REST_API_URL+KV_REST_API_TOKEN are not set — ' +
          'falling back to local filesystem storage, which does not work on serverless deploys.',
      );
    }
    const { createFsStore } = await import('./store.fs');
    return createFsStore();
  })();

  return cachedStore;
}

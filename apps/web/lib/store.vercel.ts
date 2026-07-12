import { put, del } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import type { ReportStore, StoredReport } from './store.js';

interface RedisEntry {
  blobUrl: string;
  deletionTokenHash: string;
  createdAt: number;
  expiresAt: number;
}

function redisKey(id: string): string {
  return `report:${id}`;
}

function blobPathname(id: string): string {
  return `reports/${id}.json`;
}

function redisClient(): Redis {
  // Vercel's KV integration has historically injected KV_REST_API_* env
  // vars; the current Upstash-via-Marketplace integration may use
  // UPSTASH_REDIS_REST_* instead. Support both.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Redis env vars not configured (KV_REST_API_* or UPSTASH_REDIS_REST_*)');
  }
  return new Redis({ url, token });
}

export function createVercelStore(): ReportStore {
  const redis = redisClient();

  return {
    async put(id, report, ttlSeconds) {
      const blob = await put(blobPathname(id), JSON.stringify({ aggregate: report.aggregate, meta: report.meta }), {
        access: 'public',
        addRandomSuffix: true,
        contentType: 'application/json',
      });

      const entry: RedisEntry = {
        blobUrl: blob.url,
        deletionTokenHash: report.deletionTokenHash,
        createdAt: report.createdAt,
        expiresAt: report.expiresAt,
      };
      await redis.set(redisKey(id), JSON.stringify(entry), { ex: ttlSeconds });
    },

    async get(id) {
      const raw = await redis.get<string>(redisKey(id));
      if (!raw) return null;
      const entry: RedisEntry = typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as RedisEntry);

      const res = await fetch(entry.blobUrl);
      if (!res.ok) return null;
      const { aggregate, meta } = (await res.json()) as Pick<StoredReport, 'aggregate' | 'meta'>;

      return {
        aggregate,
        meta,
        deletionTokenHash: entry.deletionTokenHash,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
      };
    },

    async remove(id) {
      const raw = await redis.get<string>(redisKey(id));
      if (raw) {
        const entry: RedisEntry = typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as RedisEntry);
        await del(entry.blobUrl).catch(() => {});
      }
      await redis.del(redisKey(id));
    },
  };
}

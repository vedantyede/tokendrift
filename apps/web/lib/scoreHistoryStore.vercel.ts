import { Redis } from '@upstash/redis';
import { MAX_HISTORY_ENTRIES, type ScoreHistoryEntry, type ScoreHistoryStore } from './scoreHistoryStore';

function redisKey(slug: string): string {
  return `score-history:${slug}`;
}

function redisClient(): Redis {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Redis env vars not configured (KV_REST_API_* or UPSTASH_REDIS_REST_*)');
  }
  return new Redis({ url, token });
}

async function readEntries(redis: Redis, slug: string): Promise<ScoreHistoryEntry[]> {
  const raw = await redis.get<string>(redisKey(slug));
  if (!raw) return [];
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as ScoreHistoryEntry[];
}

export function createVercelScoreHistoryStore(): ScoreHistoryStore {
  const redis = redisClient();

  return {
    async append(slug, entry) {
      // Same persist-indefinitely rule as badgeStore — a repo's trend outlives
      // any single report's 90-day TTL for as long as it keeps getting scanned.
      const entries = [...(await readEntries(redis, slug)), entry].slice(-MAX_HISTORY_ENTRIES);
      await redis.set(redisKey(slug), JSON.stringify(entries));
    },

    async list(slug) {
      return readEntries(redis, slug);
    },
  };
}

import { Redis } from '@upstash/redis';
import type { BadgeEntry, BadgeStore } from './badgeStore.js';

function redisKey(slug: string): string {
  return `badge:${slug}`;
}

function redisClient(): Redis {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Redis env vars not configured (KV_REST_API_* or UPSTASH_REDIS_REST_*)');
  }
  return new Redis({ url, token });
}

export function createVercelBadgeStore(): BadgeStore {
  const redis = redisClient();

  return {
    async put(slug, entry) {
      // Badges persist independently of any single report's TTL — a repo
      // that keeps getting scanned should keep a live badge indefinitely.
      await redis.set(redisKey(slug), JSON.stringify(entry));
    },

    async get(slug) {
      const raw = await redis.get<string>(redisKey(slug));
      if (!raw) return null;
      return (typeof raw === 'string' ? JSON.parse(raw) : raw) as BadgeEntry;
    },
  };
}

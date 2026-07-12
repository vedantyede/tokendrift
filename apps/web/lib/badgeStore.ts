export interface BadgeEntry {
  reportId: string;
  score: number;
  updatedAt: number;
}

export interface BadgeStore {
  put(slug: string, entry: BadgeEntry): Promise<void>;
  get(slug: string): Promise<BadgeEntry | null>;
}

let cachedStore: Promise<BadgeStore> | null = null;

export function getBadgeStore(): Promise<BadgeStore> {
  if (cachedStore) return cachedStore;

  const hasRedis =
    Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  cachedStore = (async () => {
    if (hasRedis) {
      const { createVercelBadgeStore } = await import('./badgeStore.vercel');
      return createVercelBadgeStore();
    }
    const { createFsBadgeStore } = await import('./badgeStore.fs');
    return createFsBadgeStore();
  })();

  return cachedStore;
}

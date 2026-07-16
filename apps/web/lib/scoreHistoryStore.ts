export interface ScoreHistoryEntry {
  reportId: string;
  score: number;
  createdAt: number;
}

export interface ScoreHistoryStore {
  append(slug: string, entry: ScoreHistoryEntry): Promise<void>;
  list(slug: string): Promise<ScoreHistoryEntry[]>;
}

// Caps how many points a repo's trend can hold — old points fall off the
// front so the store can't grow unbounded for a repo scanned constantly in CI.
export const MAX_HISTORY_ENTRIES = 30;

let cachedStore: Promise<ScoreHistoryStore> | null = null;

export function getScoreHistoryStore(): Promise<ScoreHistoryStore> {
  if (cachedStore) return cachedStore;

  const hasRedis =
    Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  cachedStore = (async () => {
    if (hasRedis) {
      const { createVercelScoreHistoryStore } = await import('./scoreHistoryStore.vercel');
      return createVercelScoreHistoryStore();
    }
    const { createFsScoreHistoryStore } = await import('./scoreHistoryStore.fs');
    return createFsScoreHistoryStore();
  })();

  return cachedStore;
}

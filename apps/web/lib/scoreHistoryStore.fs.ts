import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_HISTORY_ENTRIES, type ScoreHistoryEntry, type ScoreHistoryStore } from './scoreHistoryStore';

const DATA_DIR = path.join(process.cwd(), '.data', 'score-history');

function filePath(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

async function readEntries(slug: string): Promise<ScoreHistoryEntry[]> {
  try {
    return JSON.parse(await readFile(filePath(slug), 'utf8')) as ScoreHistoryEntry[];
  } catch {
    return [];
  }
}

export function createFsScoreHistoryStore(): ScoreHistoryStore {
  return {
    async append(slug, entry) {
      const entries = [...(await readEntries(slug)), entry].slice(-MAX_HISTORY_ENTRIES);
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(filePath(slug), JSON.stringify(entries), 'utf8');
    },

    async list(slug) {
      return readEntries(slug);
    },
  };
}

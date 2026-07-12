import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BadgeEntry, BadgeStore } from './badgeStore.js';

const DATA_DIR = path.join(process.cwd(), '.data', 'badges');

function filePath(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

export function createFsBadgeStore(): BadgeStore {
  return {
    async put(slug, entry) {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(filePath(slug), JSON.stringify(entry), 'utf8');
    },

    async get(slug) {
      try {
        return JSON.parse(await readFile(filePath(slug), 'utf8')) as BadgeEntry;
      } catch {
        return null;
      }
    },
  };
}

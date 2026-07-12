import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

function findGitConfig(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, '.git', 'config');
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      // not here — walk up
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function normalizeRemoteUrl(url: string): string {
  return url
    .trim()
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^ssh:\/\//, 'https://')
    .replace(/\.git$/, '')
    .toLowerCase();
}

/**
 * A stable identity for "the same repo" across separate --share runs, so a
 * README badge can track the latest score rather than one frozen snapshot.
 * Derived from the origin remote in .git/config — no git binary required,
 * no account/login. Returns null if there's no git repo or no origin
 * remote (badge registration is then skipped; --share itself still works).
 */
export function deriveRepoSlug(rootDir: string): string | null {
  const configPath = findGitConfig(rootDir);
  if (!configPath) return null;

  let content: string;
  try {
    content = readFileSync(configPath, 'utf8');
  } catch {
    return null;
  }

  const match = content.match(/\[remote "origin"\][^[]*?\burl\s*=\s*(\S+)/);
  if (!match || !match[1]) return null;

  const normalized = normalizeRemoteUrl(match[1]);
  return createHash('sha256').update(normalized).digest('base64url').slice(0, 20);
}

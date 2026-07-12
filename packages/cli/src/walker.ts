import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { IgnoreMatcher, toPosix } from './ignore.js';
import type { TokenDriftConfig } from './config.js';

export const SCANNED_EXTENSIONS: readonly string[] = [
  '.css',
  '.scss',
  '.tsx',
  '.jsx',
  '.ts',
  '.js',
];

export interface WalkedFile {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the scan root, posix-separated. */
  relPath: string;
}

/**
 * Recursively walks `rootDir`, returning every file with a scanned extension
 * that isn't excluded by the default ignore rules, `.gitignore` files
 * encountered along the way, or `config.ignore` patterns. Results are sorted
 * by relative path for deterministic scan ordering (N4).
 */
export async function walk(
  rootDir: string,
  config: TokenDriftConfig,
): Promise<WalkedFile[]> {
  const matcher = new IgnoreMatcher();
  for (const pattern of config.ignore) {
    matcher.addPattern(pattern, '');
  }
  await matcher.addGitignoreFile(path.join(rootDir, '.gitignore'), '');

  const results: WalkedFile[] = [];
  await walkDir(rootDir, rootDir, matcher, results);
  results.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return results;
}

async function walkDir(
  rootDir: string,
  currentDir: string,
  matcher: IgnoreMatcher,
  results: WalkedFile[],
): Promise<void> {
  const relDir = toPosix(path.relative(rootDir, currentDir));
  if (relDir) {
    await matcher.addGitignoreFile(path.join(currentDir, '.gitignore'), relDir);
  }

  let entries;
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absPath = path.join(currentDir, entry.name);
    const relPath = toPosix(path.relative(rootDir, absPath));

    if (entry.isDirectory()) {
      if (matcher.isIgnored(relPath, true)) continue;
      await walkDir(rootDir, absPath, matcher, results);
    } else if (entry.isFile()) {
      if (!SCANNED_EXTENSIONS.includes(path.extname(entry.name))) continue;
      if (matcher.isIgnored(relPath, false)) continue;
      results.push({ absPath, relPath });
    }
  }
}
